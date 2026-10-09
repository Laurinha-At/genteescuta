// =============================================================
// Setores / centros de custo: FONTE ÚNICA para todo o portal
// (cadastro, humor, inconsistências e gráficos).
//
// Mantenha a lista e a normalização SÓ aqui. Assim o mesmo setor
// nunca diverge entre telas, e variações de caixa/acento/separador
// ("ATRAÇÃO E SELEÇÃO", "Atração e Seleção", "MARKETING", "THOMAS")
// caem sempre no nome oficial.
// =============================================================

/** Nomes oficiais (canônicos) dos setores / centros de custo. */
export const SETORES_OFICIAIS = [
  'Comercial Soulan',
  'Marketing',
  'Administrativo/Financeiro',
  'Suporte e Dados',
  'Thomas',
  'Atração & Seleção',
  'Diretoria',
  'Gente & Cultura/Cadastro e Suprimentos',
] as const

export type SetorOficial = (typeof SETORES_OFICIAIS)[number]

/** Chave tolerante: sem acento/caixa, "&"→"e", "/"→espaço, pontuação colapsada. */
export function chaveSetor(s: string): string {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

// Aliases por setor (inclui a própria chave canônica + variações usuais).
const ALIASES: { nome: SetorOficial; chaves: string[] }[] = [
  { nome: 'Comercial Soulan', chaves: ['comercial soulan', 'comercial'] },
  { nome: 'Marketing', chaves: ['marketing', 'mkt'] },
  { nome: 'Administrativo/Financeiro', chaves: ['administrativo financeiro', 'adm financeiro', 'administrativo', 'financeiro'] },
  { nome: 'Suporte e Dados', chaves: ['suporte e dados', 'suporte dados', 'suporte', 'dados'] },
  { nome: 'Thomas', chaves: ['thomas'] },
  { nome: 'Atração & Seleção', chaves: ['atracao e selecao', 'atracao selecao', 'atracao', 'recrutamento e selecao'] },
  { nome: 'Diretoria', chaves: ['diretoria', 'diretor'] },
  { nome: 'Gente & Cultura/Cadastro e Suprimentos', chaves: ['gente e cultura', 'gente cultura', 'recursos humanos', 'rh'] },
]

/**
 * Nome oficial do setor a partir de um valor bruto.
 * Vazio → 'Não informado'; não reconhecido → 'Outros'. Idempotente.
 */
export function normalizarSetor(raw: string): string {
  const limpo = String(raw ?? '').replace(/\s+/g, ' ').trim()
  if (!limpo) return 'Não informado'
  const k = chaveSetor(limpo)
  for (const s of ALIASES) {
    if (s.chaves.some((c) => k === c || k.startsWith(c + ' '))) return s.nome
  }
  if (k === 'nao informado') return 'Não informado'
  return 'Outros'
}

/**
 * Para a importação de Inconsistências: mantém o texto bruto quando não
 * reconhece (para avisar o admin), em vez de agrupar em "Outros".
 */
export function normalizarSetorInfo(raw: string): { setor: string; conhecido: boolean } {
  const limpo = String(raw ?? '').replace(/\s+/g, ' ').trim()
  const n = normalizarSetor(limpo)
  if (n === 'Outros') return { setor: limpo, conhecido: false }
  return { setor: n, conhecido: true }
}

// -------- Cores de ALTO CONTRASTE por setor (gráficos) --------
export const PALETA_SETOR = ['#0ea5e9', '#65a30d', '#b45309', '#7c3aed', '#be123c', '#0891b2', '#4f46e5', '#15803d']

const COR_SETOR = new Map(
  Object.entries({
    'Administrativo/Financeiro': '#2563EB',
    'Atração & Seleção': '#16A34A',
    'Gente & Cultura/Cadastro e Suprimentos': '#F59E0B',
    'Thomas': '#DC2626',
    'Suporte e Dados': '#06B6D4',
    'Marketing': '#9333EA',
    'Comercial Soulan': '#0891B2',
    'Diretoria': '#4F46E5',
  }).map(([k, v]) => [chaveSetor(k), v]),
)

/** Cor fixa do setor (ou cor da paleta pelo índice, como reserva). */
export function corDoSetor(setor: string, idx = 0): string {
  return COR_SETOR.get(chaveSetor(setor)) ?? PALETA_SETOR[idx % PALETA_SETOR.length]
}
