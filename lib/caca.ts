// =============================================================
// Caça-palavras: normalização das palavras e geração do tabuleiro.
// Puro (sem Firestore, sem React), fácil de testar.
// =============================================================

export type DirecaoCaca = 'horizontal' | 'vertical' | 'diagonal' | 'invertidas'

export const DIRECAO_LABEL: Record<DirecaoCaca, string> = {
  horizontal: 'Horizontal',
  vertical: 'Vertical',
  diagonal: 'Diagonal',
  invertidas: 'Invertidas (de trás para frente)',
}

/** MAIÚSCULAS, sem acentos e sem espaços/pontuação. "Day off" vira DAYOFF. */
export function normalizarPalavra(s: string): string {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
}

/** Vetores de direção (linha, coluna) a partir das direções marcadas. */
function vetores(direcoes: DirecaoCaca[]): [number, number][] {
  const inv = direcoes.includes('invertidas')
  const set: [number, number][] = []
  if (direcoes.includes('horizontal')) { set.push([0, 1]); if (inv) set.push([0, -1]) }
  if (direcoes.includes('vertical')) { set.push([1, 0]); if (inv) set.push([-1, 0]) }
  if (direcoes.includes('diagonal')) { set.push([1, 1], [1, -1]); if (inv) set.push([-1, -1], [-1, 1]) }
  if (set.length === 0) set.push([0, 1]) // fallback: ao menos horizontal
  return set
}

const ALFA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const rnd = (n: number) => Math.floor(Math.random() * n)

/** Tenta posicionar todas as palavras num tabuleiro quadrado de lado `tamanho`. */
function tentarGerar(palavras: string[], tamanho: number, vets: [number, number][]) {
  const grade: (string | null)[][] = Array.from({ length: tamanho }, () => Array(tamanho).fill(null))
  const posicoes: Record<string, number[]> = {}
  const naoCouberam: string[] = []
  const ordenadas = [...palavras].sort((a, b) => b.length - a.length) // maiores primeiro

  for (const w of ordenadas) {
    if (w.length > tamanho) { naoCouberam.push(w); continue }
    let colocada = false
    for (let tent = 0; tent < 250 && !colocada; tent++) {
      const [dr, dc] = vets[rnd(vets.length)]
      const r0 = rnd(tamanho), c0 = rnd(tamanho)
      const rEnd = r0 + dr * (w.length - 1), cEnd = c0 + dc * (w.length - 1)
      if (rEnd < 0 || rEnd >= tamanho || cEnd < 0 || cEnd >= tamanho) continue
      let ok = true
      for (let k = 0; k < w.length; k++) {
        const cur = grade[r0 + dr * k][c0 + dc * k]
        if (cur !== null && cur !== w[k]) { ok = false; break }
      }
      if (!ok) continue
      const idxs: number[] = []
      for (let k = 0; k < w.length; k++) {
        const rr = r0 + dr * k, cc = c0 + dc * k
        grade[rr][cc] = w[k]; idxs.push(rr * tamanho + cc)
      }
      posicoes[w] = idxs; colocada = true
    }
    if (!colocada) naoCouberam.push(w)
  }
  const final = grade.map((row) => row.map((ch) => ch ?? ALFA[rnd(26)]))
  return { grade: final, posicoes, naoCouberam }
}

export interface ResultadoCaca {
  grade: string[][]
  posicoes: Record<string, number[]>
  palavras: string[]
  naoCouberam: string[]
  tamanho: number
}

/**
 * Gera o tabuleiro: normaliza as palavras (ignora vazias e repetidas), escolhe
 * um tamanho automático pela quantidade e pelo comprimento, posiciona nas
 * direções escolhidas e preenche o resto com letras aleatórias. Cresce o
 * tabuleiro se algo não couber; o que sobrar volta em `naoCouberam`.
 */
export function gerarCaca(palavrasRaw: string[], direcoes: DirecaoCaca[]): ResultadoCaca {
  const palavras: string[] = []
  for (const p of palavrasRaw) {
    const n = normalizarPalavra(p)
    if (n && !palavras.includes(n)) palavras.push(n)
  }
  const vets = vetores(direcoes)
  const maxLen = palavras.reduce((m, w) => Math.max(m, w.length), 0)
  const totalLetras = palavras.reduce((s, w) => s + w.length, 0)
  let tamanho = Math.min(20, Math.max(maxLen, Math.ceil(Math.sqrt(totalLetras) * 1.4), 8))

  let melhor = tentarGerar(palavras, tamanho, vets)
  while (melhor.naoCouberam.length > 0 && tamanho < 22) {
    tamanho += 2
    melhor = tentarGerar(palavras, tamanho, vets)
  }
  return { grade: melhor.grade, posicoes: melhor.posicoes, palavras, naoCouberam: melhor.naoCouberam, tamanho }
}
