'use client'

// =============================================================
// Login do admin — Firebase Authentication (e-mail/senha).
// Substitui o scrypt + tabela de sessões da versão anterior.
// Quem é admin: o e-mail semente da Soulan ou um UID em /admins
// (a checagem de verdade acontece nas Regras do Firestore).
// =============================================================
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User,
} from 'firebase/auth'
import { auth } from '../firebase'
import { registrarLog } from './usuarios'

export type { User }

const EMAIL_ADMIN_SEMENTE = 'gentecultura@soulan.com.br'

export interface ResultadoLogin {
  ok: boolean
  erro?: string
}

export async function entrar(email: string, senha: string): Promise<ResultadoLogin> {
  try {
    await signInWithEmailAndPassword(auth(), email.trim().toLowerCase(), senha)
    await registrarLog('login')
    return { ok: true }
  } catch (e: unknown) {
    const codigo = (e as { code?: string })?.code ?? ''
    if (
      codigo === 'auth/invalid-credential' ||
      codigo === 'auth/wrong-password' ||
      codigo === 'auth/user-not-found' ||
      codigo === 'auth/invalid-email'
    ) {
      return { ok: false, erro: 'E-mail ou senha incorretos.' }
    }
    if (codigo === 'auth/too-many-requests') {
      return { ok: false, erro: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }
    }
    return { ok: false, erro: 'Não consegui entrar agora. Tente novamente.' }
  }
}

export async function sair(): Promise<void> {
  await signOut(auth())
}

/** Observa o estado do login. Retorna a função para cancelar a observação. */
export function observarLogin(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth(), cb)
}

export function usuarioAtual(): User | null {
  return auth().currentUser
}

/** É o e-mail semente da Soulan? (o admin garantido) */
export function ehAdminSemente(user: User | null): boolean {
  return !!user && (user.email ?? '').toLowerCase() === EMAIL_ADMIN_SEMENTE
}

/** Troca a própria senha (pede a atual para reautenticar). */
export async function trocarSenha(
  senhaAtual: string,
  senhaNova: string,
): Promise<ResultadoLogin> {
  const user = auth().currentUser
  if (!user || !user.email) return { ok: false, erro: 'Sua sessão expirou. Entre novamente.' }

  if (senhaNova.length < 10) return { ok: false, erro: 'A nova senha precisa ter pelo menos 10 caracteres.' }
  const fraca = ['soulan', 'senha', 'password', '123456', 'qwerty', 'gentecultura']
  if (fraca.some((f) => senhaNova.toLowerCase().includes(f))) {
    return { ok: false, erro: 'Escolha uma senha sem o nome da empresa nem sequências óbvias.' }
  }

  try {
    const cred = EmailAuthProvider.credential(user.email, senhaAtual)
    await reauthenticateWithCredential(user, cred)
    await updatePassword(user, senhaNova)
    return { ok: true }
  } catch (e: unknown) {
    const codigo = (e as { code?: string })?.code ?? ''
    if (codigo === 'auth/invalid-credential' || codigo === 'auth/wrong-password') {
      return { ok: false, erro: 'A senha atual está incorreta.' }
    }
    return { ok: false, erro: 'Não consegui trocar a senha agora.' }
  }
}
