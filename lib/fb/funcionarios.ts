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
import { minhaConta, registrarLog, obterUidParaCadastro } from './usuarios'

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
}

/** Quem é o usuário logado: admin, funcionário ou sem acesso. */
export async function perfilAtual(): Promise<Perfil | null> {
  const u = auth().currentUser
  if (!u) return null
  const conta = await minhaConta().catch(() => null)
  if (conta && conta.nivel !== 'nenhum') {
    // Admin do painel: Master/Super sempre têm o papel "master"; papéis e
    // centro de custo extras ficam no doc /admins (o e-mail semente não tem doc).
    const snap = await getDoc(doc(db(), 'admins', u.uid)).catch(() => null)
    const d = (snap && snap.exists() ? snap.data() : {}) as Record<string, unknown>
    const papeis = Array.from(new Set(['master', ...limparPapeis(d.papeis)]))
    return {
      tipo: 'admin',
      uid: u.uid,
      email: conta.email,
      nome: conta.nome,
      ativo: conta.ativo,
      senha_provisoria: conta.senha_provisoria,
      papeis,
      centro_custo: (d.centro_custo as string) ?? '',
    }
  }
  const snap = await getDoc(doc(db(), 'funcionarios', u.uid)).catch(() => null)
  if (snap && snap.exists()) {
    const d = snap.data() as Record<string, unknown>
    // Todo funcionário é, no mínimo, colaborador.
    const papeis = Array.from(new Set(['colaborador', ...limparPapeis(d.papeis)]))
    return {
      tipo: 'funcionario',
      uid: u.uid,
      email: (d.email as string) ?? u.email ?? '',
      nome: (d.nome as string) ?? '',
      ativo: d.ativo !== false,
      senha_provisoria: d.senha_provisoria === true,
      papeis,
      centro_custo: (d.centro_custo as string) ?? '',
    }
  }
  return {
    tipo: 'nenhum', uid: u.uid, email: u.email ?? '', nome: '', ativo: false,
    senha_provisoria: false, papeis: [], centro_custo: '',
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
}) {
  const email = String(p.email ?? '').trim().toLowerCase()
  const nome = String(p.nome ?? '').trim()
  if (!EMAIL_RE.test(email)) throw new Error('Informe um e-mail válido.')
  if (nome.length < 2) throw new Error('Informe o nome da pessoa.')
  const centro_custo = String(p.centro_custo ?? '').trim()
  // "colaborador" é sempre incluído; os demais papéis são opcionais.
  const papeis = Array.from(new Set(['colaborador', ...limparPapeis(p.papeis)]))

  let reaproveitada = false
  const secApp = initializeApp(firebaseConfig as Record<string, string>, `func-${Date.now()}`)
  try {
    const secAuth = getAuth(secApp)
    const uid = await obterUidParaCadastro(secAuth, email, (v) => (reaproveitada = v))
    await signOut(secAuth).catch(() => {})
    const agora = new Date().toISOString()
    // merge: se já havia registro, não zera dados; senão, cria vinculado ao uid.
    await setDoc(
      doc(db(), 'funcionarios', uid),
      { email, nome, centro_custo, papeis, ativo: true, senha_provisoria: true, criado_em: agora, criado_por: auth().currentUser?.email ?? null },
      { merge: true },
    )
  } finally {
    await deleteApp(secApp).catch(() => {})
  }
  await registrarLog(reaproveitada ? 'vincular_funcionario' : 'cadastro_funcionario', email)
  return { ok: true, reaproveitada }
}

/** Atualiza papéis de acesso e centro de custo de um funcionário. */
export async function atualizarPapeisFuncionario(
  uid: string,
  papeis: string[],
  centro_custo: string,
  email?: string,
) {
  const limpos = Array.from(new Set(['colaborador', ...limparPapeis(papeis)]))
  await updateDoc(doc(db(), 'funcionarios', uid), { papeis: limpos, centro_custo: String(centro_custo ?? '').trim() })
  await registrarLog('papeis_funcionario', `${email ?? uid}: ${limpos.join(', ')}${centro_custo ? ' @ ' + centro_custo : ''}`)
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
