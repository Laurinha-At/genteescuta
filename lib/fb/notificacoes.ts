'use client'

// =============================================================
// Notificações do portal (sino/aviso) — SEM e-mail por enquanto.
//
// O site é estático, então as notificações são documentos no Firestore
// que cada pessoa lê conforme o seu papel. Para não exigir índices
// compostos, o destinatário é codificado num ÚNICO campo `alvo`:
//   u:<uid>     → uma pessoa (o colaborador que fez o pedido)
//   g:<centro>  → o gestor daquele centro de custo
//   f           → o financeiro
//   m           → o master
// As Regras do Firestore usam esse campo para liberar a leitura.
//
// O "lido" é por dispositivo (localStorage: última visita), então os
// documentos são só de leitura/criação. Deixe preparado para ligar
// e-mail no futuro (os campos legíveis já vão no documento).
// =============================================================
import { collection, addDoc, getDocs, query, where, type QueryConstraint } from 'firebase/firestore'
import { db, auth } from '../firebase'
import type { Perfil } from './funcionarios'
import { TODOS_CENTROS } from '../reembolso'
import { getPostsMural } from './publico'
import { listarTrilhas } from './treinos'

export type NotifTipo =
  | 'reembolso_novo'
  | 'reembolso_aprovado'
  | 'reembolso_recusado'
  | 'reembolso_pago'
  | 'reembolso_agendado'

export interface Notificacao {
  id: string
  alvo: string          // u:<uid> | g:<centro> | f | m
  tipo: NotifTipo
  titulo: string
  texto: string
  link: string
  reembolso_id: string
  de_nome: string
  criado_em: string
}

type NovaNotif = Omit<Notificacao, 'id' | 'criado_em'>

/** Cria a notificação. Nunca deixa quebrar a ação principal (best-effort). */
async function criar(n: NovaNotif): Promise<void> {
  try {
    await addDoc(collection(db(), 'notificacoes'), { ...n, criado_em: new Date().toISOString() })
  } catch {
    /* silencioso: uma notificação que falha não pode impedir o reembolso */
  }
}

// -------------------------------------------------------------
// Gatilhos do fluxo de Reembolso
// -------------------------------------------------------------
/** Ao ENVIAR: avisa o Gestor da área (ou o Master, se já vai a ele) e o Financeiro. */
export async function avisarNovaSolicitacao(p: {
  reembolsoId: string; status: string; centro: string; solicitante: string; resumo: string
}): Promise<void> {
  const comum = {
    tipo: 'reembolso_novo' as NotifTipo,
    titulo: 'Nova solicitação de reembolso',
    texto: `${p.solicitante} enviou um reembolso (${p.resumo}).`,
    link: '/reembolso',
    reembolso_id: p.reembolsoId,
    de_nome: p.solicitante,
  }
  const alvos: string[] = []
  if (p.status === 'pendente_master') alvos.push('m')
  else alvos.push(`g:${p.centro}`)
  alvos.push('f') // o Financeiro sempre fica ciente do novo pedido
  await Promise.all(alvos.map((alvo) => criar({ alvo, ...comum })))
}

/** Ao APROVAR/RECUSAR: avisa o colaborador que fez o pedido. */
export async function avisarDecisao(p: {
  solicitanteUid: string; aprovado: boolean; reembolsoId: string; porNome: string; motivo?: string
}): Promise<void> {
  await criar({
    alvo: `u:${p.solicitanteUid}`,
    tipo: p.aprovado ? 'reembolso_aprovado' : 'reembolso_recusado',
    titulo: p.aprovado ? 'Reembolso aprovado' : 'Reembolso recusado',
    texto: p.aprovado
      ? `${p.porNome} aprovou o seu reembolso. Ele seguiu para o Financeiro.`
      : `${p.porNome} recusou o seu reembolso${p.motivo ? `: ${p.motivo}` : '.'}`,
    link: '/reembolso',
    reembolso_id: p.reembolsoId,
    de_nome: p.porNome,
  })
}

/** Ao REGISTRAR PAGAMENTO: avisa o colaborador. */
export async function avisarPagamento(p: {
  solicitanteUid: string; reembolsoId: string; porNome: string; agendado: boolean; data: string
}): Promise<void> {
  await criar({
    alvo: `u:${p.solicitanteUid}`,
    tipo: p.agendado ? 'reembolso_agendado' : 'reembolso_pago',
    titulo: p.agendado ? 'Pagamento agendado' : 'Reembolso pago',
    texto: p.agendado
      ? `${p.porNome} agendou o pagamento do seu reembolso para ${formatarData(p.data)}.`
      : `${p.porNome} registrou o pagamento do seu reembolso.`,
    link: '/reembolso',
    reembolso_id: p.reembolsoId,
    de_nome: p.porNome,
  })
}

