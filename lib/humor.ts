// =============================================================
// Humor da equipe (clima) — parsing do CSV e agregações.
//
// Funções PURAS (sem Firestore, sem React) para ficarem fáceis de
// testar. A privacidade é responsabilidade da tela: nome/matrícula
// são lidos e guardados, mas NUNCA exibidos — só agregados.
// =============================================================

export type Categoria = 'positivo' | 'neutro' | 'negativo'

export const HUMORES = [
  'Feliz',
  'Animado',
  'Satisfeito',
  'Tranquilo',
  'Entediado',
  'Aflito',
  'Triste',
  'Irritado',
] as const
export type Humor = (typeof HUMORES)[number]

/** Classificação padrão (o usuário pode ajustar na tela). */
export const CLASSIFICACAO_PADRAO: Record<Humor, Categoria> = {
  Feliz: 'positivo',
  Animado: 'positivo',
  Satisfeito: 'positivo',
  Tranquilo: 'neutro',
  Entediado: 'negativo',
  Aflito: 'negativo',
  Triste: 'negativo',
  Irritado: 'negativo',
}

/** Cor de cada humor nos gráficos de distribuição. */
export const COR_HUMOR: Record<Humor, string> = {
  Feliz: '#1baf7a',
  Animado: '#2fae57',
  Satisfeito: '#8cc63f',
  Tranquilo: '#2f8bb4',
  Entediado: '#b0a58f',
  Aflito: '#eda100',
  Triste: '#5b7fa6',
  Irritado: '#d03b3b',
}

export const COR_CATEGORIA: Record<Categoria, string> = {
  positivo: '#1baf7a',
  neutro: '#2f8bb4',
  negativo: '#d03b3b',
}

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  positivo: 'Positivo',
  neutro: 'Neutro',
  negativo: 'Negativo',
}

export interface RegistroHumor {
  id: string
  ts: number // epoch (ms) do momento do registro
  dia: string // AAAA-MM-DD
  matricula: string // SENSÍVEL — nunca exibir
  funcionario: string // SENSÍVEL — nunca exibir
  cargo: string
  setor: string
  humor: Humor
}

/** Setores válidos da Soulan (referência para ordenação/relatórios). */
export const SETORES_VALIDOS = [
  'Comercial Soulan',
  'Marketing',
  'Administrativo/Financeiro',
  'Suporte e Dados',
  'Thomas',
  'Atração & Seleção',
  'Diretoria',
  'Gente & Cultura/Cadastro e Suprimentos',
]

// -------------------------------------------------------------
// Decodificação: tenta UTF-8; se aparecer caractere inválido,
// cai para Latin-1 (ISO-8859-1).
// -------------------------------------------------------------
export function decodificar(buf: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buf)
  // U+FFFD indica bytes que não são UTF-8 válido → provável Latin-1/ANSI.
  if (utf8.includes('�')) {
    try {
      // Windows-1252 é superset do ISO-8859-1 e cobre o "ANSI" do Windows.
      return new TextDecoder('windows-1252').decode(buf)
    } catch {
      try {
        return new TextDecoder('iso-8859-1').decode(buf)
      } catch {
        return utf8
      }
    }
  }
  return utf8
}

/** Quebra uma linha de CSV com separador `;`, respeitando aspas. */
export function parseLinha(linha: string): string[] {
  const campos: string[] = []
  let atual = ''
  let dentroAspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') {
      if (dentroAspas && linha[i + 1] === '"') {
        atual += '"'
        i++
      } else {
        dentroAspas = !dentroAspas
      }
    } else if (c === ';' && !dentroAspas) {
      campos.push(atual)
      atual = ''
    } else {
      atual += c
    }
  }
  campos.push(atual)
  return campos.map((c) => c.trim())
}

// DD/MM/AAAA HH:MM  (os segundos são opcionais: aceita 08:55 e 08:55:38)
const RE_DATA = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/

