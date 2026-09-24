'use client'

// =============================================================
// Trilhas de Treinamento & Desenvolvimento no Firestore.
// Público lê; só admin (Master) grava. Enquanto a coleção estiver vazia,
// o site usa as trilhas estáticas (lib/treinamentos.ts) como base — o
// admin pode "importar" essas trilhas para começar a editar.
// =============================================================
import { collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { registrarLog } from './usuarios'
import { TRILHAS, type Trilha } from '../treinamentos'

export interface TrilhaDoc extends Trilha {
  ordem: number
}

export async function listarTrilhas(): Promise<{ trilhas: Trilha[]; doFirestore: boolean }> {
  const snap = await getDocs(collection(db(), 'trilhas')).catch(() => null)
  if (!snap || snap.empty) return { trilhas: TRILHAS, doFirestore: false }
  const trilhas = snap.docs
    .map((d) => ({ ...(d.data() as any), id: d.id }) as TrilhaDoc)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
  return { trilhas, doFirestore: true }
}

/** Copia as trilhas estáticas para o Firestore (uma vez), para poder editar. */
export async function importarTrilhasEstaticas(): Promise<number> {
  let ordem = 10
  for (const t of TRILHAS) {
    const { id, ...resto } = t
    await setDoc(doc(db(), 'trilhas', id), { ...resto, ordem }, { merge: true })
    ordem += 10
  }
  await registrarLog('trilhas_importar', `${TRILHAS.length} trilhas`)
  return TRILHAS.length
}

function limpar(t: Partial<Trilha>) {
  return {
    title: String(t.title ?? '').trim(),
    desc: String(t.desc ?? '').trim(),
    icon: String(t.icon ?? '📘').trim() || '📘',
    color: String(t.color ?? '#2f8bb4').trim() || '#2f8bb4',
    tag: t.tag === 'sugerido' ? 'sugerido' : 'obrigatorio',
    mins: Number(t.mins) || 0,
    areas: Array.isArray(t.areas) ? t.areas.filter(Boolean) : [],
    capa: t.capa ? String(t.capa).trim() : null,
    acts: Array.isArray(t.acts) ? t.acts : [],
  }
}

export async function criarTrilha(t: Partial<Trilha>): Promise<string> {
  if (!String(t.title ?? '').trim()) throw new Error('Dê um título à trilha.')
  const ref = await addDoc(collection(db(), 'trilhas'), { ...limpar(t), ordem: Date.now() })
  await registrarLog('trilha_criar', String(t.title))
  return ref.id
}

export async function atualizarTrilha(id: string, t: Partial<Trilha>): Promise<void> {
  if (!String(t.title ?? '').trim()) throw new Error('Dê um título à trilha.')
  await updateDoc(doc(db(), 'trilhas', id), { ...limpar(t), atualizado_em: new Date().toISOString() })
  await registrarLog('trilha_editar', String(t.title))
}

export async function excluirTrilha(id: string): Promise<void> {
  await deleteDoc(doc(db(), 'trilhas', id))
  await registrarLog('trilha_excluir', id)
}

export async function trocarOrdemTrilhas(a: TrilhaDoc, b: TrilhaDoc): Promise<void> {
  await Promise.all([
    updateDoc(doc(db(), 'trilhas', a.id), { ordem: b.ordem ?? 0 }),
    updateDoc(doc(db(), 'trilhas', b.id), { ordem: a.ordem ?? 0 }),
  ])
}
