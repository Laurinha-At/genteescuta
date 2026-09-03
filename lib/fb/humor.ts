'use client'

// =============================================================
// Humor da equipe — persistência no Firestore.
//
// Os registros brutos (com nome/matrícula) ficam em `humor_registros`,
// legíveis SÓ pelo admin (ver firestore.rules). A tela lê tudo para
// agregar, mas nunca exibe nome/matrícula.
//
// Dedup: o ID do documento é determinístico (matrícula_ts_humor), então
// reimportar o mesmo arquivo sobrescreve em vez de duplicar.
// =============================================================
import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import {
  CLASSIFICACAO_PADRAO,
  HUMORES,
  type Categoria,
  type Humor,
  type RegistroHumor,
} from '../humor'

export async function listarRegistrosHumor(): Promise<RegistroHumor[]> {
  const snap = await getDocs(collection(db(), 'humor_registros'))
  return snap.docs.map((d) => {
    const x = d.data() as RegistroHumor
    // registros antigos podem não ter `setor`
    return { ...x, setor: x.setor || 'Não informado' }
  })
}

/**
 * Grava só os registros cujo ID ainda não existe (recebe a lista já
 * filtrada). Usa lotes de 400 (limite do writeBatch é 500).
 */
export async function salvarRegistrosHumor(novos: RegistroHumor[]): Promise<number> {
  let gravados = 0
  for (let i = 0; i < novos.length; i += 400) {
    const lote = writeBatch(db())
    for (const r of novos.slice(i, i + 400)) {
      lote.set(doc(db(), 'humor_registros', r.id), r)
      gravados++
    }
    await lote.commit()
  }
  return gravados
}

/** Apaga TODOS os registros de humor — para recomeçar do zero. */
export async function limparRegistrosHumor(): Promise<number> {
  const snap = await getDocs(collection(db(), 'humor_registros'))
  const docs = snap.docs
  let apagados = 0
  for (let i = 0; i < docs.length; i += 400) {
    const lote = writeBatch(db())
    for (const d of docs.slice(i, i + 400)) {
      lote.delete(d.ref)
      apagados++
    }
    await lote.commit()
  }
  return apagados
}

// ---- Classificação (positivo/neutro/negativo) ---------------
function saneiaClassificacao(bruto: unknown): Record<Humor, Categoria> {
  const base = { ...CLASSIFICACAO_PADRAO }
  if (bruto && typeof bruto === 'object') {
    for (const h of HUMORES) {
      const v = (bruto as Record<string, unknown>)[h]
      if (v === 'positivo' || v === 'neutro' || v === 'negativo') base[h] = v
    }
  }
  return base
}

export async function getClassificacaoHumor(): Promise<Record<Humor, Categoria>> {
  try {
    const snap = await getDoc(doc(db(), 'config', 'humor'))
    return saneiaClassificacao(snap.exists() ? snap.data()?.classificacao : null)
  } catch {
    return { ...CLASSIFICACAO_PADRAO }
  }
}

export async function salvarClassificacaoHumor(classif: Record<Humor, Categoria>): Promise<void> {
  await setDoc(doc(db(), 'config', 'humor'), { classificacao: classif }, { merge: true })
}
