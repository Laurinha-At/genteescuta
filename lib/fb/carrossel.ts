'use client'

// =============================================================
// Carrossel da home: configurável pelo admin (Conteúdo do site).
//  - config/carrossel: liga/desliga, autoplay, velocidade, pausar no hover.
//  - carrossel_slides/{id}: cada slide (imagem, título, texto, link, ativo,
//    ordem, destaque).
// Público lê; o admin de conteúdo gerencia (ver firestore.rules).
// =============================================================
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { registrarLog } from './usuarios'

export interface CarrosselConfig {
  ativo: boolean
  autoplay: boolean
  velocidade_s: number // segundos em cada slide (3 a 12)
  pausar_hover: boolean
}

export const CARROSSEL_CONFIG_PADRAO: CarrosselConfig = {
  ativo: true,
  autoplay: true,
  velocidade_s: 5,
  pausar_hover: true,
}

export interface SlideCarrossel {
  id: string
  ordem: number
  imagem: string // caminho em public/ (ex.: /capa-soulan.png) ou URL
  titulo: string
  texto: string
  link: string // opcional
  cor: string // cor de fundo do card (hex); vazio = degradê padrão
  ativo: boolean
  destaque: boolean
}

// Seed inicial (slide de boas-vindas), para não começar vazio.
export const SLIDES_SEED: SlideCarrossel[] = [
  {
    id: 'bemvindo',
    ordem: 1,
    imagem: '/capa-soulan.png',
    titulo: 'Bem-vindo(a) ao Gente Cultura',
    texto: 'Acompanhe por aqui as novidades da Soulan.',
    link: '/mural',
    cor: '',
    ativo: true,
    destaque: false,
  },
]

const COLECAO = 'carrossel_slides'

export function limitarVelocidade(n: unknown): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 5
  return Math.min(12, Math.max(3, v))
}

function normConfig(d: Record<string, unknown> | undefined): CarrosselConfig {
  return {
    ativo: d?.ativo !== false,
    autoplay: d?.autoplay !== false,
    velocidade_s: limitarVelocidade(d?.velocidade_s ?? 5),
    pausar_hover: d?.pausar_hover !== false,
  }
}

export async function getCarrosselConfig(): Promise<CarrosselConfig> {
  const snap = await getDoc(doc(db(), 'config', 'carrossel')).catch(() => null)
  if (!snap || !snap.exists()) return { ...CARROSSEL_CONFIG_PADRAO }
  return normConfig(snap.data() as Record<string, unknown>)
}

export async function salvarCarrosselConfig(c: CarrosselConfig): Promise<void> {
  await setDoc(
    doc(db(), 'config', 'carrossel'),
    { ativo: !!c.ativo, autoplay: !!c.autoplay, velocidade_s: limitarVelocidade(c.velocidade_s), pausar_hover: !!c.pausar_hover },
    { merge: true },
  )
  await registrarLog('carrossel_config', `ativo=${c.ativo} autoplay=${c.autoplay} vel=${limitarVelocidade(c.velocidade_s)}s`)
}

function normSlide(d: Record<string, unknown>, id: string): SlideCarrossel {
  return {
    id,
    ordem: typeof d.ordem === 'number' ? d.ordem : 0,
    imagem: String(d.imagem ?? ''),
    titulo: String(d.titulo ?? ''),
    texto: String(d.texto ?? ''),
    link: String(d.link ?? ''),
    cor: String(d.cor ?? ''),
    ativo: d.ativo !== false,
    destaque: d.destaque === true,
  }
}

/** Todos os slides (para o admin). */
export async function listarSlides(): Promise<SlideCarrossel[]> {
  const snap = await getDocs(collection(db(), COLECAO)).catch(() => null)
  if (!snap) return []
  return snap.docs.map((d) => normSlide(d.data() as Record<string, unknown>, d.id)).sort((a, b) => a.ordem - b.ordem)
}

/** Só os slides ativos, ordenados (para a home). Cai no seed se ainda não semeado. */
export async function listarSlidesAtivos(): Promise<SlideCarrossel[]> {
  const snap = await getDocs(query(collection(db(), COLECAO), where('ativo', '==', true))).catch(() => null)
  if (!snap) return SLIDES_SEED.filter((s) => s.ativo)
  if (snap.empty) return SLIDES_SEED.filter((s) => s.ativo)
  return snap.docs.map((d) => normSlide(d.data() as Record<string, unknown>, d.id)).sort((a, b) => a.ordem - b.ordem)
}

export async function semearSlidesSePreciso(): Promise<void> {
  const existentes = await listarSlides()
  if (existentes.length > 0) return
  await Promise.all(SLIDES_SEED.map((s) => salvarSlide(s)))
  await registrarLog('carrossel_seed', `${SLIDES_SEED.length} slide(s)`)
}

export async function salvarSlide(s: SlideCarrossel): Promise<void> {
  await setDoc(doc(db(), COLECAO, s.id), {
    ordem: s.ordem,
    imagem: String(s.imagem ?? '').trim(),
    titulo: String(s.titulo ?? '').trim(),
    texto: String(s.texto ?? '').trim(),
    link: String(s.link ?? '').trim(),
    cor: String(s.cor ?? '').trim(),
    ativo: !!s.ativo,
    destaque: !!s.destaque,
  })
}

export async function excluirSlide(id: string): Promise<void> {
  await deleteDoc(doc(db(), COLECAO, id))
}

export function novoIdSlide(): string {
  return 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function slideVazio(ordem: number): SlideCarrossel {
  return { id: novoIdSlide(), ordem, imagem: '', titulo: '', texto: '', link: '', cor: '', ativo: true, destaque: false }
}
