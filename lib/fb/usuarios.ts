'use client'

// =============================================================
// Gestão de usuários da administração + auditoria (logs).
//
// Sem servidor: o "convite" cria a conta no Firebase Auth (num app
// SECUNDÁRIO, para não deslogar o admin atual) e dispara o e-mail
// nativo de definição de senha. A pessoa define a senha e passa a
// entrar com e-mail + senha. Níveis e status (ativo) ficam em /admins;
// as Regras do Firestore é que impõem o acesso de verdade.
// =============================================================
import { initializeApp, deleteApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  signOut,
  type Auth,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
} from 'firebase/firestore'
import { db, auth, firebaseConfig } from '../firebase'
import {
  resolverPermissoes,
  perfilPadrao,
  type PerfilId,
  type Permissoes,
} from '../permissoes'

export const EMAIL_SEMENTE = 'gentecultura@soulan.com.br'
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Senha padrão do primeiro acesso: a pessoa é obrigada a trocar ao entrar. */
export const SENHA_PADRAO = 'soulan123'

export type Nivel = 'comum' | 'master' | 'super'

export const NIVEL_LABEL: Record<Nivel, string> = {
  comum: 'Comum',
  master: 'Master',
  super: 'Super Admin',
}

export const NIVEIS: { id: Nivel; nome: string; desc: string }[] = [
  { id: 'comum', nome: 'Comum', desc: 'Acessa os painéis. Não gerencia usuários.' },
  { id: 'master', nome: 'Master', desc: 'Gerencia usuários Comum e Master.' },
  { id: 'super', nome: 'Super Admin', desc: 'Gerencia todos, inclusive outros Super Admin.' },
]

export interface Conta {
  uid: string
  email: string
  nome: string
  nivel: Nivel | 'nenhum'
  ativo: boolean
  senha_provisoria: boolean
  /** Perfil nomeado (Colaborador, ADM, ADM Principal…). */
  perfil: PerfilId
  /** Permissões efetivas já resolvidas: { telaId: [ações] }. */
  permissoes: Permissoes
  /** Centro de custo (área), quando houver: usado nas telas por área. */
  centro_custo?: string
}

/** Lê o perfil salvo (se existir) ou deriva do modelo antigo (nivel/papéis). */
function perfilDe(d: Record<string, unknown>, nivel?: string | null): PerfilId {
  const salvo = d.perfil as PerfilId | undefined
  if (salvo) return salvo
  return perfilPadrao({ nivel, papeis: (d.papeis as string[]) ?? [] })
}

/**
 * Permissões efetivas de um usuário:
 *  - se ele JÁ foi configurado na tela de permissões (tem `permissoes` salvo),
 *    vale EXATAMENTE o que foi marcado (tela ausente = sem acesso);
 *  - senão, cai no padrão do perfil (compatibilidade com quem é anterior).
 */
function permissoesEfetivas(d: Record<string, unknown>, perfil: PerfilId): Permissoes {
  const salvas = d.permissoes as Permissoes | undefined
  if (salvas && typeof salvas === 'object') return resolverPermissoes(undefined, salvas)
  return resolverPermissoes(perfil)
}

/**
 * Conta do usuário logado para o PAINEL admin.
 *  - e-mail semente → Super Admin;
 *  - quem tem doc em /admins → o nível de lá;
 *  - funcionário com o PAPEL "master" → tratado como Master do painel
 *    (Master = admin completo, definido na tela Funcionários);
 *  - qualquer outro → "nenhum" (não entra no painel).
 */
