'use client'

// =============================================================
// Solicitação de Reembolso — operações no Firestore.
//
// SEM Firebase Storage (o projeto é Spark, sem cartão): o comprovante
// é comprimido no navegador e guardado como data URL num documento
// SEPARADO (`reembolso_anexos/{id}`), para não pesar as listas. O
// documento principal (`reembolsos/{id}`) fica leve e é o que as telas
// consultam. A segurança de verdade está nas Regras do Firestore.
// =============================================================
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, query, where,
} from 'firebase/firestore'
import { db, auth } from '../firebase'
import {
  statusInicial, proximoStatus, papelDaEtapa, mesmoCentro,
  type StatusReembolso,
} from '../reembolso'
import type { Perfil } from './funcionarios'
import { registrarLog } from './usuarios'

// Limite do data URL do anexo. O documento do Firestore tem teto de ~1 MB;
// base64 infla ~33%, então seguramos o conteúdo bem abaixo disso.
const MAX_ANEXO_CHARS = 950_000

export interface Anexo {
  tipo: 'image' | 'pdf'
  nome: string
  dados: string // data URL
  tamanho: number
}

export interface EventoHistorico {
  status_novo: StatusReembolso
  por_uid: string
  por_nome: string
  papel: string
  em: string
  motivo?: string
}

export interface Reembolso {
  id: string
  solicitante_uid: string
  solicitante_nome: string
  solicitante_email: string
  centro_custo: string
  data_despesa: string
  categoria: string
  descricao: string
  valor: number
  status: StatusReembolso
  tem_anexo: boolean
  anexo_tipo: 'image' | 'pdf' | null
  anexo_nome: string | null
  historico: EventoHistorico[]
  criado_em: string
  atualizado_em: string
}

// -------------------------------------------------------------
// Anexo: comprime imagem no cliente; PDF entra como está (com teto).
// -------------------------------------------------------------
function lerComoDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Não consegui ler o arquivo.'))
    r.readAsDataURL(file)
  })
}

async function comprimirImagem(file: File): Promise<string> {
  const url = await lerComoDataURL(file)
  const img = document.createElement('img')
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = () => rej(new Error('Imagem inválida.'))
    img.src = url
  })
  // Reduz a maior dimensão e a qualidade até caber no limite.
  for (const maxDim of [1600, 1280, 1024, 800, 640]) {
    const escala = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * escala))
    const h = Math.max(1, Math.round(img.height * escala))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) break
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    for (const q of [0.82, 0.7, 0.6, 0.5, 0.4]) {
      const out = canvas.toDataURL('image/jpeg', q)
      if (out.length <= MAX_ANEXO_CHARS) return out
    }
  }
  throw new Error('A imagem ficou grande demais mesmo após a compressão. Tente uma foto menor.')
}

/** Prepara o comprovante (foto ou PDF) para gravar. Lança erro se inválido. */
export async function prepararAnexo(file: File): Promise<Anexo> {
  const nome = file.name || 'comprovante'
  const ehPdf = file.type === 'application/pdf' || /\.pdf$/i.test(nome)
  const ehImg = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic)$/i.test(nome)
  if (!ehPdf && !ehImg) throw new Error('O comprovante precisa ser uma imagem (foto) ou um PDF.')

  if (ehPdf) {
    const dados = await lerComoDataURL(file)
    if (dados.length > MAX_ANEXO_CHARS) {
      throw new Error('Este PDF é muito grande. Reduza para cerca de 700 KB (ou envie uma foto do comprovante).')
    }
    return { tipo: 'pdf', nome, dados, tamanho: dados.length }
  }
  const dados = await comprimirImagem(file)
  return { tipo: 'image', nome, dados, tamanho: dados.length }
}

// -------------------------------------------------------------
// Criar solicitação
// -------------------------------------------------------------
export async function criarReembolso(
  dados: {
    centro_custo: string
    data_despesa: string
    categoria: string
    descricao: string
    valor: number
  },
  anexo: Anexo,
  perfil: Perfil,
) {
  const u = auth().currentUser
  if (!u) throw new Error('Entre para solicitar um reembolso.')
  const valor = Number(dados.valor)
  if (!(valor > 0)) throw new Error('Informe um valor maior que zero.')
  if (!dados.centro_custo) throw new Error('Selecione o centro de custo.')
  if (!dados.data_despesa) throw new Error('Informe a data da despesa.')
  if (!dados.categoria) throw new Error('Escolha a categoria da despesa.')
  if (String(dados.descricao ?? '').trim().length < 3) throw new Error('Descreva o motivo da despesa.')
  if (!anexo) throw new Error('Anexe o comprovante (foto ou PDF).')

  const agora = new Date().toISOString()
  const status = statusInicial(perfil.papeis)

  const ref = await addDoc(collection(db(), 'reembolsos'), {
    solicitante_uid: u.uid,
    solicitante_nome: perfil.nome || u.email || '',
    solicitante_email: perfil.email || u.email || '',
    centro_custo: dados.centro_custo,
    data_despesa: dados.data_despesa,
    categoria: dados.categoria,
    descricao: String(dados.descricao).trim(),
    valor,
    status,
    tem_anexo: true,
    anexo_tipo: anexo.tipo,
    anexo_nome: anexo.nome,
    historico: [
      { status_novo: status, por_uid: u.uid, por_nome: perfil.nome || '', papel: 'solicitante', em: agora },
    ],
    criado_em: agora,
    atualizado_em: agora,
  })

  // Anexo num doc separado, com o MESMO id do reembolso.
  await setDoc(doc(db(), 'reembolso_anexos', ref.id), {
    solicitante_uid: u.uid,
    tipo: anexo.tipo,
    nome: anexo.nome,
    dados: anexo.dados,
    tamanho: anexo.tamanho,
    criado_em: agora,
  })

  await registrarLog('reembolso_solicitado', `${dados.categoria} · ${valor}`)
  return { id: ref.id, status }
}

