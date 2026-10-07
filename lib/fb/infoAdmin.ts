'use client'

// =============================================================
// Informações Administrativas: TÓPICOS (cards) com vários ITENS.
//
// Cada tópico é um documento em `info_topicos/{id}`: ícone, título e
// descrição (texto rico sanitizado) e um array `itens`. Cada item tem um
// tipo (link, vídeo, foto, arquivo ou texto) e pode apontar para um link
// externo OU para um arquivo enviado ao Firebase Storage.
//
// Colaboradores logados LEEM; só o admin (Master) cria/edita/remove: a
// trava real está nas Regras do Firestore e do Storage.
// =============================================================
import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs } from 'firebase/firestore'
import { ref as storageRef, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase'
import { registrarLog } from './usuarios'
import { sanitizeRich, richVazio } from '../sanitizeHtml'

export type ItemTipo = 'link' | 'video' | 'foto' | 'arquivo' | 'texto' | 'embed'

export const ITEM_TIPOS: ItemTipo[] = ['link', 'video', 'foto', 'arquivo', 'texto', 'embed']

export const ITEM_TIPO_LABEL: Record<ItemTipo, string> = {
  link: 'Link',
  video: 'Vídeo',
  foto: 'Foto / Imagem',
  arquivo: 'Planilha / Arquivo',
  texto: 'Texto',
  embed: 'Calendário / Incorporar',
}

/** Ícones disponíveis para os tópicos (nomes resolvidos no componente). */
export const ICONES_TOPICO = [
  'ClipboardList', 'Clock', 'CalendarDays', 'Bus', 'CreditCard', 'Wallet', 'Laptop', 'FileText',
  'BookOpen', 'HeartPulse', 'Wrench', 'Building2', 'Gift', 'GraduationCap', 'Info',
] as const

/** Rótulo em português de cada ícone, mostrado no seletor. */
export const ICONE_TOPICO_LABEL: Record<(typeof ICONES_TOPICO)[number], string> = {
  ClipboardList: 'Ponto',
  Clock: 'Horários',
  CalendarDays: 'Calendário',
  Bus: 'Transporte',
  CreditCard: 'Benefícios',
  Wallet: 'Holerite',
  Laptop: 'Equipamentos',
  FileText: 'Documentos',
  BookOpen: 'Manuais',
  HeartPulse: 'Saúde',
  Wrench: 'Ferramentas',
  Building2: 'Empresa',
  Gift: 'Vantagens',
  GraduationCap: 'Treinamentos',
  Info: 'Geral',
}

export interface InfoItem {
  id: string
  tipo: ItemTipo
  titulo: string            // HTML rico sanitizado
  descricao?: string        // HTML rico sanitizado
  url?: string              // link externo OU URL de download do Storage
  storage_path?: string     // preenchido quando foi upload (para poder apagar)
  texto?: string            // HTML rico (tipo 'texto')
}

/** Cores disponíveis para os cards (gradientes resolvidos no componente). */
export const CORES_TOPICO = [
  'azul', 'verde', 'petroleo', 'ceu', 'ambar', 'coral', 'uva', 'grafite',
] as const
export type CorTopico = (typeof CORES_TOPICO)[number]

// 'todos' = todos os colaboradores; 'admin' = só administradores;
// 'gestor' = administradores + Gestor Aprovador.
export type Visibilidade = 'todos' | 'admin' | 'gestor'

/** Públicos efetivos de um tópico (usa `publicos`; cai no `visivel` legado). */
export function publicosDe(t: { publicos?: Visibilidade[]; visivel?: Visibilidade }): Visibilidade[] {
  if (Array.isArray(t.publicos) && t.publicos.length) return t.publicos
  return [t.visivel ?? 'todos']
}

export interface InfoTopico {
  id: string
  icone: string
  cor?: string              // uma de CORES_TOPICO; ausente = cor automática
  ativo?: boolean           // false = inativo (escondido do site, sem apagar)
  visivel?: Visibilidade    // (legado) público único; ver `publicos`
  publicos?: Visibilidade[] // públicos que veem o card (pode ter mais de um)
  titulo: string            // HTML rico sanitizado
  descricao: string         // HTML rico sanitizado
  ordem: number
  itens: InfoItem[]
  criado_em: string
  atualizado_em?: string
}

// Aceita link externo (http/https) OU arquivo embutido (data URL).
const URL_RE = /^(https?:\/\/|data:)/i

function novoId(): string {
  return (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    : Math.random().toString(36).slice(2, 18)
}

// -------------------------------------------------------------
// Tópicos (cards)
// -------------------------------------------------------------
export async function listarTopicos(): Promise<InfoTopico[]> {
  const snap = await getDocs(collection(db(), 'info_topicos'))
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as InfoTopico)
    .map((t) => ({ ...t, itens: Array.isArray(t.itens) ? t.itens : [] }))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
}

function normalizarPublicos(entrada: unknown, visivelLegado?: string): Visibilidade[] {
  const validos: Visibilidade[] = ['todos', 'admin', 'gestor']
  let arr = Array.isArray(entrada)
    ? (entrada.filter((x): x is Visibilidade => validos.includes(x as Visibilidade)))
    : (validos.includes(visivelLegado as Visibilidade) ? [visivelLegado as Visibilidade] : [])
  arr = Array.from(new Set(arr))
  // "Todo mundo" absorve os demais; sem seleção = todo mundo.
  if (arr.length === 0 || arr.includes('todos')) return ['todos']
  return arr
}

function normalizarTopico(p: { icone: string; cor?: string; visivel?: string; publicos?: string[]; titulo: string; descricao: string }) {
  const titulo = sanitizeRich(p.titulo ?? '')
  if (richVazio(titulo)) throw new Error('Dê um título ao tópico.')
  const cor = CORES_TOPICO.includes(p.cor as CorTopico) ? (p.cor as CorTopico) : 'azul'
  const publicos = normalizarPublicos(p.publicos, p.visivel)
  // `visivel` (legado) guarda um representante para leitores antigos.
  const visivel: Visibilidade = publicos.includes('todos') ? 'todos' : publicos[0]
  return {
    icone: String(p.icone ?? 'Info'),
    cor,
    visivel,
    publicos,
    titulo,
    descricao: sanitizeRich(p.descricao ?? ''),
  }
}

export async function criarTopico(p: { icone: string; cor?: string; visivel?: string; publicos?: string[]; titulo: string; descricao: string }): Promise<string> {
  const v = normalizarTopico(p)
  const agora = new Date().toISOString()
  const refDoc = await addDoc(collection(db(), 'info_topicos'), { ...v, ativo: true, ordem: Date.now(), itens: [], criado_em: agora })
  await registrarLog('info_topico_criar', v.titulo.replace(/<[^>]*>/g, ''))
  return refDoc.id
}

export async function atualizarTopico(id: string, p: { icone: string; cor?: string; visivel?: string; publicos?: string[]; titulo: string; descricao: string }): Promise<void> {
  const v = normalizarTopico(p)
  await updateDoc(doc(db(), 'info_topicos', id), { ...v, atualizado_em: new Date().toISOString() })
  await registrarLog('info_topico_editar', v.titulo.replace(/<[^>]*>/g, ''))
}

/** Remove o tópico e apaga do Storage todos os arquivos dos seus itens. */
export async function excluirTopico(id: string): Promise<void> {
  const snap = await getDoc(doc(db(), 'info_topicos', id)).catch(() => null)
  const itens: InfoItem[] = snap && snap.exists() ? ((snap.data().itens as InfoItem[]) ?? []) : []
  await Promise.all(itens.filter((i) => i.storage_path).map((i) => excluirArquivo(i.storage_path!)))
  await deleteDoc(doc(db(), 'info_topicos', id))
  await registrarLog('info_topico_excluir', id)
}

/** Troca a ordem de dois tópicos vizinhos (mover para cima/baixo). */
export async function trocarOrdemTopicos(a: InfoTopico, b: InfoTopico): Promise<void> {
  await Promise.all([
    updateDoc(doc(db(), 'info_topicos', a.id), { ordem: b.ordem ?? 0 }),
    updateDoc(doc(db(), 'info_topicos', b.id), { ordem: a.ordem ?? 0 }),
  ])
}

/** Inativa (esconde do site) ou reativa um tópico, sem apagar. */
export async function definirAtivoTopico(id: string, ativo: boolean): Promise<void> {
  await updateDoc(doc(db(), 'info_topicos', id), { ativo, atualizado_em: new Date().toISOString() })
  await registrarLog(ativo ? 'info_topico_ativar' : 'info_topico_inativar', id)
}

/** Repostar: joga o tópico para o topo da lista e reativa. */
export async function reporTopico(id: string): Promise<void> {
  const snap = await getDocs(collection(db(), 'info_topicos'))
  let min = 0
  snap.docs.forEach((d) => { const o = Number((d.data() as Record<string, unknown>).ordem ?? 0); if (o < min) min = o })
  await updateDoc(doc(db(), 'info_topicos', id), { ordem: min - 1, ativo: true, atualizado_em: new Date().toISOString() })
  await registrarLog('info_topico_repostar', id)
}

// -------------------------------------------------------------
// Itens (guardados no array `itens` do tópico)
// -------------------------------------------------------------
function normalizarItem(p: {
  tipo: string; titulo: string; descricao?: string; url?: string; storage_path?: string; texto?: string
}): Omit<InfoItem, 'id'> {
  const tipo = ITEM_TIPOS.includes(p.tipo as ItemTipo) ? (p.tipo as ItemTipo) : null
  if (!tipo) throw new Error('Escolha o tipo do item.')
  const titulo = sanitizeRich(p.titulo ?? '')
  if (richVazio(titulo)) throw new Error('Dê um título ao item.')
  const base: Omit<InfoItem, 'id'> = { tipo, titulo, descricao: sanitizeRich(p.descricao ?? '') }

  if (tipo === 'texto') {
    const texto = sanitizeRich(p.texto ?? '')
    if (richVazio(texto)) throw new Error('Escreva o conteúdo do texto.')
    return { ...base, texto }
  }
  // link/video/foto/arquivo: precisa de uma fonte (link externo OU upload).
  const url = String(p.url ?? '').trim()
  if (!URL_RE.test(url)) throw new Error('Informe um link válido ou envie um arquivo.')
  return { ...base, url, ...(p.storage_path ? { storage_path: p.storage_path } : {}) }
}

async function lerItens(topicoId: string): Promise<InfoItem[]> {
  const snap = await getDoc(doc(db(), 'info_topicos', topicoId))
  if (!snap.exists()) throw new Error('Tópico não encontrado.')
  return (snap.data().itens as InfoItem[]) ?? []
}

async function salvarItens(topicoId: string, itens: InfoItem[]): Promise<void> {
  await updateDoc(doc(db(), 'info_topicos', topicoId), { itens, atualizado_em: new Date().toISOString() })
}

export async function adicionarItem(topicoId: string, p: Parameters<typeof normalizarItem>[0]): Promise<void> {
  const item: InfoItem = { id: novoId(), ...normalizarItem(p) }
  const itens = await lerItens(topicoId)
  await salvarItens(topicoId, [...itens, item])
  await registrarLog('info_item_criar', `${item.tipo}`)
}

export async function atualizarItem(topicoId: string, itemId: string, p: Parameters<typeof normalizarItem>[0]): Promise<void> {
  const itens = await lerItens(topicoId)
  const atual = itens.find((i) => i.id === itemId)
  const novos = normalizarItem(p)
  // Se trocou/removeu o arquivo enviado, apaga o antigo do Storage.
  if (atual?.storage_path && atual.storage_path !== novos.storage_path) {
    await excluirArquivo(atual.storage_path)
  }
  await salvarItens(topicoId, itens.map((i) => (i.id === itemId ? { id: itemId, ...novos } : i)))
  await registrarLog('info_item_editar', `${novos.tipo}`)
}

export async function removerItem(topicoId: string, itemId: string): Promise<void> {
  const itens = await lerItens(topicoId)
  const alvo = itens.find((i) => i.id === itemId)
  if (alvo?.storage_path) await excluirArquivo(alvo.storage_path)
  await salvarItens(topicoId, itens.filter((i) => i.id !== itemId))
  await registrarLog('info_item_excluir', itemId)
}

/** Move um item para cima (-1) ou para baixo (+1) dentro do tópico. */
export async function moverItem(topicoId: string, itemId: string, dir: -1 | 1): Promise<void> {
  const itens = await lerItens(topicoId)
  const i = itens.findIndex((x) => x.id === itemId)
  const j = i + dir
  if (i < 0 || j < 0 || j >= itens.length) return
  const copia = [...itens]
  ;[copia[i], copia[j]] = [copia[j], copia[i]]
  await salvarItens(topicoId, copia)
}

// -------------------------------------------------------------
// Uploads SEM Firebase Storage: o arquivo é guardado como data URL.
// Imagens são comprimidas; Word/PDF/planilha entram como estão (com teto).
// -------------------------------------------------------------
// Teto do data URL (o doc do Firestore tem ~1 MB; base64 infla ~33%).
const MAX_ARQUIVO_CHARS = 900_000
const EXT_DOC = /\.(pdf|docx?|xlsx?|csv|odt|ods|pptx?|txt)$/i

function lerComoDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Não consegui ler o arquivo.'))
    r.readAsDataURL(file)
  })
}

