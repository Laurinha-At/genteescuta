'use client'

// =============================================================
// Informações Administrativas — conteúdo curado pelo admin.
//
// Cada item (link, planilha, texto ou vídeo) é UM documento em
// `info_admin/{id}`. Colaboradores logados leem; só o admin cria,
// edita e remove — a segurança de verdade está nas Regras do
// Firestore (firestore.rules), não aqui.
//
// SEM Firebase Storage: arquivos e planilhas entram como link
// externo (Google Drive/Sheets); vídeos entram como link (YouTube
// ou Drive), exibidos via embed na tela.
// =============================================================
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { registrarLog } from './usuarios'

export type InfoTipo = 'link' | 'planilha' | 'texto' | 'video'

export const INFO_TIPOS: InfoTipo[] = ['link', 'planilha', 'texto', 'video']

export const INFO_TIPO_LABEL: Record<InfoTipo, string> = {
  link: 'Link',
  planilha: 'Planilha',
  texto: 'Conteúdo (texto)',
  video: 'Vídeo',
}

export interface InfoItem {
  id: string
  tipo: InfoTipo
  titulo: string
  descricao: string | null
  url: string | null
  texto: string | null
  ordem: number
  criado_em: string
  atualizado_em?: string
}

export interface InfoEntrada {
  tipo: string
  titulo: string
  descricao?: string
  url?: string
  texto?: string
}

const URL_RE = /^https?:\/\/.+/i

/** Valida e normaliza os campos conforme o tipo. Lança em caso de erro. */
function normalizar(p: InfoEntrada) {
  const tipo = INFO_TIPOS.includes(p.tipo as InfoTipo) ? (p.tipo as InfoTipo) : null
  if (!tipo) throw new Error('Escolha o tipo do item.')
  const titulo = String(p.titulo ?? '').trim()
  if (titulo.length < 2) throw new Error('Dê um título ao item.')
  const descricao = String(p.descricao ?? '').trim() || null

  if (tipo === 'texto') {
    const texto = String(p.texto ?? '').trim()
    if (texto.length < 1) throw new Error('Escreva o conteúdo do texto.')
    return { tipo, titulo, descricao, url: null, texto }
  }

  const url = String(p.url ?? '').trim()
  if (!URL_RE.test(url)) throw new Error('Informe um link válido (começando com http:// ou https://).')
  return { tipo, titulo, descricao, url, texto: null }
}

/** Lista todos os itens, ordenados (ordena no cliente para não exigir índice). */
export async function listarInfoItens(): Promise<InfoItem[]> {
  const snap = await getDocs(collection(db(), 'info_admin'))
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as InfoItem)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
}

export async function criarInfoItem(p: InfoEntrada): Promise<void> {
  const v = normalizar(p)
  const agora = new Date().toISOString()
  await addDoc(collection(db(), 'info_admin'), { ...v, ordem: Date.now(), criado_em: agora })
  await registrarLog('info_admin_criar', `${v.tipo}: ${v.titulo}`)
}

export async function atualizarInfoItem(id: string, p: InfoEntrada): Promise<void> {
  const v = normalizar(p)
  await updateDoc(doc(db(), 'info_admin', id), { ...v, atualizado_em: new Date().toISOString() })
  await registrarLog('info_admin_editar', `${v.tipo}: ${v.titulo}`)
}

export async function excluirInfoItem(id: string, titulo?: string): Promise<void> {
  await deleteDoc(doc(db(), 'info_admin', id))
  await registrarLog('info_admin_excluir', titulo ?? id)
}