function formatarData(iso: string): string {
  const p = String(iso).slice(0, 10).split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso
}

// -------------------------------------------------------------
// Leitura (para o sino) — junta as notificações por uid e por papel.
// Cada consulta usa UM campo (sem índices compostos); ordena no cliente.
// -------------------------------------------------------------
export async function listarNotificacoes(perfil: Perfil): Promise<Notificacao[]> {
  const u = auth().currentUser
  if (!u) return []
  const col = collection(db(), 'notificacoes')

  async function rodar(constraints: QueryConstraint[]): Promise<Notificacao[]> {
    try {
      const snap = await getDocs(query(col, ...constraints))
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Notificacao)
    } catch {
      return []
    }
  }

  const consultas: Promise<Notificacao[]>[] = [rodar([where('alvo', '==', `u:${u.uid}`)])]

  const papeis = perfil.papeis ?? []
  const ehMaster = perfil.tipo === 'admin' || papeis.includes('master')
  if (papeis.includes('financeiro')) consultas.push(rodar([where('alvo', '==', 'f')]))
  if (ehMaster) consultas.push(rodar([where('alvo', '==', 'm')]))
  if (papeis.includes('gestor')) {
    if ((perfil.centro_custo || '') === TODOS_CENTROS) {
      consultas.push(rodar([where('alvo', '>=', 'g:'), where('alvo', '<=', 'g:\uf8ff')]))
    } else if (perfil.centro_custo) {
      consultas.push(rodar([where('alvo', '==', `g:${perfil.centro_custo}`)]))
    }
  }

  const listas = await Promise.all(consultas)
  const mapa = new Map<string, Notificacao>()
  for (const l of listas) for (const n of l) mapa.set(n.id, n)
  return Array.from(mapa.values())
    .sort((a, b) => (b.criado_em ?? '').localeCompare(a.criado_em ?? ''))
    .slice(0, 30)
}

// -------------------------------------------------------------
// "Lido" por dispositivo (localStorage) — sem gravar no banco.
// -------------------------------------------------------------
const CHAVE_VISTO = 'gc_notif_visto'

export function ultimaVisita(): string {
  try { return localStorage.getItem(CHAVE_VISTO) ?? '' } catch { return '' }
}
export function marcarTudoVisto(): void {
  try { localStorage.setItem(CHAVE_VISTO, new Date().toISOString()) } catch { /* ignore */ }
}
export function contarNaoLidas(itens: { criado_em?: string }[]): number {
  const visto = ultimaVisita()
  return itens.filter((n) => (n.criado_em ?? '') > visto).length
}

// =============================================================
// Central de avisos do sino: junta os reembolsos com Mural e Trilhas.
// Mural e Trilhas são derivados (sem gravar notificação): entram como
// "novos" pela data, comparada à última visita (por dispositivo). Ambos
// são visíveis a qualquer pessoa logada, então respeitam a permissão.
// =============================================================
export type AvisoTipo = NotifTipo | 'mural_post' | 'treino_trilha'
export interface Aviso {
  id: string
  tipo: AvisoTipo
  titulo: string
  texto: string
  link: string
  criado_em: string
}

export async function listarAvisos(perfil: Perfil): Promise<Aviso[]> {
  const [reemb, posts, trilhasRes] = await Promise.all([
    listarNotificacoes(perfil).catch(() => [] as Notificacao[]),
    getPostsMural().catch(() => [] as Record<string, unknown>[]),
    listarTrilhas().catch(() => ({ trilhas: [] as Record<string, unknown>[], doFirestore: false })),
  ])
  const out: Aviso[] = []
  for (const n of reemb) {
    out.push({ id: n.id, tipo: n.tipo, titulo: n.titulo, texto: n.texto, link: n.link, criado_em: n.criado_em })
  }
  for (const p of (posts as Record<string, unknown>[]).slice(0, 15)) {
    const quando = String(p.criado_em || p.data || '')
    out.push({
      id: `post:${p.id}`,
      tipo: 'mural_post',
      titulo: 'Nova publicação no Mural',
      texto: String(p.titulo || 'Confira a novidade no Mural.'),
      link: `/mural#post-${p.id}`,
      criado_em: quando,
    })
  }
  for (const t of (trilhasRes.trilhas as Record<string, unknown>[])) {
    if (!t.criado_em) continue // só as criadas a partir de agora entram como "novas"
    out.push({
      id: `trilha:${t.id}`,
      tipo: 'treino_trilha',
      titulo: 'Nova trilha disponível',
      texto: String(t.title || 'Confira a nova trilha.'),
      link: `/treinamento#trilha-${t.id}`,
      criado_em: String(t.criado_em),
    })
  }
  return out.sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || '')).slice(0, 30)
}
