// =============================================================
// Treinamento e Desenvolvimento — conteúdo migrado do 'Sou Hub'.
//
// As 4 trilhas (com etapas de leitura, quiz e caça-palavras) ficam
// AQUI como dados estáticos — nada de servidor. O progresso de cada
// pessoa é guardado no Firestore (lib/fb/treino.ts), respeitando o
// login: o funcionário Comum vê e faz; ninguém trapaceia porque a
// correção é simples e o que importa (progresso) é por usuário.
//
// Tipos de etapa: 'texto' (leitura), 'quiz' (múltipla escolha),
// 'caca' (caça-palavras com tabuleiro pré-gerado).
// =============================================================

export type TagTrilha = 'obrigatorio' | 'sugerido'

export interface EtapaBase {
  id: string
  type: 'texto' | 'quiz' | 'caca' | 'material'
  title: string
  pts: number
  coins: number
}
export interface EtapaTexto extends EtapaBase { type: 'texto'; content: string }
export interface EtapaQuiz extends EtapaBase { type: 'quiz'; q: string; opts: string[]; ans: number }
export interface EtapaMaterial extends EtapaBase { type: 'material'; url: string; content?: string; midia?: 'link' | 'video' }
export interface EtapaCaca extends EtapaBase {
  type: 'caca'
  intro: string
  palavras: string[]
  grid: string[][]
  posicoes: Record<string, [number, number][]>
}
export type Etapa = EtapaTexto | EtapaQuiz | EtapaMaterial | EtapaCaca

export interface Trilha {
  id: string
  title: string
  icon: string
  color: string
  tag: TagTrilha
  mins: number
  /** Áreas que enxergam a trilha; vazio = todas as áreas. */
  areas: string[]
  desc: string
  capa: string | null
  acts: Etapa[]
}

export const TRILHAS: Trilha[] = []

/** Pontos possíveis somando todas as etapas da trilha. */
export function pontosPossiveis(t: Trilha): number {
  return t.acts.reduce((s, a) => s + (a.pts || 0), 0)
}

/** A pessoa enxerga a trilha? (sem restrição de área, ou área compatível.) */
export function trilhaVisivel(t: Trilha, area?: string | null): boolean {
  if (!t.areas || t.areas.length === 0) return true
  if (!area) return false
  const norm = (s: string) => s.normalize('NFD').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  return t.areas.some((a) => norm(a) === norm(area))
}

