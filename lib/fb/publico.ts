'use client'

// =============================================================
// Operações públicas no Firestore (colaborador, sem login).
// =============================================================
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db, auth } from '../firebase'

export const REACOES = [
  { chave: 'curtir', emoji: '👍', rotulo: 'Curtir' },
  { chave: 'amei', emoji: '❤️', rotulo: 'Amei' },
  { chave: 'parabens', emoji: '👏', rotulo: 'Parabéns' },
  { chave: 'apoio', emoji: '🙌', rotulo: 'Apoio' },
] as const
const CHAVES_REACAO = REACOES.map((r) => r.chave) as readonly string[]

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const CONFIG_PADRAO = {
  empresa_nome: 'Soulan Recursos Humanos',
  canal_mensagem:
    'Este é um canal seguro. Sua manifestação será analisada pela equipe de Gente & Cultura e você receberá um retorno.',
  min_grupo: 5,
}

export async function getConfig() {
  const snap = await getDoc(doc(db(), 'config', 'geral'))
  return snap.exists() ? { ...CONFIG_PADRAO, ...snap.data() } : CONFIG_PADRAO
}

/** Áreas/setores da Soulan — usadas quando nenhuma área foi cadastrada
 *  em Configurações. Também alimentam os recortes por área no painel ADM. */
export const AREAS_PADRAO = [
  'Comercial Soulan',
  'Marketing',
  'Administrativo/Financeiro',
  'Suporte e Dados',
  'Thomas',
  'Atração & Seleção',
  'Diretoria',
  'Gente & Cultura/Cadastro e Suprimentos',
]

export async function getAreas(): Promise<string[]> {
  try {
    // Só filtro de igualdade (sem orderBy) para não exigir índice composto;
    // a ordenação é feita no cliente.
    const snap = await getDocs(query(collection(db(), 'areas'), where('ativa', '==', true)))
    const nomes = snap.docs
      .map((d) => d.data() as { nome?: string; ordem?: number })
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .map((d) => d.nome ?? '')
      .filter(Boolean)
    return nomes.length > 0 ? nomes : AREAS_PADRAO
  } catch {
    // Qualquer falha (ex.: índice ausente, offline) → usa a lista padrão.
    return AREAS_PADRAO
  }
}

/** Itens publicados no mural. */
export async function getMural(qtd = 100) {
  const q = query(
    collection(db(), 'mural'),
    where('publicado', '==', true),
    orderBy('data', 'desc'),
    limit(qtd),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any)
}

/** Pesquisas abertas (para a home). */
export async function getPesquisasAbertas() {
  const q = query(collection(db(), 'pesquisas'), where('status', '==', 'aberta'))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as any)
    .sort((a, b) => (b.criado_em ?? '').localeCompare(a.criado_em ?? ''))
}

/** Pesquisa pelo slug (seções e perguntas vêm embutidas no documento). */
export async function getPesquisaPorSlug(slug: string) {
  const q = query(collection(db(), 'pesquisas'), where('slug', '==', slug), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as any
}

// -------------------------------------------------------------
// Envio de manifestação (canal)
// -------------------------------------------------------------
export async function enviarManifestacao(p: {
  tipo: string
  titulo: string
  descricao: string
  nome: string
  email: string
  area: string
  anonima: boolean
}) {
  const tipo = String(p.tipo ?? '')
  const titulo = String(p.titulo ?? '').trim()
  const descricao = String(p.descricao ?? '').trim()
  const nome = String(p.nome ?? '').trim()
  const email = String(p.email ?? '').trim().toLowerCase()
  const area = String(p.area ?? '').trim()
  const anonima = p.anonima === true

  const TIPOS = ['contribuicao', 'sugestao', 'ideia', 'melhoria', 'reconhecimento']
  if (!TIPOS.includes(tipo)) throw new Error('Escolha o tipo da sua manifestação.')
  // Identificação é OPCIONAL: só valida nome/e-mail em envio identificado.
  if (!anonima) {
    if (nome.length < 3 || !nome.includes(' ')) throw new Error('Informe o nome completo, com sobrenome.')
    if (!EMAIL_RE.test(email)) throw new Error('Informe um e-mail válido.')
  }
  // Área é SEMPRE obrigatória — é ela que alimenta os dashboards por setor.
  if (!area) throw new Error('Selecione a sua área ou setor.')
  if (titulo.length < 4 || titulo.length > 160) throw new Error('O título precisa ter de 4 a 160 caracteres.')
  if (descricao.length < 15 || descricao.length > 5000)
    throw new Error('A descrição precisa ter de 15 a 5.000 caracteres.')

  const agora = new Date().toISOString()
  await addDoc(collection(db(), 'manifestacoes'), {
    tipo,
    titulo,
    descricao,
    area,
    nome: anonima ? null : nome,
    email: anonima ? null : email,
    anonima,
    status: 'recebida',
    prioridade: 'media',
    responsavel: null,
    resposta_publica: null,
    publicar_no_mural: false,
    criado_em: agora,
    atualizado_em: agora,
    analisada_em: null,
    implementada_em: null,
    updates: [
      {
        status_novo: 'recebida',
        mensagem: 'Manifestação recebida. Ela entrou na fila de análise da equipe de Gente & Cultura.',
        autor: 'Sistema',
        visivel_ao_colaborador: true,
        criado_em: agora,
      },
    ],
  })
  return { anonima }
}

// -------------------------------------------------------------
// Envio de resposta de pesquisa
// -------------------------------------------------------------
async function hashEmail(email: string, pesquisaId: string): Promise<string> {
  const dados = new TextEncoder().encode(`${pesquisaId}:${email.trim().toLowerCase()}`)
  const buf = await crypto.subtle.digest('SHA-256', dados)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function enviarResposta(p: {
  slug: string
  pesquisaId: string
  identificacao: string
  email: string
  respostas: Record<string, unknown>
  perguntas: any[]
}) {
  const email = String(p.email ?? '').trim().toLowerCase()
  const respostas = p.respostas ?? {}
  const lista = p.perguntas ?? []

  const precisaEmail = p.identificacao !== 'anonima'
  if (precisaEmail && !EMAIL_RE.test(email)) throw new Error('Informe um e-mail válido.')

  for (const q of lista) {
    if (!q.obrigatoria) continue
    const v = respostas[q.id]
    const vazio = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
    if (vazio) throw new Error('Ainda faltam perguntas obrigatórias sem resposta.')
  }

  // Trava de duplicata: cria um doc cujo ID é o hash. A regra só permite
  // criar uma vez — a segunda tentativa é recusada (já respondeu).
  if (precisaEmail) {
    const h = await hashEmail(email, p.pesquisaId)
    try {
      await setDoc(doc(db(), 'pesquisas', p.pesquisaId, 'dedup', h), {
        criado_em: new Date().toISOString(),
      })
    } catch {
      throw new Error('Este e-mail já respondeu esta pesquisa. Cada pessoa responde uma vez só.')
    }
  }

  const porSeg = (chave: string) => {
    const q = lista.find((x) => x.segmentacao === chave)
    const v = q ? respostas[q.id] : null
    return typeof v === 'string' && v ? v : null
  }

  // As respostas ficam embutidas (mapa perguntaId -> valor) num doc só.
  const valores: Record<string, unknown> = {}
  for (const q of lista) {
    const v = respostas[q.id]
    if (v === undefined || v === null || v === '') continue
    if (['likert5', 'enps', 'nota10'].includes(q.tipo)) {
      const n = Number(v)
      if (Number.isFinite(n)) valores[q.id] = n
    } else {
      valores[q.id] = v
    }
  }

  await addDoc(collection(db(), 'pesquisas', p.pesquisaId, 'respostas'), {
    area: porSeg('area'),
    cargo: porSeg('cargo'),
    tempo_casa: porSeg('tempo_casa'),
    modelo_trabalho: porSeg('modelo_trabalho'),
    valores,
    enviada_em: new Date().toISOString(),
  })
  return { ok: true }
}

// -------------------------------------------------------------
// Mural (posts): reconhecimentos aprovados + "Gente Informa"
// -------------------------------------------------------------
/** Posts publicados, ordenados do mais novo ao mais antigo. */
export async function getPostsMural() {
  const q = query(collection(db(), 'posts'), where('publicado', '==', true))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as any)
    .sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''))
}

