'use client'

// =============================================================
// Banco de Horas — Firestore.
//
// Um documento por (mês, matrícula) em `banco_horas/{mes__matricula}`:
// id determinístico → reprocessar o mesmo mês não duplica. Cada registro
// guarda o uid do funcionário (casado pela Matrícula) e o centro de custo,
// que as Regras usam para o filtro por área e o "só o próprio saldo".
// =============================================================
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore'
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
}

function slug(s: string): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sem-matricula'
}

function mapear(d: any): RegistroBH {
  return { id: d.id, ...(d.data ? d.data() : d) } as RegistroBH
}

/** Importa (ou atualiza) o mês. Só o Master consegue (Regras). */
export async function importarBancoHoras(
  mesRef: string,
  linhas: LinhaBH[],
): Promise<{ gravados: number; semMatricula: number; semFuncionario: number }> {
  const funcs = await listarFuncionarios()
  const porMatricula = new Map<string, { uid: string; centro: string }>()
  for (const f of funcs) {
    const m = String((f as any).matricula ?? '').trim()
    if (m) porMatricula.set(m.toLowerCase(), { uid: f.uid, centro: String((f as any).centro_custo ?? '') })
  }

  let gravados = 0, semMatricula = 0, semFuncionario = 0
  for (const l of linhas) {
    if (!l.matricula) { semMatricula++; continue }
    const casado = porMatricula.get(l.matricula.toLowerCase())
    if (!casado) semFuncionario++
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
  // rótulo? Não — comparamos por chave normalizada por garantia.
  if (perfil.papeis.includes('gestor') && !master && !gestorTodos) {
    lista = lista.filter((r) => mesmoCentro(r.centro_custo, perfil.centro_custo))
  }
  return lista.sort((a, b) => (a.funcionario ?? '').localeCompare(b.funcionario ?? ''))
}

/** Saldo do próprio usuário logado no mês pedido (colaborador). */
export async function meuSaldo(mesRef: string): Promise<RegistroBH | null> {
  const u = auth().currentUser
  if (!u) return null
  const snap = await getDocs(query(collection(db(), 'banco_horas'), where('uid', '==', u.uid))).catch(() => null)
  if (!snap) return null
  const doMes = snap.docs.map(mapear).find((r) => r.mes_ref === mesRef)
  return doMes ?? null
}
