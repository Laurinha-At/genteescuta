'use client'

// =============================================================
// Leitura da planilha de Inconsistências (.xlsx) no navegador (SheetJS).
// Formato fixo (3 colunas): Setor/Área · Funcionário · Quantidade de Inconsistências.
//  - O setor vem agrupado (preenchido só na 1ª linha do bloco) → repete.
//  - Linhas em branco são ignoradas (separadoras).
//  - Nomes de setor são limpos e mapeados para os nomes OFICIAIS do portal.
//  - Mesmo funcionário repetido no mesmo setor → soma as quantidades.
// =============================================================
import * as XLSX from 'xlsx'
import { SETORES_OFICIAIS, chaveSetor as chave, normalizarSetorInfo } from './setores'

// Fonte única da lista oficial e da normalização de setores: '@/lib/setores'.
export { SETORES_OFICIAIS }

/** Mapeia um nome de setor bruto para o oficial. `conhecido=false` se não casou. */
export const normalizarSetor = normalizarSetorInfo

export interface ItemInconsistencia {
  setor: string
  funcionario: string
  quantidade: number
}

export interface LeituraInconsistencias {
  itens: ItemInconsistencia[]
  desconhecidos: string[] // setores que não casaram com a lista oficial
  totalLinhas: number
}

function campo(h: string): 'setor' | 'funcionario' | 'quantidade' | null {
  const k = chave(h)
  if (k.includes('setor') || k.includes('area')) return 'setor'
  if (k.includes('funcion') || k.includes('colaborad') || k === 'nome') return 'funcionario'
  if (k.includes('quantidade') || k.includes('inconsist') || k.includes('qtd')) return 'quantidade'
  return null
}

export async function lerInconsistencias(file: File): Promise<LeituraInconsistencias> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const matriz: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, blankrows: false, defval: '' })

  // Acha a linha de cabeçalho (tem Setor + Funcionário + Quantidade).
  let hRow = -1
  for (let r = 0; r < Math.min(matriz.length, 15); r++) {
    const cs = (matriz[r] as unknown[]).map((h) => campo(String(h ?? '')))
    if (cs.includes('setor') && cs.includes('funcionario') && cs.includes('quantidade')) { hRow = r; break }
  }
  if (hRow < 0) return { itens: [], desconhecidos: [], totalLinhas: 0 }

  const cab = (matriz[hRow] as unknown[]).map((h) => campo(String(h ?? '')))
  const iSetor = cab.indexOf('setor')
  const iFunc = cab.indexOf('funcionario')
  const iQtd = cab.indexOf('quantidade')

  const soma = new Map<string, ItemInconsistencia>() // chave: setor||funcionario
  const desconhecidos = new Set<string>()
  let lastSetor = ''
  let totalLinhas = 0

  for (let r = hRow + 1; r < matriz.length; r++) {
    const cols = matriz[r] as unknown[]
    const rawSetor = String(cols[iSetor] ?? '').replace(/\s+/g, ' ').trim()
    const func = String(cols[iFunc] ?? '').replace(/\s+/g, ' ').trim()
    const qtdRaw = String(cols[iQtd] ?? '').trim()

    if (rawSetor) {
      const { setor, conhecido } = normalizarSetor(rawSetor)
      lastSetor = setor
      if (!conhecido) desconhecidos.add(rawSetor)
    }
    if (!func && !qtdRaw) continue // separadora / linha em branco
    if (!func) continue

    const quantidade = Math.max(0, Math.round(Number(qtdRaw.replace(',', '.')) || 0))
    const setor = lastSetor || 'Outros'
    totalLinhas++
    const key = `${setor}||${func.toLowerCase()}`
    const e = soma.get(key)
    if (e) e.quantidade += quantidade
    else soma.set(key, { setor, funcionario: func, quantidade })
  }

  return { itens: Array.from(soma.values()), desconhecidos: Array.from(desconhecidos), totalLinhas }
}