/**
 * Reação por emoji — exige estar logado (funcionário/admin). Uma reação por
 * pessoa: clicar de novo no mesmo emoji desfaz; clicar em outro, troca.
 * O total fica no contador do post; a identidade fica na subcoleção `reacoes`.
 */
export async function reagir(postId: string, chave: string, autor: { nome: string; email: string }) {
  if (!CHAVES_REACAO.includes(chave)) throw new Error('Reação inválida.')
  const u = auth().currentUser
  if (!u) throw new Error('Entre como funcionário para reagir.')
  const refDoc = doc(db(), 'posts', postId, 'reacoes', u.uid)
  const snap = await getDoc(refDoc)
  const anterior = snap.exists() ? ((snap.data().emoji as string) ?? null) : null
  const postRef = doc(db(), 'posts', postId)

  if (anterior === chave) {
    await deleteDoc(refDoc)
    await updateDoc(postRef, { [`reacoes.${chave}`]: increment(-1) })
    return { atual: null as string | null }
  }

  await setDoc(refDoc, {
    emoji: chave,
    nome: autor.nome ?? '',
    email: autor.email ?? u.email ?? '',
    em: new Date().toISOString(),
  })
  const updates: Record<string, unknown> = { [`reacoes.${chave}`]: increment(1) }
  if (anterior) updates[`reacoes.${anterior}`] = increment(-1)
  await updateDoc(postRef, updates)
  return { atual: chave as string | null }
}

/** Reação atual do usuário logado neste post (para destacar), ou null. */
export async function getMinhaReacao(postId: string): Promise<string | null> {
  const u = auth().currentUser
  if (!u) return null
  const snap = await getDoc(doc(db(), 'posts', postId, 'reacoes', u.uid)).catch(() => null)
  return snap && snap.exists() ? ((snap.data().emoji as string) ?? null) : null
}

/** Comentários já aprovados de um post. */
export async function getComentarios(postId: string) {
  const q = query(collection(db(), 'posts', postId, 'comentarios'), where('aprovado', '==', true))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as any)
    .sort((a, b) => (a.criado_em ?? '').localeCompare(b.criado_em ?? ''))
}

/** Envia um comentário IDENTIFICADO — entra pendente de aprovação do admin. */
export async function enviarComentario(postId: string, texto: string, autor: { nome: string; email: string }) {
  const t = String(texto ?? '').trim()
  if (t.length < 2) throw new Error('Escreva o seu comentário.')
  if (t.length > 800) throw new Error('Comentário muito longo (máximo 800 caracteres).')
  const u = auth().currentUser
  if (!u) throw new Error('Entre como funcionário para comentar.')
  await addDoc(collection(db(), 'posts', postId, 'comentarios'), {
    texto: t,
    nome: autor.nome ?? '',
    email: autor.email ?? u.email ?? '',
    uid: u.uid,
    aprovado: false,
    criado_em: new Date().toISOString(),
  })
  return { ok: true }
}
