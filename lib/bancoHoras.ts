'use client'

// =============================================================
// Banco de Horas — leitura da planilha mensal (SheetJS) e utilidades.
//
// Colunas: Matrícula, Funcionário, Empresa, Cargo, Centro de custo, Falta,
// Saldo acumulado. O "Saldo acumulado" vem como HH:MM, pode ser NEGATIVO
// (ex.: -19:31) e "-" significa SEM saldo. O período (mês) é escolhido no
// upload (tentamos detectar do nome da aba).
// =============================================================
import * as XLSX from 'xlsx'

export interface LinhaBH {
  matricula: string
  funcionario: string
  empresa: string
  cargo: string
  centro_custo: string
  falta: string
  saldo_texto: string
  saldo_min: number | null
}

const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function chave(s: string): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase()
}

function campo(h: string): string | null {
  const k = chave(h)
  if (['matricula', 'matricula do funcionario', 'mat'].includes(k)) return 'matricula'
  if (['funcionario', 'nome', 'colaborador'].includes(k)) return 'funcionario'
  if (['empresa'].includes(k)) return 'empresa'
  if (['cargo', 'funcao'].includes(k)) return 'cargo'
  if (['centro de custo', 'centro', 'area', 'setor'].includes(k)) return 'centro_custo'
  if (['falta', 'faltas'].includes(k)) return 'falta'
  if (['saldo acumulado', 'saldo', 'banco de horas', 'saldo do banco'].includes(k)) return 'saldo'
  return null
}

/** Converte "HH:MM" (com sinal) em minutos; "-" ou vazio → null. */
export function parseSaldoMin(v: unknown): number | null {
  const s = String(v ?? '').trim()
  if (s === '' || s === '-') return null
  const m = s.match(/^(-)?\s*(\d+):([0-5]?\d)$/)
  if (m) return (m[1] ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]))
  const num = Number(s.replace(',', '.'))
  return Number.isFinite(num) ? Math.round(num * 60) : null
}

/** Minutos → "HH:MM" com sinal ("—" quando null). */
export function formatSaldo(min: number | null | undefined): string {
  if (min == null) return '—'
  const neg = min < 0
  const a = Math.abs(min)
  return `${neg ? '-' : ''}${Math.floor(a / 60)}:${String(a % 60).padStart(2, '0')}`
}

/** 'YYYY-MM' do mês atual no fuso de São Paulo. */
export function mesAtualRef(): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  const g = (t: string) => p.find((x) => x.type === t)?.value
  return `${g('year')}-${g('month')}`
}

/** 'YYYY-MM' → "Setembro/2026". */
export function mesRefLabel(ref: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ref ?? '')
  if (!m) return ref ?? ''
  const nome = MESES_PT[Number(m[2]) - 1] ?? m[2]
  return `${nome[0].toUpperCase()}${nome.slice(1)}/${m[1]}`
}

/** Lista de meses (para o seletor): do mês atual até 24 meses atrás. */
export function mesesRecentes(qtd = 24): string[] {
  const out: string[] = []
  const hoje = mesAtualRef()
  let [ano, mes] = hoje.split('-').map(Number)
  for (let i = 0; i < qtd; i++) {
    out.push(`${ano}-${String(mes).padStart(2, '0')}`)
    mes -= 1
    if (mes === 0) { mes = 12; ano -= 1 }
  }
  return out
}

/** Tenta descobrir 'YYYY-MM' pelo nome da aba (ex.: "Setembro 2026", "09-2026"). */
function detectarMes(nomeAba: string): string | null {
  const s = chave(nomeAba)
  const mm = s.match(/(\d{4}).*?(\d{1,2})|(\d{1,2}).*?(\d{4})/)
  let ano: number | null = null, mes: number | null = null
  const idxNome = MESES_PT.findIndex((n) => s.includes(chave(n)))
  const anoM = s.match(/(20\d{2})/)
  if (anoM) ano = Number(anoM[1])
  if (idxNome >= 0) mes = idxNome + 1
  else if (mm) {
    if (mm[1]) { ano = Number(mm[1]); mes = Number(mm[2]) }
    else { mes = Number(mm[3]); ano = Number(mm[4]) }
  }
  if (ano && mes && mes >= 1 && mes <= 12) return `${ano}-${String(mes).padStart(2, '0')}`
  return null
}

export interface LeituraBH {
  linhas: LinhaBH[]
  mesDetectado: string | null
}

export async function lerBancoHoras(file: File): Promise<LeituraBH> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const nomeAba = wb.SheetNames[0]
  const ws = wb.Sheets[nomeAba]
  const matriz: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, blankrows: false, defval: '' })

  // Acha a linha do cabeçalho (a primeira que tem "Matrícula" e "Saldo").
  let hRow = -1
  for (let r = 0; r < Math.min(matriz.length, 15); r++) {
    const campos = (matriz[r] as unknown[]).map((h) => campo(String(h ?? '')))
    if (campos.includes('matricula') && campos.includes('saldo')) { hRow = r; break }
  }
  if (hRow < 0) return { linhas: [], mesDetectado: detectarMes(nomeAba) }

  const cabec = (matriz[hRow] as unknown[]).map((h) => campo(String(h ?? '')))
  const idx = (c: string) => cabec.indexOf(c)
  const linhas: LinhaBH[] = []

  for (let r = hRow + 1; r < matriz.length; r++) {
    const cols = matriz[r] as unknown[]
    const get = (c: string) => { const i = idx(c); return i >= 0 ? String(cols[i] ?? '').trim() : '' }
    const matricula = get('matricula')
    const funcionario = get('funcionario')
    if (!matricula && !funcionario) continue
    const saldo_texto = get('saldo')
    linhas.push({
      matricula, funcionario,
      empresa: get('empresa'), cargo: get('cargo'), centro_custo: get('centro_custo'),
      falta: get('falta'),
      saldo_texto, saldo_min: parseSaldoMin(saldo_texto),
    })
  }
  return { linhas, mesDetectado: detectarMes(nomeAba) }
}
