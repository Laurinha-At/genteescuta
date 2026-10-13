'use client'

// =============================================================
// Trilhas de Desenvolvimento gamificadas — Fase 1 (sem loja).
//  - trilhas_dev/{id}: título, descrição, capa, pontos, ordem, ativa.
//  - trilhas_dev/{id}/atividades/{aid}: ordem, tipo, título, enunciado,
//    imagem e configuração conforme o tipo.
//  - trilhas_dev_progresso/{uid}: progresso por trilha + pontos totais.
// Colaborador logado lê as trilhas; só conteúdo (admin/RH) edita.
// =============================================================
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { registrarLog } from './usuarios'

export type TipoAtividade = 'assinalar' | 'responder' | 'listar'

export const TIPO_LABEL: Record<TipoAtividade, string> = {
  assinalar: 'Assinalar (marcar a correta)',
  responder: 'Responder (texto aberto)',
  listar: 'Listar (preencher campos)',
}

export interface TrilhaDev {
  id: string
  titulo: string
  descricao: string
  capa: string
  pontos: number
  ordem: number
  ativa: boolean
}

export interface Atividade {
  id: string
  ordem: number
  tipo: TipoAtividade
  titulo: string
  enunciado: string
  imagem: string
  /** assinalar: opções e índices corretos. */
  opcoes: string[]
  corretas: number[]
  /** listar: rótulos dos campos a preencher. */
  campos: string[]
}

export interface ProgressoTrilha {
  concluidas: string[]
  concluida: boolean
  pontos: number
  respostas: Record<string, unknown>
}

export interface ProgressoUsuario {
  trilhas: Record<string, ProgressoTrilha>
  pontos_total: number
}

const COL = 'trilhas_dev'

// ---------------- Trilhas ----------------
function normTrilha(d: Record<string, unknown>, id: string): TrilhaDev {
  return {
    id,
    titulo: String(d.titulo ?? ''),
    descricao: String(d.descricao ?? ''),
    capa: String(d.capa ?? ''),
    pontos: typeof d.pontos === 'number' ? d.pontos : Number(d.pontos) || 0,
    ordem: typeof d.ordem === 'number' ? d.ordem : 0,
    ativa: d.ativa !== false,
  }
}

export async function listarTrilhasDev(): Promise<TrilhaDev[]> {
  const snap = await getDocs(collection(db(), COL)).catch(() => null)
  if (!snap) return []
  return snap.docs.map((d) => normTrilha(d.data() as Record<string, unknown>, d.id)).sort((a, b) => a.ordem - b.ordem)
}

export async function listarTrilhasDevAtivas(): Promise<TrilhaDev[]> {
  const snap = await getDocs(query(collection(db(), COL), where('ativa', '==', true))).catch(() => null)
  if (!snap) return []
  return snap.docs.map((d) => normTrilha(d.data() as Record<string, unknown>, d.id)).sort((a, b) => a.ordem - b.ordem)
}

export async function getTrilhaDev(id: string): Promise<TrilhaDev | null> {
  const snap = await getDoc(doc(db(), COL, id)).catch(() => null)
  if (!snap || !snap.exists()) return null
  return normTrilha(snap.data() as Record<string, unknown>, snap.id)
}

export async function salvarTrilhaDev(t: TrilhaDev): Promise<void> {
  await setDoc(doc(db(), COL, t.id), {
    titulo: String(t.titulo ?? '').trim(),
    descricao: String(t.descricao ?? '').trim(),
    capa: String(t.capa ?? '').trim(),
    pontos: Math.max(0, Math.round(Number(t.pontos) || 0)),
    ordem: t.ordem,
    ativa: !!t.ativa,
  })
  await registrarLog('trilha_dev_salvar', t.titulo)
}

export async function excluirTrilhaDev(id: string): Promise<void> {
  // Remove as atividades da subcoleção antes da trilha.
  const subs = await getDocs(collection(db(), COL, id, 'atividades')).catch(() => null)
  if (subs) await Promise.all(subs.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db(), COL, id))
}

export function novoIdTrilha(): string {
  return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
export function trilhaDevVazia(ordem: number): TrilhaDev {
  return { id: novoIdTrilha(), titulo: '', descricao: '', capa: '', pontos: 10, ordem, ativa: true }
}

// ---------------- Atividades ----------------
function normAtividade(d: Record<string, unknown>, id: string): Atividade {
  const tipo = d.tipo === 'responder' || d.tipo === 'listar' ? d.tipo : 'assinalar'
  const strArr = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)) : [])
  const numArr = (v: unknown) => (Array.isArray(v) ? v.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [])
  return {
    id,
    ordem: typeof d.ordem === 'number' ? d.ordem : 0,
    tipo,
    titulo: String(d.titulo ?? ''),
    enunciado: String(d.enunciado ?? ''),
    imagem: String(d.imagem ?? ''),
    opcoes: strArr(d.opcoes),
    corretas: numArr(d.corretas),
    campos: strArr(d.campos),
  }
}

