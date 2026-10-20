'use client'

// =============================================================
// Banco de Horas: Firestore.
//
// Um documento por (mês, matrícula) em `banco_horas/{mes__matricula}`:
// id determinístico → reprocessar o mesmo mês não duplica. Cada registro
// guarda o uid do funcionário (casado pela Matrícula) e o centro de custo,
// que as Regras usam para o filtro por área e o "só o próprio saldo".
// =============================================================
import { collection, doc, getDoc, setDoc, updateDoc, getDocs, query, where } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { registrarLog } from './usuarios'
import { listarFuncionarios, type Perfil } from './funcionarios'
import { centroAbrangeTudo, mesmoCentro } from '../reembolso'
import type { LinhaBH } from '../bancoHoras'

export interface RegistroBH {
  id: string
  mes_ref: string
  matricula: string
  funcionario: string
  empresa: string
  cargo: string
  centro_custo: string
  falta: string
  saldo_texto: string
  saldo_min: number | null
  uid: string | null
  atualizado_em?: string
}

function slug(s: string): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sem-matricula'
}

function mapear(d: any): RegistroBH {
  return { id: d.id, ...(d.data ? d.data() : d) } as RegistroBH
}

/**
 * Chave de matrícula: a matrícula é a CHAVE ÚNICA da pessoa, então comparamos
 * de forma EXATA (só tira espaços e caixa). Não removemos zeros à esquerda:
 * "123" e "0123" são matrículas diferentes, e colapsá-las já fez duas pessoas
 * compartilharem o mesmo vínculo. Comparar exato evita misturar gente distinta.
 */
function chaveMatricula(m: unknown): string {
  return String(m ?? '').trim().toLowerCase()
}

/**
 * Matrícula "de verdade": não vazia e não um placeholder só de zeros
 * ("0", "00", "000"...), que o RH às vezes usa para "sem matrícula". Quem não
 * tem matrícula válida não pode ser vinculado a saldo nenhum.
 */
function matriculaValida(m: unknown): boolean {
  const s = chaveMatricula(m)
  return s !== '' && !/^0+$/.test(s)
}

/**
 * Índice matrícula válida → funcionário. Matrículas repetidas (dois cadastros
 * com a mesma) viram AMBÍGUAS e não vinculam ninguém, para não carimbar o saldo
 * de um na conta do outro.
 */
function indiceFuncionariosPorMatricula(funcs: any[]): Map<string, { uid: string; centro: string } | null> {
  const idx = new Map<string, { uid: string; centro: string } | null>()
  for (const f of funcs) {
    if (!matriculaValida((f as any).matricula)) continue
    const k = chaveMatricula((f as any).matricula)
    if (idx.has(k)) idx.set(k, null) // colisão: mais de um funcionário com a mesma matrícula
    else idx.set(k, { uid: f.uid, centro: String((f as any).centro_custo ?? '') })
  }
  return idx
}

/** Importa (ou atualiza) o mês. Só o Master consegue (Regras). */
export async function importarBancoHoras(
  mesRef: string,
  linhas: LinhaBH[],
): Promise<{ gravados: number; semMatricula: number; semFuncionario: number }> {
  const funcs = await listarFuncionarios()
  const porMatricula = indiceFuncionariosPorMatricula(funcs)

  let gravados = 0, semMatricula = 0, semFuncionario = 0
  for (const l of linhas) {
    // Sem matrícula válida: não grava (não dá para saber de quem é o saldo).
    if (!matriculaValida(l.matricula)) { semMatricula++; continue }
    const casado = porMatricula.get(chaveMatricula(l.matricula)) ?? null
    if (!casado) semFuncionario++ // ninguém com essa matrícula, ou matrícula ambígua
    const centro_custo = l.centro_custo || casado?.centro || ''
    const id = `${mesRef}__${slug(l.matricula)}`
    await setDoc(doc(db(), 'banco_horas', id), {
      mes_ref: mesRef,
      matricula: l.matricula,
      funcionario: l.funcionario,
      empresa: l.empresa,
      cargo: l.cargo,
      centro_custo,
      falta: l.falta,
      saldo_texto: l.saldo_texto,
      saldo_min: l.saldo_min,
      uid: casado?.uid ?? null,
      atualizado_em: new Date().toISOString(),
    }, { merge: true })
    gravados++
  }
  await registrarLog('banco_horas_import', `${mesRef}: ${gravados} linha(s)`)
  return { gravados, semMatricula, semFuncionario }
}

/**
 * Revincula os saldos existentes às pessoas pela MATRÍCULA, sem reenviar a
 * planilha. Serve para quando a matrícula foi cadastrada DEPOIS da importação:
 * os registros ficaram sem uid e o colaborador não via o saldo. Só Master.
 */
