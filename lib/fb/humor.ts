'use client'

// =============================================================
// Humor da equipe: persistência no Firestore.
//
// Os registros brutos (com nome/matrícula) ficam em `humor_registros`,
// legíveis SÓ pelo admin (ver firestore.rules). A tela lê tudo para
// agregar, mas nunca exibe nome/matrícula.
//
// Dedup: o ID do documento é determinístico (matrícula_ts_humor), então
// reimportar o mesmo arquivo sobrescreve em vez de duplicar.
// =============================================================
import { collection, doc, getDoc, getDocs, setDoc, writeBatch, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import {
  CLASSIFICACAO_PADRAO,
  HUMORES,
  chaveMarcacao,
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
 * Registros do humor de UM centro de custo (para o Gestor Aprovador).
 * O filtro por setor é imposto na consulta (as Regras só liberam ao gestor os
 * registros do seu centro). Centro vazio ou "Todos os centros" lê tudo.
 */
export async function listarRegistrosHumorCentro(centro: string): Promise<RegistroHumor[]> {
  const col = collection(db(), 'humor_registros')
  const c = String(centro ?? '').trim()
  if (!c || c === 'Todos os centros de custo') return listarRegistrosHumor()
  const snap = await getDocs(query(col, where('setor', '==', c)))
  return snap.docs.map((d) => {
    const x = d.data() as RegistroHumor
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

/**
 * Apaga só os registros de um mês (AAAA-MM), preservando os demais.
 * O ID do documento não depende do mês, então filtramos pelo campo `dia`.
 */
export async function limparRegistrosHumorMes(mesRef: string): Promise<number> {
  const snap = await getDocs(collection(db(), 'humor_registros'))
  const alvo = snap.docs.filter((d) => String((d.data() as RegistroHumor).dia || '').startsWith(mesRef))
  let apagados = 0
  for (let i = 0; i < alvo.length; i += 400) {
    const lote = writeBatch(db())
    for (const d of alvo.slice(i, i + 400)) {
      lote.delete(d.ref)
      apagados++
    }
    await lote.commit()
  }
  return apagados
}

/**
 * Remove marcações DUPLICADAS (mesma identidade + data/hora), mantendo uma por
 * grupo. Mantém a com SETOR informado (prioriza a reimportada, já com o centro
 * de custo correto); em empate, a de id mais "novo" (ordem estável). Só Master
 * grava/exclui (Regras). Use depois de reimportar com a chave nova.
 */
export async function limparDuplicadosHumor(): Promise<{ removidos: number; grupos: number }> {
  const snap = await getDocs(collection(db(), 'humor_registros'))
  const setorRuim = (s: unknown) => {
    const v = String(s ?? '').trim()
    return v === '' || v === 'Não informado' || v === 'Outros'
  }
  // Agrupa por chave estável da marcação (ignora a caixa do nome e o id antigo).
  const grupos = new Map<string, { id: string; setorBom: boolean }[]>()
  for (const d of snap.docs) {
    const x = d.data() as RegistroHumor
    const k = chaveMarcacao({ matricula: x.matricula, funcionario: x.funcionario, ts: x.ts })
    const arr = grupos.get(k) ?? []
    arr.push({ id: d.id, setorBom: !setorRuim(x.setor) })
    grupos.set(k, arr)
  }
  // Decide o que remover: em cada grupo com mais de um, mantém o melhor.
  const aRemover: string[] = []
  let gruposDup = 0
  for (const arr of grupos.values()) {
    if (arr.length <= 1) continue
    gruposDup++
    const manter = arr.slice().sort((a, b) =>
      (a.setorBom === b.setorBom ? (a.id < b.id ? 1 : -1) : a.setorBom ? -1 : 1),
    )[0]
    for (const r of arr) if (r.id !== manter.id) aRemover.push(r.id)
  }
  // Exclui em lotes de 400 (limite do writeBatch é 500).
  let removidos = 0
  for (let i = 0; i < aRemover.length; i += 400) {
    const lote = writeBatch(db())
    for (const id of aRemover.slice(i, i + 400)) { lote.delete(doc(db(), 'humor_registros', id)); removidos++ }
    await lote.commit()
  }
  return { removidos, grupos: gruposDup }
}

/** Apaga TODOS os registros de humor: para recomeçar do zero. */
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
