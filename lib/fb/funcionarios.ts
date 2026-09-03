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

export interface Perfil {
  tipo: PerfilTipo
  uid: string
  email: string
  nome: string
  ativo: boolean
  senha_provisoria: boolean
}

/** Quem é o usuário logado: admin, funcionário ou sem acesso. */
export async function perfilAtual(): Promise<Perfil | null> {
  const u = auth().currentUser
  if (!u) return null
  const conta = await minhaConta().catch(() => null)
  if (conta && conta.nivel !== 'nenhum') {
    return {
      tipo: 'admin',
      uid: u.uid,
      email: conta.email,
      nome: conta.nome,
      ativo: conta.ativo,
      senha_provisoria: conta.senha_provisoria,
    }
  }
  const snap = await getDoc(doc(db(), 'funcionarios', u.uid)).catch(() => null)
  if (snap && snap.exists()) {
    const d = snap.data() as Record<string, unknown>
    return {
      tipo: 'funcionario',
      uid: u.uid,
      email: (d.email as string) ?? u.email ?? '',
      nome: (d.nome as string) ?? '',
      ativo: d.ativo !== false,
      senha_provisoria: d.senha_provisoria === true,
    }
  }
  return { tipo: 'nenhum', uid: u.uid, email: u.email ?? '', nome: '', ativo: false, senha_provisoria: false }
}

export async function listarFuncionarios() {
  const snap = await getDocs(collection(db(), 'funcionarios'))
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }) as any)
    .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''))
}

export async function cadastrarFuncionario(p: { email: string; nome: string }) {
  const email = String(p.email ?? '').trim().toLowerCase()
  const nome = String(p.nome ?? '').trim()
  if (!EMAIL_RE.test(email)) throw new Error('Informe um e-mail válido.')
  if (nome.length < 2) throw new Error('Informe o nome da pessoa.')

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
      { email, nome, ativo: true, senha_provisoria: true, criado_em: agora, criado_por: auth().currentUser?.email ?? null },
      { merge: true },
    )
  } finally {
    await deleteApp(secApp).catch(() => {})
  }
  await registrarLog(reaproveitada ? 'vincular_funcionario' : 'cadastro_funcionario', email)
  return { ok: true, reaproveitada }
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