export async function minhaConta(): Promise<Conta | null> {
  const u = auth().currentUser
  if (!u) return null
  if ((u.email ?? '').toLowerCase() === EMAIL_SEMENTE) {
    return {
      uid: u.uid, email: u.email!, nome: 'Administração', nivel: 'super', ativo: true, senha_provisoria: false,
      perfil: 'adm_principal', permissoes: resolverPermissoes('adm_principal'),
    }
  }
  const snap = await getDoc(doc(db(), 'admins', u.uid))
  if (snap.exists()) {
    const d = snap.data() as Record<string, unknown>
    const nivel = (d.nivel as Nivel) ?? 'comum'
    const perfil = perfilDe(d, nivel)
    return {
      uid: u.uid,
      email: (d.email as string) ?? u.email ?? '',
      nome: (d.nome as string) ?? '',
      nivel,
      ativo: d.ativo !== false,
      senha_provisoria: d.senha_provisoria === true,
      perfil,
      permissoes: permissoesEfetivas(d, perfil),
      centro_custo: (d.centro_custo as string) ?? '',
    }
  }
  // Sem doc em /admins: um funcionário com papel "master" também é Master.
  const fSnap = await getDoc(doc(db(), 'funcionarios', u.uid)).catch(() => null)
  if (fSnap && fSnap.exists()) {
    const d = fSnap.data() as Record<string, unknown>
    const papeis = Array.isArray(d.papeis) ? (d.papeis as string[]) : []
    if (d.ativo !== false && papeis.includes('master')) {
      const perfil = perfilDe(d, 'master')
      return {
        uid: u.uid,
        email: (d.email as string) ?? u.email ?? '',
        nome: (d.nome as string) ?? '',
        nivel: 'master',
        ativo: true,
        senha_provisoria: d.senha_provisoria === true,
        perfil,
        permissoes: permissoesEfetivas(d, perfil),
        centro_custo: (d.centro_custo as string) ?? '',
      }
    }
    // Funcionário com papel "administrador": entra no painel com acesso LIMITADO
    // (edita/adiciona conteúdo). Nível "comum" (não é Super nem Master).
    if (d.ativo !== false && papeis.includes('administrador')) {
      const perfil = perfilDe(d, null)
      return {
        uid: u.uid,
        email: (d.email as string) ?? u.email ?? '',
        nome: (d.nome as string) ?? '',
        nivel: 'comum',
        ativo: true,
        senha_provisoria: d.senha_provisoria === true,
        perfil,
        permissoes: permissoesEfetivas(d, perfil),
        centro_custo: (d.centro_custo as string) ?? '',
      }
    }
  }
  return {
    uid: u.uid, email: u.email ?? '', nome: '', nivel: 'nenhum', ativo: false, senha_provisoria: false,
    perfil: 'colaborador', permissoes: {},
  }
}

export function ehGerente(c: Conta | null): boolean {
  return !!c && c.ativo && (c.nivel === 'super' || c.nivel === 'master')
}

// -------------------------------------------------------------
// Auditoria de logs
// -------------------------------------------------------------
export async function registrarLog(acao: string, detalhe?: string): Promise<void> {
  const u = auth().currentUser
  if (!u) return
  try {
    await addDoc(collection(db(), 'logs'), {
      uid: u.uid,
      email: u.email ?? null,
      acao,
      detalhe: detalhe ?? null,
      em: new Date().toISOString(),
    })
  } catch {
    // log é best-effort: nunca deve quebrar o fluxo
  }
}

export async function listarLogs(qtd = 800) {
  const snap = await getDocs(collection(db(), 'logs'))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as any)
    .sort((a, b) => (b.em ?? '').localeCompare(a.em ?? ''))
    .slice(0, qtd)
}

// -------------------------------------------------------------
// Usuários
// -------------------------------------------------------------
export async function listarUsuarios() {
  const snap = await getDocs(collection(db(), 'admins'))
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }) as any)
    .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''))
}

/**
 * Cadastra um usuário SEM enviar e-mail: cria a conta no Auth (app secundário,
 * sem deslogar o admin) com a senha padrão `soulan123` e marca como provisória.
 * A pessoa entra com e-mail + senha padrão e é obrigada a trocar no 1º acesso.
 */
/**
 * Obtém o UID de login para o cadastro, num app SECUNDÁRIO:
 *  - cria a conta com a senha padrão; OU
 *  - se o e-mail já existe no Auth, REAPROVEITA a conta entrando com a senha
 *    padrão (caso comum de conta "órfã" de um cadastro que falhou).
 *  Se a conta existe com uma senha PRÓPRIA (diferente da padrão), não há como
 *  obter o UID pelo cliente: orienta a excluir no Console e cadastrar de novo.
 */
export async function obterUidParaCadastro(
  secAuth: Auth,
  email: string,
  marcar?: (reaproveitada: boolean) => void,
): Promise<string> {
  try {
    const cred = await createUserWithEmailAndPassword(secAuth, email, SENHA_PADRAO)
    marcar?.(false)
    return cred.user.uid
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    if (code === 'auth/email-already-in-use') {
      try {
        const cred = await signInWithEmailAndPassword(secAuth, email, SENHA_PADRAO)
        marcar?.(true)
        return cred.user.uid
      } catch {
        throw new Error(
          'Este e-mail já tem uma conta com senha própria (diferente da padrão). ' +
            'Para recuperá-lo: exclua a conta em Firebase Console → Authentication e cadastre de novo (ele volta com a senha padrão).',
        )
      }
    }
    if (code === 'auth/invalid-email') throw new Error('E-mail inválido.')
    if (code === 'auth/operation-not-allowed') throw new Error('Ative o provedor E-mail/Senha no Firebase Authentication.')
    throw new Error('Não consegui criar a conta desse e-mail.')
  }
}

