'use client'

// =============================================================
// Funcionários (colaboradores) — cadastro pelo admin (mesmo fluxo dos
// usuários: sem e-mail, senha padrão soulan123 + troca no 1º acesso) e
// perfil do usuário logado (admin | funcionario | nenhum).
// =============================================================
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, sendPasswordResetEmail, signOut } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db, auth, firebaseConfig } from '../firebase'
import { minhaConta, registrarLog, obterUidParaCadastro, EMAIL_SEMENTE } from './usuarios'
import type { LinhaImport } from '../importarFuncionarios'

/** Campos de datas/matrícula que acompanham um funcionário. */
export interface DadosPessoais {
  matricula?: string | null
  aniv_dia?: number | null
  aniv_mes?: number | null
  adm_dia?: number | null
  adm_mes?: number | null
  adm_ano?: number | null
  aniversario?: string | null
  admissao?: string | null
}

/** Projeção PÚBLICA para o Mural (só nome + dia/mês; nada sensível). */
async function escreverAniversario(uid: string, nome: string, d: DadosPessoais) {
  await setDoc(
    doc(db(), 'aniversarios', uid),
    {
      nome,
      aniv_dia: d.aniv_dia ?? null,
      aniv_mes: d.aniv_mes ?? null,
      adm_dia: d.adm_dia ?? null,
      adm_mes: d.adm_mes ?? null,
      adm_ano: d.adm_ano ?? null,
      atualizado_em: new Date().toISOString(),
    },
    { merge: true },
  )
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export type PerfilTipo = 'admin' | 'funcionario' | 'nenhum'

const PAPEIS_VALIDOS = ['master', 'gestor', 'financeiro', 'colaborador'] as const

/** Normaliza o array de papéis vindo do banco (aceita só valores conhecidos). */
function limparPapeis(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((p): p is string => typeof p === 'string' && (PAPEIS_VALIDOS as readonly string[]).includes(p))
}

export interface Perfil {
  tipo: PerfilTipo
  uid: string
  email: string
  nome: string
  ativo: boolean
  senha_provisoria: boolean
  /** Papéis de acesso — uma pessoa pode ter vários (ex.: colaborador + financeiro). */
  papeis: string[]
  /** Centro de custo (área da Soulan) do usuário. */
  centro_custo: string
  /** Onde mora o documento (para trocar a senha inicial na coleção certa). */
  origem: 'admins' | 'funcionarios' | 'nenhum'
}

/**
 * Quem é o usuário logado.
 *  - Painel admin "de verdade": e-mail semente OU doc em /admins → tipo 'admin'.
 *  - Funcionário: doc em /funcionarios. Se acumular o papel 'master', também é
 *    tratado como 'admin' (Master = admin completo), mas o doc segue em
 *    /funcionarios (importante para a troca de senha inicial).
 */
export async function perfilAtual(): Promise<Perfil | null> {
  const u = auth().currentUser
  if (!u) return null
  const ehSeed = (u.email ?? '').toLowerCase() === EMAIL_SEMENTE

  // Painel admin: e-mail semente ou doc em /admins.
  const adminSnap = await getDoc(doc(db(), 'admins', u.uid)).catch(() => null)
  if (ehSeed || (adminSnap && adminSnap.exists())) {
    const d = (adminSnap && adminSnap.exists() ? adminSnap.data() : {}) as Record<string, unknown>
    const conta = await minhaConta().catch(() => null)
    const papeis = Array.from(new Set(['master', ...limparPapeis(d.papeis)]))
    return {
      tipo: 'admin',
      uid: u.uid,
      email: (d.email as string) ?? conta?.email ?? u.email ?? '',
      nome: (d.nome as string) ?? conta?.nome ?? '',
      ativo: conta?.ativo ?? true,
      senha_provisoria: conta?.senha_provisoria ?? false,
      papeis,
      centro_custo: (d.centro_custo as string) ?? '',
      origem: 'admins',
    }
  }

  // Funcionário (colaborador e/ou gestor/financeiro/master).
  const snap = await getDoc(doc(db(), 'funcionarios', u.uid)).catch(() => null)
  if (snap && snap.exists()) {
    const d = snap.data() as Record<string, unknown>
    // Todo funcionário é, no mínimo, colaborador.
    const papeis = Array.from(new Set(['colaborador', ...limparPapeis(d.papeis)]))
    return {
      // Papel "master" pela tela Funcionários = admin completo.
      tipo: papeis.includes('master') ? 'admin' : 'funcionario',
      uid: u.uid,
      email: (d.email as string) ?? u.email ?? '',
      nome: (d.nome as string) ?? '',
      ativo: d.ativo !== false,
      senha_provisoria: d.senha_provisoria === true,
      papeis,
      centro_custo: (d.centro_custo as string) ?? '',
      origem: 'funcionarios',
    }
  }

  return {
    tipo: 'nenhum', uid: u.uid, email: u.email ?? '', nome: '', ativo: false,
    senha_provisoria: false, papeis: [], centro_custo: '', origem: 'nenhum',
  }
}

export async function listarFuncionarios() {
  const snap = await getDocs(collection(db(), 'funcionarios'))
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }) as any)
    .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''))
}