async function comprimirImagem(file: File): Promise<string> {
  const url = await lerComoDataURL(file)
  const img = document.createElement('img')
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('Imagem inválida.')); img.src = url })
  for (const maxDim of [1600, 1280, 1024, 800, 640]) {
    const escala = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * escala))
    const h = Math.max(1, Math.round(img.height * escala))
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d'); if (!ctx) break
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h)
    for (const q of [0.82, 0.7, 0.6, 0.5, 0.4]) {
      const out = canvas.toDataURL('image/jpeg', q)
      if (out.length <= MAX_ARQUIVO_CHARS) return out
    }
  }
  throw new Error('A imagem ficou grande demais mesmo após a compressão. Tente uma foto menor.')
}

/** Guarda o arquivo como data URL (sem Storage). Foto → comprime; documento → teto. */
export async function subirArquivo(
  _topicoId: string,
  file: File,
  kind: 'video' | 'foto' | 'arquivo',
): Promise<{ url: string; path: string }> {
  if (!file) throw new Error('Escolha um arquivo.')
  if (kind === 'video') throw new Error('Para vídeo, cole um link do YouTube ou do Google Drive.')

  if (kind === 'foto' || file.type.startsWith('image/')) {
    return { url: await comprimirImagem(file), path: '' }
  }

  // Documento: Word, PDF, planilha (Excel/CSV), etc.
  const ehDoc = file.type === 'application/pdf'
    || file.type.includes('word') || file.type.includes('officedocument')
    || file.type.includes('excel') || file.type.includes('spreadsheet')
    || file.type === 'text/csv' || file.type === 'text/plain'
    || EXT_DOC.test(file.name)
  if (!ehDoc) throw new Error('Envie uma imagem, um PDF, um Word ou uma planilha (ou cole um link).')

  const dados = await lerComoDataURL(file)
  if (dados.length > MAX_ARQUIVO_CHARS) {
    throw new Error('Arquivo grande demais para guardar aqui (máx. ~700 KB). Suba no Google Drive/Sheets e cole o link.')
  }
  return { url: dados, path: '' }
}

/** Compat: itens antigos podiam ter arquivo no Storage. Best-effort. */
export async function excluirArquivo(path: string): Promise<void> {
  if (!path) return
  try { await deleteObject(storageRef(storage(), path)) } catch { /* segue em frente */ }
}