/** DD/MM/AAAA HH:MM[:SS] → Date (horário local) ou null. */
export function parseDataHora(s: string): Date | null {
  const m = s.match(RE_DATA)
  if (!m) return null
  const dt = new Date(
    Number(m[3]),
    Number(m[2]) - 1,
    Number(m[1]),
    Number(m[4]),
    Number(m[5]),
    m[6] ? Number(m[6]) : 0,
  )
  return isNaN(dt.getTime()) ? null : dt
}

function semAcentos(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function normalizarHumor(v: string): Humor | null {
  const alvo = semAcentos(v).trim().toLowerCase()
  return HUMORES.find((h) => semAcentos(h).toLowerCase() === alvo) ?? null
}

// -------------------------------------------------------------
// Setores: reconhecimento flexível (sem acento, sem caixa, & = e)
// -------------------------------------------------------------
function chaveSetor(s: string): string {
  return semAcentos(s)
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

const SETOR_OFICIAL: { nome: string; chaves: string[] }[] = [
  { nome: 'Comercial Soulan', chaves: ['comercial soulan', 'comercial'] },
  { nome: 'Marketing', chaves: ['marketing', 'mkt'] },
  { nome: 'Administrativo/Financeiro', chaves: ['administrativo financeiro', 'adm financeiro', 'administrativo', 'financeiro'] },
  { nome: 'Suporte e Dados', chaves: ['suporte e dados', 'suporte dados', 'suporte', 'dados'] },
  { nome: 'Thomas', chaves: ['thomas'] },
  { nome: 'Atração & Seleção', chaves: ['atracao e selecao', 'atracao selecao', 'atracao', 'recrutamento e selecao'] },
  { nome: 'Diretoria', chaves: ['diretoria', 'diretor'] },
  {
    nome: 'Gente & Cultura/Cadastro e Suprimentos',
    chaves: ['gente e cultura', 'gente cultura', 'recursos humanos', 'rh'],
  },
]

/**
 * Casa o setor bruto com a lista oficial (ignora caixa, acentos e "&"/"E").
 * Retorna o nome padronizado; 'Não informado' se vazio; 'Outros' se não casar.
 */
export function normalizarSetor(raw: string): string {
  const k = chaveSetor(raw)
  if (!k) return 'Não informado'
  for (const s of SETOR_OFICIAL) {
    if (s.chaves.some((c) => k === c || k.startsWith(c + ' '))) return s.nome
  }
  return 'Outros'
}

export interface ResultadoParse {
  registros: RegistroHumor[]
  lidas: number // linhas de dados consideradas
  ignoradas: number // linhas sem data válida / humor inválido
  setoresDesconhecidos: string[] // setores que não casaram com a lista oficial (viraram "Outros")
}

interface MapaColunas {
  data: number
  humor: number
  matricula: number
  funcionario: number
  cargo: number
  setor: number
}

/** Acha o índice da 1ª coluna cujo nome (sem acento) contém um dos termos. */
function achaColuna(campos: string[], termos: string[]): number {
  for (let i = 0; i < campos.length; i++) {
    const c = semAcentos(campos[i]).toLowerCase().trim()
    if (termos.some((t) => c.includes(t))) return i
  }
  return -1
}

/** Lê o cabeçalho (linha com "data" e "humor") e mapeia as colunas por nome. */
function mapearColunas(campos: string[]): MapaColunas | null {
  const data = achaColuna(campos, ['data'])
  const humor = achaColuna(campos, ['humor'])
  if (data < 0 || humor < 0) return null
  return {
    data,
    humor,
    matricula: achaColuna(campos, ['matric']),
    funcionario: achaColuna(campos, ['funcion', 'colaborador', 'nome']),
    cargo: achaColuna(campos, ['cargo', 'funcao', 'função']),
    setor: achaColuna(campos, ['setor', 'area', 'área', 'depart']),
  }
}

/**
 * Formato DEFINITIVO (separador ";", arquivo em Latin-1/Windows-1252):
 *   Data ; Setor/Área ; Funcionário ; Humor
 *  - 1ª linha "Humor;;;" (título) é ignorada;
 *  - 2ª linha é o cabeçalho — colunas identificadas pelo NOME (Data, Setor/Área,
 *    Funcionário, Humor), tolerando espaço/acento/caixa e ordem diferente;
 *  - Data no formato DD/MM/AAAA HH:MM (segundos opcionais);
 *  - linhas sem data válida no início (inclusive o JSON de erro) são ignoradas.
 *  Arquivos antigos com colunas extras (Matrícula, Cargo) continuam funcionando:
 *  usa-se o que casar pelo cabeçalho e ignora o resto. Sem cabeçalho reconhecível,
 *  cai no layout antigo (Data;Matrícula;Funcionário;Cargo;Humor).
 */
export function parseHumorCsv(texto: string): ResultadoParse {
  const linhas = texto.split(/\r?\n/)
  const registros: RegistroHumor[] = []
  let lidas = 0
  let ignoradas = 0
  let mapa: MapaColunas | null = null
  const desconhecidos = new Set<string>()
  const LEGADO: MapaColunas = { data: 0, matricula: 1, funcionario: 2, cargo: 3, setor: -1, humor: 4 }

  for (const bruta of linhas) {
    const linha = bruta.trim()
    if (!linha) continue
    const campos = parseLinha(linha)
    const primeiro = (campos[0] ?? '').replace(/^"/, '')

    if (!RE_DATA.test(primeiro)) {
      // Não é linha de dados: tenta usar como cabeçalho (a 1ª que casar).
      if (!mapa) mapa = mapearColunas(campos)
      continue // pula "Humor", cabeçalho, JSON de erro, linhas em branco
    }

    lidas++
    const m = mapa ?? LEGADO
    const pega = (i: number) => (i >= 0 ? (campos[i] ?? '').trim() : '')
    const dt = parseDataHora(pega(m.data) || (campos[0] ?? ''))
    const humor = normalizarHumor(pega(m.humor))
    if (!dt || !humor) {
      ignoradas++
      continue
    }
    const matricula = pega(m.matricula)
    const funcionario = pega(m.funcionario)
    const cargo = pega(m.cargo) || 'Não informado'
    const setorRaw = pega(m.setor)
    const setor = normalizarSetor(setorRaw)
    if (setor === 'Outros' && setorRaw) desconhecidos.add(setorRaw)

    const y = dt.getFullYear()
    const mo = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    const ts = dt.getTime()
    const identidade = matricula || funcionario || 'anon'
    registros.push({
      id: `${identidade}_${ts}_${humor}`,
      ts,
      dia: `${y}-${mo}-${d}`,
      matricula,
      funcionario,
      cargo,
      setor,
      humor,
    })
  }

  // dedup dentro do próprio arquivo (linhas idênticas)
  const porId = new Map<string, RegistroHumor>()
  for (const r of registros) porId.set(r.id, r)

  return {
    registros: Array.from(porId.values()),
    lidas,
    ignoradas,
    setoresDesconhecidos: Array.from(desconhecidos),
  }
}

/** Meses (AAAA-MM) presentes nos registros, do mais recente ao mais antigo. */
export function mesesDisponiveis(regs: RegistroHumor[]): string[] {
  const set = new Set(regs.map((r) => r.dia.slice(0, 7)))
  return Array.from(set).sort((a, b) => b.localeCompare(a))
}

const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
/** "AAAA-MM" → "Agosto/2026" (rótulo do período). */
export function rotuloMes(mes: string): string {
  const [a, m] = mes.split('-')
  const nome = MESES_PT[Number(m) - 1] ?? m
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}/${a}`
}

// -------------------------------------------------------------
// Agregações (recebem os registros já carregados + classificação)
// -------------------------------------------------------------
export function resumo(regs: RegistroHumor[]) {
  const pessoas = new Set(regs.map((r) => r.matricula || r.funcionario).filter(Boolean)).size
  const ts = regs.map((r) => r.ts).filter((n) => Number.isFinite(n))
  return {
    total: regs.length,
    pessoas,
    inicio: ts.length ? Math.min(...ts) : null,
    fim: ts.length ? Math.max(...ts) : null,
  }
}

export function distribuicao(regs: RegistroHumor[]) {
  const conta = new Map<Humor, number>()
  for (const r of regs) conta.set(r.humor, (conta.get(r.humor) ?? 0) + 1)
  return HUMORES.map((h) => ({ humor: h, n: conta.get(h) ?? 0 })).filter((d) => d.n > 0)
}

function indiceDe(pos: number, neg: number, total: number) {
  return total > 0 ? Math.round(((pos - neg) / total) * 100) : 0
}

export function termometro(regs: RegistroHumor[], classif: Record<Humor, Categoria>) {
  let pos = 0
  let neu = 0
  let neg = 0
  for (const r of regs) {
    const c = classif[r.humor]
    if (c === 'positivo') pos++
    else if (c === 'neutro') neu++
    else neg++
  }
  const total = regs.length
  return {
    pos,
    neu,
    neg,
    total,
    pctPos: total ? Math.round((pos / total) * 100) : 0,
    pctNeu: total ? Math.round((neu / total) * 100) : 0,
    pctNeg: total ? Math.round((neg / total) * 100) : 0,
    indice: indiceDe(pos, neg, total),
  }
}

export function tendenciaDiaria(regs: RegistroHumor[], classif: Record<Humor, Categoria>) {
  const grupos = new Map<string, { pos: number; neg: number; total: number }>()
  for (const r of regs) {
    const g = grupos.get(r.dia) ?? { pos: 0, neg: 0, total: 0 }
    const c = classif[r.humor]
    if (c === 'positivo') g.pos++
    else if (c === 'negativo') g.neg++
    g.total++
    grupos.set(r.dia, g)
  }
  return Array.from(grupos.entries())
    .map(([dia, g]) => ({ dia, indice: indiceDe(g.pos, g.neg, g.total), n: g.total }))
    .sort((a, b) => a.dia.localeCompare(b.dia))
}

/** Por setor: participação (n, %) + clima (positivos/neutros/negativos, índice). */
export function porSetor(regs: RegistroHumor[], classif: Record<Humor, Categoria>) {
  const grupos = new Map<string, { pos: number; neu: number; neg: number; total: number }>()
  for (const r of regs) {
    const g = grupos.get(r.setor) ?? { pos: 0, neu: 0, neg: 0, total: 0 }
    const c = classif[r.humor]
    if (c === 'positivo') g.pos++
    else if (c === 'neutro') g.neu++
    else g.neg++
    g.total++
    grupos.set(r.setor, g)
  }
  const totalGeral = regs.length || 1
  return Array.from(grupos.entries())
    .map(([setor, g]) => ({
      setor,
      total: g.total,
      pct: Math.round((g.total / totalGeral) * 100),
      pos: g.pos,
      neu: g.neu,
      neg: g.neg,
      indice: indiceDe(g.pos, g.neg, g.total),
    }))
}

export function porCargo(regs: RegistroHumor[], classif: Record<Humor, Categoria>) {
  const grupos = new Map<string, { pos: number; neu: number; neg: number; total: number }>()
  for (const r of regs) {
    const g = grupos.get(r.cargo) ?? { pos: 0, neu: 0, neg: 0, total: 0 }
    const c = classif[r.humor]
    if (c === 'positivo') g.pos++
    else if (c === 'neutro') g.neu++
    else g.neg++
    g.total++
    grupos.set(r.cargo, g)
  }
  return Array.from(grupos.entries())
    .map(([cargo, g]) => ({
      cargo,
      total: g.total,
      pos: g.pos,
      neu: g.neu,
      neg: g.neg,
      indice: indiceDe(g.pos, g.neg, g.total),
    }))
    .sort((a, b) => b.indice - a.indice)
}