// -------------------------------------------------------------
// Leitura
// -------------------------------------------------------------
function mapear(d: any): Reembolso {
  return { id: d.id, ...(d.data ? d.data() : d) } as Reembolso
}

/** As solicitações do próprio usuário logado. */
export async function listarMinhas(): Promise<Reembolso[]> {
  const u = auth().currentUser
  if (!u) return []
  const snap = await getDocs(query(collection(db(), 'reembolsos'), where('solicitante_uid', '==', u.uid)))
  return snap.docs.map(mapear).sort((a, b) => (b.criado_em ?? '').localeCompare(a.criado_em ?? ''))
}

/**
 * Reembolsos que este perfil PODE VER, para aprovação/painel:
 *  - master/financeiro: todos;
 *  - gestor: só os do próprio centro de custo.
 * (Colaborador puro usa listarMinhas.)
 */
export async function listarParaGestao(perfil: Perfil): Promise<Reembolso[]> {
  const veTodos = perfil.papeis.includes('master') || perfil.papeis.includes('financeiro')
  let snap
  if (veTodos) {
    snap = await getDocs(collection(db(), 'reembolsos'))
  } else if (perfil.papeis.includes('gestor') && perfil.centro_custo) {
    snap = await getDocs(query(collection(db(), 'reembolsos'), where('centro_custo', '==', perfil.centro_custo)))
  } else {
    return []
  }
  return snap.docs.map(mapear).sort((a, b) => (b.criado_em ?? '').localeCompare(a.criado_em ?? ''))
}

/** Baixa o anexo (data URL) sob demanda, só quando alguém abre o detalhe. */
export async function getAnexo(id: string): Promise<Anexo | null> {
  const snap = await getDoc(doc(db(), 'reembolso_anexos', id)).catch(() => null)
  if (!snap || !snap.exists()) return null
  const d = snap.data() as any
  return { tipo: d.tipo, nome: d.nome, dados: d.dados, tamanho: d.tamanho ?? 0 }
}

// -------------------------------------------------------------
// Aprovar / Recusar
// -------------------------------------------------------------
async function decidir(id: string, perfil: Perfil, aprovar: boolean, motivo?: string) {
  const u = auth().currentUser
  if (!u) throw new Error('Sua sessão expirou. Entre novamente.')
  const ref = doc(db(), 'reembolsos', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Solicitação não encontrada.')
  const r = mapear(snap)

  if (r.solicitante_uid === u.uid && !perfil.papeis.includes('master')) {
    throw new Error('Você não pode aprovar a sua própria solicitação.')
  }
  const papelEtapa = papelDaEtapa(r.status)
  if (!papelEtapa) throw new Error('Esta solicitação já foi finalizada.')

  // Confere se este perfil responde por esta etapa.
  const ehMaster = perfil.papeis.includes('master')
  const podeGestor = r.status === 'pendente_gestor' && perfil.papeis.includes('gestor') && mesmoCentro(perfil.centro_custo, r.centro_custo)
  const podeMasterEtapa = r.status === 'pendente_master' && ehMaster
  const podeFin = r.status === 'pendente_financeiro' && perfil.papeis.includes('financeiro')
  if (!(ehMaster || podeGestor || podeMasterEtapa || podeFin)) {
    throw new Error('Você não tem permissão para decidir nesta etapa.')
  }

  const agora = new Date().toISOString()
  const novoStatus: StatusReembolso = aprovar ? proximoStatus(r.status) : 'recusado'
  const evento: EventoHistorico = {
    status_novo: novoStatus,
    por_uid: u.uid,
    por_nome: perfil.nome || u.email || '',
    papel: papelEtapa,
    em: agora,
    ...(motivo ? { motivo: String(motivo).trim() } : {}),
  }

  await updateDoc(ref, {
    status: novoStatus,
    historico: [...(r.historico ?? []), evento],
    atualizado_em: agora,
  })
  await registrarLog(aprovar ? 'reembolso_aprovado' : 'reembolso_recusado', `${id} → ${novoStatus}`)
  return { status: novoStatus }
}

export function aprovarReembolso(id: string, perfil: Perfil) {
  return decidir(id, perfil, true)
}

export function recusarReembolso(id: string, perfil: Perfil, motivo: string) {
  const m = String(motivo ?? '').trim()
  if (m.length < 3) throw new Error('Escreva o motivo da recusa.')
  return decidir(id, perfil, false, m)
}