export async function listarAtividades(trilhaId: string): Promise<Atividade[]> {
  const snap = await getDocs(collection(db(), COL, trilhaId, 'atividades')).catch(() => null)
  if (!snap) return []
  return snap.docs.map((d) => normAtividade(d.data() as Record<string, unknown>, d.id)).sort((a, b) => a.ordem - b.ordem)
}

export async function salvarAtividade(trilhaId: string, a: Atividade): Promise<void> {
  await setDoc(doc(db(), COL, trilhaId, 'atividades', a.id), {
    ordem: a.ordem,
    tipo: a.tipo,
    titulo: String(a.titulo ?? '').trim(),
    enunciado: String(a.enunciado ?? '').trim(),
    imagem: String(a.imagem ?? '').trim(),
    opcoes: (a.opcoes ?? []).map((s) => String(s).trim()).filter(Boolean),
    corretas: (a.corretas ?? []).filter((n) => Number.isFinite(n)),
    campos: (a.campos ?? []).map((s) => String(s).trim()).filter(Boolean),
  })
}

export async function excluirAtividade(trilhaId: string, atividadeId: string): Promise<void> {
  await deleteDoc(doc(db(), COL, trilhaId, 'atividades', atividadeId))
}

export function novoIdAtividade(): string {
  return 'a_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
export function atividadeVazia(ordem: number, tipo: TipoAtividade = 'assinalar'): Atividade {
  return {
    id: novoIdAtividade(), ordem, tipo, titulo: '', enunciado: '', imagem: '',
    opcoes: tipo === 'assinalar' ? ['', ''] : [], corretas: [], campos: tipo === 'listar' ? [''] : [],
  }
}

// ---------------- Progresso do usuário ----------------
const PROG = 'trilhas_dev_progresso'

export async function getProgressoUsuario(uid: string): Promise<ProgressoUsuario> {
  const snap = await getDoc(doc(db(), PROG, uid)).catch(() => null)
  if (!snap || !snap.exists()) return { trilhas: {}, pontos_total: 0 }
  const d = snap.data() as Record<string, unknown>
  const trilhas = (d.trilhas && typeof d.trilhas === 'object' ? d.trilhas : {}) as Record<string, ProgressoTrilha>
  return { trilhas, pontos_total: typeof d.pontos_total === 'number' ? d.pontos_total : 0 }
}

/**
 * Marca a atividade como concluída. Se a pessoa concluiu todas as atividades da
 * trilha, marca a trilha como concluída e credita os pontos. Recalcula o total
 * a partir das trilhas concluídas (idempotente: não credita em dobro).
 */
export async function concluirAtividade(
  uid: string,
  trilha: { id: string; pontos: number },
  atividadeId: string,
  totalAtividades: number,
  resposta?: unknown,
): Promise<{ progresso: ProgressoUsuario; creditou: boolean }> {
  const atual = await getProgressoUsuario(uid)
  const tr: ProgressoTrilha = atual.trilhas[trilha.id] ?? { concluidas: [], concluida: false, pontos: 0, respostas: {} }
  const concluidas = tr.concluidas.includes(atividadeId) ? tr.concluidas : [...tr.concluidas, atividadeId]
  const respostas = resposta !== undefined ? { ...(tr.respostas ?? {}), [atividadeId]: resposta } : (tr.respostas ?? {})

  let concluida = tr.concluida
  let pontos = tr.pontos
  let creditou = false
  if (!concluida && totalAtividades > 0 && concluidas.length >= totalAtividades) {
    concluida = true
    pontos = Math.max(0, Math.round(Number(trilha.pontos) || 0))
    creditou = true
  }

  const trilhas = { ...atual.trilhas, [trilha.id]: { concluidas, concluida, pontos, respostas } }
  const pontos_total = Object.values(trilhas).reduce((s, t) => s + (t.concluida ? (t.pontos || 0) : 0), 0)

  await setDoc(doc(db(), PROG, uid), { trilhas, pontos_total }, { merge: false })
  return { progresso: { trilhas, pontos_total }, creditou }
}
