'use client'

// =============================================================
// Inconsistências — Firestore. Um documento por mês de referência
// (inconsistencias/{AAAA-MM}) com a lista {setor, funcionário, quantidade}.
// Reimportar o mesmo mês SUBSTITUI integralmente (setDoc sem merge).
// =============================================================
import { collection, doc, setDoc, getDocs } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { registrarLog } from './usuarios'
import type { ItemInconsistencia } from '../inconsistencias'

export interface DocInconsistencias {
  mes_ref: string
  itens: ItemInconsistencia[]
  total: number
  funcionarios: number
  setores: number
  enviado_por: string | null
  enviado_em: string
}

/** Salva (substitui) os dados do mês. Só admin grava (Regras). */
export async function salvarInconsistencias(mesRef: string, itens: ItemInconsistencia[]) {
  const total = itens.reduce((s, i) => s + (i.quantidade || 0), 0)
  const funcionarios = new Set(itens.map((i) => i.funcionario.toLowerCase())).size
  const setores = new Set(itens.map((i) => i.setor)).size
  await setDoc(doc(db(), 'inconsistencias', mesRef), {
    mes_ref: mesRef,
    itens,
    total,
    funcionarios,
    setores,
    enviado_por: auth().currentUser?.email ?? null,
    enviado_em: new Date().toISOString(),
  })
  await registrarLog('inconsistencias_import', `${mesRef}: ${total} inconsistência(s), ${funcionarios} func.`)
  return { total, funcionarios, setores }
}

export async function listarInconsistencias(): Promise<DocInconsistencias[]> {
  const snap = await getDocs(collection(db(), 'inconsistencias')).catch(() => null)
  if (!snap) return []
  return snap.docs
    .map((d) => d.data() as DocInconsistencias)
    .filter((x) => x && x.mes_ref)
    .sort((a, b) => String(b.mes_ref).localeCompare(String(a.mes_ref)))
}