export async function sincronizarVinculos(): Promise<{ atualizados: number; total: number; semVinculo: number }> {
  const [snap, funcs] = await Promise.all([
    getDocs(collection(db(), 'banco_horas')),
    listarFuncionarios(),
  ])
  const porMatricula = indiceFuncionariosPorMatricula(funcs)

  let atualizados = 0, semVinculo = 0
  for (const d of snap.docs) {
    const r = d.data() as any
    // uid correto para esta matrícula: null quando não há matrícula válida,
    // ninguém com ela, ou matrícula ambígua (dois cadastros com a mesma).
    const casado = matriculaValida(r.matricula) ? (porMatricula.get(chaveMatricula(r.matricula)) ?? null) : null
    const uidCerto = casado?.uid ?? null
    if (!uidCerto) semVinculo++
    if ((r.uid ?? null) !== uidCerto) {
      // Recarimba o vínculo certo OU limpa um uid herdado por engano (bug antigo
      // de colisão de matrícula), para ninguém ver o saldo de outra pessoa.
      await updateDoc(doc(db(), 'banco_horas', d.id), {
        uid: uidCerto,
        centro_custo: r.centro_custo || casado?.centro || '',
        atualizado_em: new Date().toISOString(),
      })
      atualizados++
    }
  }
  await registrarLog('banco_horas_revincular', `${atualizados} vínculo(s) atualizados`)
  return { atualizados, total: snap.docs.length, semVinculo }
}

/**
 * Registros que o perfil PODE ver:
 *  - master: todos;
 *  - gestor: só o próprio centro (ou todos, se "Todos os centros");
 *  - demais: nada por aqui (colaborador usa meuSaldo).
 */
export async function listarBancoHoras(perfil: Perfil, mesRef?: string): Promise<RegistroBH[]> {
  const master = perfil.papeis.includes('master')
  const gestorTodos = perfil.papeis.includes('gestor') && centroAbrangeTudo(perfil.centro_custo)
  let snap
  if (master || gestorTodos) {
    snap = await getDocs(collection(db(), 'banco_horas'))
  } else if (perfil.papeis.includes('gestor') && perfil.centro_custo) {
    snap = await getDocs(query(collection(db(), 'banco_horas'), where('centro_custo', '==', perfil.centro_custo)))
  } else {
    return []
  }
  let lista = snap.docs.map(mapear)
  if (mesRef) lista = lista.filter((r) => r.mes_ref === mesRef)
  // Gestor sem "Todos" ainda pode ter registros de outra área com o mesmo
  // rótulo? Não: comparamos por chave normalizada por garantia.
  if (perfil.papeis.includes('gestor') && !master && !gestorTodos) {
    lista = lista.filter((r) => mesmoCentro(r.centro_custo, perfil.centro_custo))
  }
  return lista.sort((a, b) => (a.funcionario ?? '').localeCompare(b.funcionario ?? ''))
}

/**
 * Resultado do saldo do próprio usuário. A matrícula é a chave única:
 *  - 'sem_matricula': a pessoa não tem matrícula vinculada, então NÃO mostramos
 *    banco de horas de ninguém (evita puxar o de outra pessoa de nome parecido);
 *  - 'sem_registro': tem matrícula, mas ainda não há saldo importado para ela;
 *  - 'ok': há saldo e ele é comprovadamente dela (matrícula do registro == a dela).
 */
export type MeuBanco =
  | { estado: 'sem_matricula' }
  | { estado: 'sem_registro' }
  | { estado: 'ok'; reg: RegistroBH }

/** Matrícula da pessoa logada (vinda do cadastro de funcionários). */
async function minhaMatricula(): Promise<string> {
  const u = auth().currentUser
  if (!u) return ''
  const snap = await getDoc(doc(db(), 'funcionarios', u.uid)).catch(() => null)
  const m = snap && snap.exists() ? (snap.data() as any).matricula : ''
  return String(m ?? '').trim()
}

/**
 * Lê os registros de banco de horas que são COMPROVADAMENTE da pessoa logada:
 * casados pela MATRÍCULA dela (nunca pelo nome). Sem matrícula válida → estado
 * 'sem_matricula', para o perfil não exibir o saldo de outra pessoa. Mesmo que
 * um registro traga o uid dela por engano (bug antigo), só passa se a matrícula
 * do registro for exatamente a dela.
 */
async function meusRegistros(): Promise<{ estado: 'sem_matricula' } | { estado: 'ok'; regs: RegistroBH[] }> {
  const u = auth().currentUser
  if (!u) return { estado: 'sem_matricula' }
  const matricula = await minhaMatricula()
  if (!matriculaValida(matricula)) return { estado: 'sem_matricula' }
  const mk = chaveMatricula(matricula)
  const snap = await getDocs(query(collection(db(), 'banco_horas'), where('uid', '==', u.uid))).catch(() => null)
  const regs = (snap?.docs.map(mapear) ?? []).filter((r) => matriculaValida(r.matricula) && chaveMatricula(r.matricula) === mk)
  return { estado: 'ok', regs }
}

/** Saldo do próprio usuário logado no mês pedido (colaborador). */
export async function meuSaldo(mesRef: string): Promise<MeuBanco> {
  const r = await meusRegistros()
  if (r.estado === 'sem_matricula') return { estado: 'sem_matricula' }
  const doMes = r.regs.find((x) => x.mes_ref === mesRef)
  return doMes ? { estado: 'ok', reg: doMes } : { estado: 'sem_registro' }
}

/**
 * Saldo ATUAL do próprio usuário: o registro da competência mais recente
 * disponível (independe do mês corrente já ter sido importado ou não).
 * Como `mes_ref` está no formato AAAA-MM, ordena lexicográfica = cronológica.
 */
export async function meuSaldoAtual(): Promise<MeuBanco> {
  const r = await meusRegistros()
  if (r.estado === 'sem_matricula') return { estado: 'sem_matricula' }
  if (r.regs.length === 0) return { estado: 'sem_registro' }
  const reg = r.regs.reduce((mais, x) => (x.mes_ref > mais.mes_ref ? x : mais))
  return { estado: 'ok', reg }
}