export async function cadastrarUsuario(p: { email: string; nome: string; nivel: Nivel }) {
  const email = String(p.email ?? '').trim().toLowerCase()
  const nome = String(p.nome ?? '').trim()
  if (!EMAIL_RE.test(email)) throw new Error('Informe um e-mail válido.')
  if (nome.length < 2) throw new Error('Informe o nome da pessoa.')
  if (!['comum', 'master', 'super'].includes(p.nivel)) throw new Error('Nível de acesso inválido.')

  let reaproveitada = false
  const secApp = initializeApp(firebaseConfig as Record<string, string>, `cadastro-${Date.now()}`)
  try {
    const secAuth = getAuth(secApp)
    const uid = await obterUidParaCadastro(secAuth, email, (v) => (reaproveitada = v))
    await signOut(secAuth).catch(() => {})

    const agora = new Date().toISOString()
    await setDoc(
      doc(db(), 'admins', uid),
      { email, nome, nivel: p.nivel, ativo: true, senha_provisoria: true, criado_em: agora, criado_por: auth().currentUser?.email ?? null },
      { merge: true },
    )
  } finally {
    await deleteApp(secApp).catch(() => {})
  }

  await registrarLog(reaproveitada ? 'vincular_usuario' : 'cadastro', email)
  return { ok: true, reaproveitada }
}

/**
 * Primeiro acesso: a pessoa (recém-logada com a senha padrão) define a nova
 * senha. Como o login é recente, `updatePassword` funciona sem reautenticar.
 */
export async function definirNovaSenhaInicial(nova: string, colecao: 'admins' | 'funcionarios' = 'admins') {
  const u = auth().currentUser
  if (!u) throw new Error('Sua sessão expirou. Entre novamente.')
  const s = String(nova ?? '')
  if (s.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.')
  const fraca = ['soulan123', 'soulan', 'senha', 'password', '123456', 'qwerty']
  if (fraca.some((f) => s.toLowerCase().includes(f))) {
    throw new Error('Escolha uma senha diferente da padrão e sem sequências óbvias.')
  }
  try {
    await updatePassword(u, s)
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    if (code === 'auth/requires-recent-login') throw new Error('Por segurança, entre de novo e troque a senha em seguida.')
    if (code === 'auth/weak-password') throw new Error('Senha fraca demais. Use pelo menos 8 caracteres.')
    throw new Error('Não consegui trocar a senha agora.')
  }
  await updateDoc(doc(db(), colecao, u.uid), { senha_provisoria: false }).catch(() => {})
  await registrarLog('primeira_senha')
  return { ok: true }
}

/** Reenvia o e-mail de definição/redefinição de senha. */
export async function reenviarSenha(email: string) {
  const e = String(email ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(e)) throw new Error('E-mail inválido.')
  await sendPasswordResetEmail(auth(), e)
  await registrarLog('redefinir_senha', e)
  return { ok: true }
}

export async function definirAtivo(uid: string, ativo: boolean, email?: string) {
  await updateDoc(doc(db(), 'admins', uid), { ativo })
  await registrarLog(ativo ? 'ativar_usuario' : 'inativar_usuario', email ?? uid)
}

export async function alterarNivel(uid: string, nivel: Nivel, email?: string) {
  await updateDoc(doc(db(), 'admins', uid), { nivel })
  await registrarLog('alterar_nivel', `${email ?? uid} → ${nivel}`)
}

export async function excluirUsuario(uid: string, email?: string) {
  await deleteDoc(doc(db(), 'admins', uid))
  await registrarLog('excluir_usuario', email ?? uid)
}

/**
 * Salva as permissões (mapa { telaId: [ações] } já marcado) e a área de
 * atuação (centro de custo) de um usuário administrador. Só o Super chega aqui
 * (a tela é restrita), e as Regras do Firestore só deixam o Super gravar /admins.
 */
export async function salvarPermissoes(
  uid: string,
  permissoes: Permissoes,
  centro_custo?: string,
  email?: string,
) {
  const dados: Record<string, unknown> = { permissoes }
  if (centro_custo !== undefined) dados.centro_custo = String(centro_custo ?? '').trim()
  await updateDoc(doc(db(), 'admins', uid), dados)
  await registrarLog('permissoes', email ?? uid)
}