export async function cadastrarFuncionario(p: {
  email: string
  nome: string
  centro_custo?: string
  papeis?: string[]
} & DadosPessoais) {
  const email = String(p.email ?? '').trim().toLowerCase()
  const nome = String(p.nome ?? '').trim()
  if (!EMAIL_RE.test(email)) throw new Error('Informe um e-mail válido.')
  if (nome.length < 2) throw new Error('Informe o nome da pessoa.')
  const centro_custo = String(p.centro_custo ?? '').trim()
  // "colaborador" é sempre incluído; os demais papéis são opcionais.
  const papeis = Array.from(new Set(['colaborador', ...limparPapeis(p.papeis)]))
  const extras = camposPessoais(p)

  let reaproveitada = false
  let uidCriado = ''
  const secApp = initializeApp(firebaseConfig as Record<string, string>, `func-${Date.now()}`)
  try {
    const secAuth = getAuth(secApp)
    const uid = await obterUidParaCadastro(secAuth, email, (v) => (reaproveitada = v))
    uidCriado = uid
    await signOut(secAuth).catch(() => {})
    const agora = new Date().toISOString()
    // merge: se já havia registro, não zera dados; senão, cria vinculado ao uid.
    await setDoc(
      doc(db(), 'funcionarios', uid),
      { email, nome, centro_custo, papeis, ...extras, ativo: true, senha_provisoria: true, criado_em: agora, criado_por: auth().currentUser?.email ?? null },
      { merge: true },
    )
  } finally {
    await deleteApp(secApp).catch(() => {})
  }
  if (uidCriado) await escreverAniversario(uidCriado, nome, extras)
  await registrarLog(reaproveitada ? 'vincular_funcionario' : 'cadastro_funcionario', email)
  return { ok: true, reaproveitada }
}

/** Só os campos de datas/matrícula, já normalizados (para gravar com merge). */
function camposPessoais(p: DadosPessoais): DadosPessoais {
  return {
    matricula: p.matricula ? String(p.matricula).trim() : null,
    aniv_dia: p.aniv_dia ?? null,
    aniv_mes: p.aniv_mes ?? null,
    adm_dia: p.adm_dia ?? null,
    adm_mes: p.adm_mes ?? null,
    adm_ano: p.adm_ano ?? null,
    aniversario: p.aniversario ?? null,
    admissao: p.admissao ?? null,
  }
}

/** Atualiza papéis, centro de custo e dados pessoais (datas/matrícula). */
export async function atualizarPapeisFuncionario(
  uid: string,
  papeis: string[],
  centro_custo: string,
  email?: string,
  extras?: DadosPessoais & { nome?: string },
) {
  const limpos = Array.from(new Set(['colaborador', ...limparPapeis(papeis)]))
  const campos = extras ? camposPessoais(extras) : {}
  await updateDoc(doc(db(), 'funcionarios', uid), {
    papeis: limpos,
    centro_custo: String(centro_custo ?? '').trim(),
    ...campos,
    ...(extras?.nome ? { nome: String(extras.nome).trim() } : {}),
  })
  if (extras) await escreverAniversario(uid, extras.nome ?? '', campos)
  await registrarLog('papeis_funcionario', `${email ?? uid}: ${limpos.join(', ')}${centro_custo ? ' @ ' + centro_custo : ''}`)
}

// -------------------------------------------------------------
// Importação por planilha (só Master — garantido pelas Regras)
// -------------------------------------------------------------
export async function importarFuncionarios(
  linhas: LinhaImport[],
): Promise<{ criados: number; atualizados: number; ignorados: number; falhas: number }> {
  const validas = linhas.filter((l) => l.acao !== 'ignorar')
  const existentes = await listarFuncionarios()
  const mapa = new Map<string, string>() // email -> uid
  for (const f of existentes) if (f.email) mapa.set(String(f.email).toLowerCase(), f.uid)

  let criados = 0, atualizados = 0, falhas = 0
  const secApp = initializeApp(firebaseConfig as Record<string, string>, `import-${Date.now()}`)
  try {
    const secAuth = getAuth(secApp)
    for (const l of validas) {
      try {
        const papeis = Array.from(new Set(['colaborador', ...limparPapeis(l.papeis)]))
        const dados = {
          email: l.email, nome: l.nome, centro_custo: l.centro_custo, papeis,
          ...camposPessoais(l),
        }
        let uid = mapa.get(l.email)
        if (uid) {
          await setDoc(doc(db(), 'funcionarios', uid), dados, { merge: true })
          atualizados++
        } else {
          uid = await obterUidParaCadastro(secAuth, l.email)
          const agora = new Date().toISOString()
          await setDoc(
            doc(db(), 'funcionarios', uid),
            { ...dados, ativo: true, senha_provisoria: true, criado_em: agora, criado_por: auth().currentUser?.email ?? null },
            { merge: true },
          )
          mapa.set(l.email, uid)
          criados++
        }
        await escreverAniversario(uid, l.nome, l)
      } catch {
        falhas++
      }
    }
    await signOut(secAuth).catch(() => {})
  } finally {
    await deleteApp(secApp).catch(() => {})
  }
  await registrarLog('importar_funcionarios', `${criados} novos, ${atualizados} atualizados, ${falhas} falhas`)
  return { criados, atualizados, ignorados: linhas.length - validas.length, falhas }
}

export async function definirAtivoFuncionario(uid: string, ativo: boolean, email?: string) {
  await updateDoc(doc(db(), 'funcionarios', uid), { ativo })
  await registrarLog(ativo ? 'ativar_funcionario' : 'inativar_funcionario', email ?? uid)
}

export async function excluirFuncionario(uid: string, email?: string) {
  await deleteDoc(doc(db(), 'funcionarios', uid))
  await registrarLog('excluir_funcionario', email ?? uid)
}

export async function reenviarSenhaFuncionario(email: string) {
  const e = String(email ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(e)) throw new Error('E-mail inválido.')
  await sendPasswordResetEmail(auth(), e)
  await registrarLog('redefinir_senha_funcionario', e)
}
