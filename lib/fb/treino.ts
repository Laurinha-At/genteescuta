'use client'

// =============================================================
// Progresso de Treinamento e Desenvolvimento (por usuário).
//
// Cada pessoa logada (funcionário Comum ou admin) tem UM documento
// em `treino_progresso/{uid}` com o que já concluiu. O conteúdo das
// trilhas é estático (lib/treinamentos.ts); aqui guardamos só o
// avanço individual — nada sensível, e cada um só lê/escreve o seu.
// =============================================================
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'

export interface ProgressoTreino {
  /** id da etapa -> concluída (true). */
  etapas: Record<string, boolean>
  /** id da trilha -> ISO da conclusão. */
  trilhas: Record<string, string>
  /** Soma de pontos ganhos (motivacional). */
  pontos: number
  atualizado_em?: string
}

const VAZIO: ProgressoTreino = { etapas: {}, trilhas: {}, pontos: 0 }

/** Lê o progresso do usuário logado (ou o objeto vazio se não houver). */
export async function getProgresso(): Promise<ProgressoTreino> {
  const u = auth().currentUser
  if (!u) return { ...VAZIO }
  const snap = await getDoc(doc(db(), 'treino_progresso', u.uid)).catch(() => null)
  if (!snap || !snap.exists()) return { ...VAZIO }
  const d = snap.data() as Partial<ProgressoTreino>
  return {
    etapas: d.etapas ?? {},
    trilhas: d.trilhas ?? {},
    pontos: typeof d.pontos === 'number' ? d.pontos : 0,
    atualizado_em: d.atualizado_em,
  }
}

/** Grava o progresso inteiro (merge) do usuário logado. */
export async function salvarProgresso(p: ProgressoTreino): Promise<void> {
  const u = auth().currentUser
  if (!u) throw new Error('Entre como funcionário para registrar seu progresso.')
  await setDoc(
    doc(db(), 'treino_progresso', u.uid),
    { ...p, atualizado_em: new Date().toISOString() },
    { merge: true },
  )
}

/**
 * Marca uma etapa como concluída e soma os pontos (só na primeira vez),
 * devolvendo o progresso já atualizado. Também registra a conclusão da
 * trilha quando todas as etapas dela terminam.
 */
export function aplicarConclusaoEtapa(
  prog: ProgressoTreino,
  etapaId: string,
  pontos: number,
  trilhaId: string,
  etapasDaTrilha: string[],
): ProgressoTreino {
  const jaFez = prog.etapas[etapaId] === true
  const etapas = { ...prog.etapas, [etapaId]: true }
  const pts = jaFez ? prog.pontos : prog.pontos + (pontos || 0)
  const trilhas = { ...prog.trilhas }
  const completou = etapasDaTrilha.every((id) => etapas[id] === true)
  if (completou && !trilhas[trilhaId]) trilhas[trilhaId] = new Date().toISOString()
  return { etapas, trilhas, pontos: pts, atualizado_em: prog.atualizado_em }
}
