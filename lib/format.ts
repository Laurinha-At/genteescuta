import type { FaixaRisco } from './types'

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dataLonga = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

export function fmtDataHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  return dataHora.format(new Date(iso))
}

export function fmtData(iso: string | null | undefined): string {
  if (!iso) return '—'
  return dataCurta.format(new Date(iso))
}

export function fmtDataLonga(iso: string | null | undefined): string {
  if (!iso) return '—'
  return dataLonga.format(new Date(iso))
}

/** "há 3 dias", "há 2 meses" — usado nas listas do canal. */
export function fmtRelativo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `há ${horas}h`
  const dias = Math.floor(horas / 24)
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
  const anos = Math.floor(meses / 12)
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`
}

export function fmtNumero(n: number, casas = 0): string {
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

export function fmtPercentual(n: number, casas = 0): string {
  return `${fmtNumero(n, casas)}%`
}

/** Dias corridos entre duas datas — usado no tempo médio de resposta. */
export function diasEntre(inicio: string, fim: string): number {
  return Math.max(0, (new Date(fim).getTime() - new Date(inicio).getTime()) / 86400000)
}

export const CLASSE_CHIP: Record<FaixaRisco, string> = {
  baixo: 'chip chip-baixo',
  moderado: 'chip chip-moderado',
  alto: 'chip chip-alto',
  critico: 'chip chip-critico',
}

/** Cor da rampa ordinal de risco correspondente à faixa. */
export const COR_RISCO: Record<FaixaRisco, string> = {
  baixo: 'var(--risco-1)',
  moderado: 'var(--risco-2)',
  alto: 'var(--risco-3)',
  critico: 'var(--risco-4)',
}

export const CORES_SERIE = [
  'var(--serie-1)',
  'var(--serie-2)',
  'var(--serie-3)',
  'var(--serie-4)',
  'var(--serie-5)',
]

export const CORES_FUNIL = [
  'var(--funil-1)',
  'var(--funil-2)',
  'var(--funil-3)',
  'var(--funil-4)',
  'var(--funil-5)',
]

/** Cria um slug de URL a partir do título da pesquisa. */
export function gerarSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
