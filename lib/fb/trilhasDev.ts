'use client'

// =============================================================
// Trilhas de Desenvolvimento gamificadas — Fase 1 (sem loja).
//  - trilhas_dev/{id}: título, descrição, capa, pontos, ordem, ativa.
//  - trilhas_dev/{id}/atividades/{aid}: ordem, tipo, título, enunciado,
//    imagem e configuração conforme o tipo.
//  - trilhas_dev_progresso/{uid}: progresso por trilha + pontos totais.
// Colaborador logado lê as trilhas; só conteúdo (admin/RH) edita.
// =============================================================
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { registrarLog } from './usuarios'

export type TipoAtividade =
  | 'multipla_uma' | 'caixas' | 'suspensa' | 'curta' | 'paragrafo'
  | 'material' | 'quiz'
  // legados (ainda renderizam; não aparecem mais no seletor):
  | 'assinalar' | 'responder' | 'listar'

export const TIPO_LABEL: Record<TipoAtividade, string> = {
  multipla_uma: 'Múltipla escolha (uma resposta)',
  caixas: 'Caixas de seleção (várias respostas)',
  suspensa: 'Lista suspensa',
  curta: 'Resposta curta',
  paragrafo: 'Parágrafo',
  material: 'Material (só ler e seguir)',
  quiz: 'Quiz (perguntas com correção)',
  assinalar: 'Assinalar (legado)',
  responder: 'Responder (legado)',
  listar: 'Listar (legado)',
}

/** Tipos com lista de opções (sem correção: só coleta a resposta). */
export const TIPOS_COM_OPCOES: TipoAtividade[] = ['multipla_uma', 'caixas', 'suspensa']
/** Tipos oferecidos no seletor do admin (os legados ficam de fora). */
export const TIPOS_SELECIONAVEIS: TipoAtividade[] = ['multipla_uma', 'caixas', 'suspensa', 'curta', 'paragrafo', 'material', 'quiz']

/** Uma pergunta de quiz: múltipla escolha ou sim/não, com explicação. */
export interface PerguntaQuiz {
  texto: string
  imagem: string
  explicacao: string
  /** true = opções fixas Sim/Não; false = múltipla escolha. */
  simnao: boolean
  opcoes: string[]
  /** índice da opção correta. */
  correta: number
}

export function perguntaVazia(simnao = false): PerguntaQuiz {
  return {
    texto: '', imagem: '', explicacao: '', simnao,
    opcoes: simnao ? ['Sim', 'Não'] : ['', ''],
    correta: 0,
  }
}

export interface TrilhaDev {
  id: string
  titulo: string
  descricao: string
  capa: string
  pontos: number
  ordem: number
  ativa: boolean
}

export interface Atividade {
  id: string
  ordem: number
  tipo: TipoAtividade
  titulo: string
  enunciado: string
  imagem: string
  /** assinalar: opções e índices corretos. */
  opcoes: string[]
  corretas: number[]
  /** listar: rótulos dos campos a preencher. */
  campos: string[]
  /** quiz: perguntas com correção. */
  perguntas: PerguntaQuiz[]
  /** quiz: mínimo de acertos para concluir a atividade (0 = todas). */
  notaMinima: number
  /** materiais de apoio (valem para qualquer tipo): */
  link: string
  /** documento anexado (data URL) e o nome do arquivo. */
  arquivo: string
  arquivoNome: string
  /** vídeo para incorporar (YouTube, Vimeo ou Google Drive). */
  video: string
}

export interface ProgressoTrilha {
  concluidas: string[]
  concluida: boolean
  pontos: number
  respostas: Record<string, unknown>
}

export interface ProgressoUsuario {
  trilhas: Record<string, ProgressoTrilha>
  pontos_total: number
}

const COL = 'trilhas_dev'

// ---------------- Trilhas ----------------
function normTrilha(d: Record<string, unknown>, id: string): TrilhaDev {
  return {
    id,
    titulo: String(d.titulo ?? ''),
    descricao: String(d.descricao ?? ''),
    capa: String(d.capa ?? ''),
    pontos: typeof d.pontos === 'number' ? d.pontos : Number(d.pontos) || 0,
    ordem: typeof d.ordem === 'number' ? d.ordem : 0,
    ativa: d.ativa !== false,
  }
}

export async function listarTrilhasDev(): Promise<TrilhaDev[]> {
  const snap = await getDocs(collection(db(), COL)).catch(() => null)
  if (!snap) return []
  return snap.docs.map((d) => normTrilha(d.data() as Record<string, unknown>, d.id)).sort((a, b) => a.ordem - b.ordem)
}

export async function listarTrilhasDevAtivas(): Promise<TrilhaDev[]> {
  const snap = await getDocs(query(collection(db(), COL), where('ativa', '==', true))).catch(() => null)
  if (!snap) return []
  return snap.docs.map((d) => normTrilha(d.data() as Record<string, unknown>, d.id)).sort((a, b) => a.ordem - b.ordem)
}

export async function getTrilhaDev(id: string): Promise<TrilhaDev | null> {
  const snap = await getDoc(doc(db(), COL, id)).catch(() => null)
  if (!snap || !snap.exists()) return null
  return normTrilha(snap.data() as Record<string, unknown>, snap.id)
}

export async function salvarTrilhaDev(t: TrilhaDev): Promise<void> {
  await setDoc(doc(db(), COL, t.id), {
    titulo: String(t.titulo ?? '').trim(),
    descricao: String(t.descricao ?? '').trim(),
    capa: String(t.capa ?? '').trim(),
    pontos: Math.max(0, Math.round(Number(t.pontos) || 0)),
    ordem: t.ordem,
    ativa: !!t.ativa,
  })
  await registrarLog('trilha_dev_salvar', t.titulo)
}

export async function excluirTrilhaDev(id: string): Promise<void> {
  // Remove as atividades da subcoleção antes da trilha.
  const subs = await getDocs(collection(db(), COL, id, 'atividades')).catch(() => null)
  if (subs) await Promise.all(subs.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db(), COL, id))
}

export function novoIdTrilha(): string {
  return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
export function trilhaDevVazia(ordem: number): TrilhaDev {
  return { id: novoIdTrilha(), titulo: '', descricao: '', capa: '', pontos: 10, ordem, ativa: true }
}

// ---------------- Atividades ----------------
function normPerguntas(v: unknown): PerguntaQuiz[] {
  if (!Array.isArray(v)) return []
  return v.map((p) => {
    const o = (p ?? {}) as Record<string, unknown>
    const simnao = o.simnao === true
    const opcoes = Array.isArray(o.opcoes) ? o.opcoes.map((x) => String(x)) : (simnao ? ['Sim', 'Não'] : [])
    const correta = Number(o.correta)
    return {
      texto: String(o.texto ?? ''),
      imagem: String(o.imagem ?? ''),
      explicacao: String(o.explicacao ?? ''),
      simnao,
      opcoes,
      correta: Number.isFinite(correta) && correta >= 0 && correta < opcoes.length ? correta : 0,
    }
  })
}

const TIPOS_VALIDOS: TipoAtividade[] = ['multipla_uma', 'caixas', 'suspensa', 'curta', 'paragrafo', 'material', 'quiz', 'assinalar', 'responder', 'listar']

function normAtividade(d: Record<string, unknown>, id: string): Atividade {
  const tipo = TIPOS_VALIDOS.includes(d.tipo as TipoAtividade) ? (d.tipo as TipoAtividade) : 'curta'
  const strArr = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)) : [])
  const numArr = (v: unknown) => (Array.isArray(v) ? v.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [])
  return {
    id,
    ordem: typeof d.ordem === 'number' ? d.ordem : 0,
    tipo,
    titulo: String(d.titulo ?? ''),
    enunciado: String(d.enunciado ?? ''),
    imagem: String(d.imagem ?? ''),
    opcoes: strArr(d.opcoes),
    corretas: numArr(d.corretas),
    campos: strArr(d.campos),
    perguntas: normPerguntas(d.perguntas),
    notaMinima: typeof d.notaMinima === 'number' ? d.notaMinima : 0,
    link: String(d.link ?? ''),
    arquivo: String(d.arquivo ?? ''),
    arquivoNome: String(d.arquivoNome ?? ''),
    video: String(d.video ?? ''),
  }
}

export async function listarAtividades(trilhaId: string): Promise<Atividade[]> {
  const snap = await getDocs(collection(db(), COL, trilhaId, 'atividades')).catch(() => null)
  if (!snap) return []
  return snap.docs.map((d) => normAtividade(d.data() as Record<string, unknown>, d.id)).sort((a, b) => a.ordem - b.ordem)
}

export async function salvarAtividade(trilhaId: string, a: Atividade): Promise<void> {
  // Perguntas do quiz: limpa opções vazias e reposiciona o índice da correta.
  const perguntas = (a.perguntas ?? []).map((p) => {
    const simnao = !!p.simnao
    const opcoesBrutas = simnao ? ['Sim', 'Não'] : (p.opcoes ?? [])
    const mantidas: string[] = []
    let novaCorreta = 0
    opcoesBrutas.forEach((o, i) => {
      const txt = String(o ?? '').trim()
      if (simnao || txt) { if (i === p.correta) novaCorreta = mantidas.length; mantidas.push(simnao ? String(o) : txt) }
    })
    return {
      texto: String(p.texto ?? '').trim(),
      imagem: String(p.imagem ?? '').trim(),
      explicacao: String(p.explicacao ?? '').trim(),
      simnao,
      opcoes: mantidas,
      correta: Math.min(novaCorreta, Math.max(0, mantidas.length - 1)),
    }
  }).filter((p) => p.texto && p.opcoes.length >= 2)
  await setDoc(doc(db(), COL, trilhaId, 'atividades', a.id), {
    ordem: a.ordem,
    tipo: a.tipo,
    titulo: String(a.titulo ?? '').trim(),
    enunciado: String(a.enunciado ?? '').trim(),
    imagem: String(a.imagem ?? '').trim(),
    opcoes: (a.opcoes ?? []).map((s) => String(s).trim()).filter(Boolean),
    corretas: (a.corretas ?? []).filter((n) => Number.isFinite(n)),
    campos: (a.campos ?? []).map((s) => String(s).trim()).filter(Boolean),
    perguntas,
    notaMinima: Math.max(0, Math.round(Number(a.notaMinima) || 0)),
    link: String(a.link ?? '').trim(),
    arquivo: String(a.arquivo ?? '').trim(),
    arquivoNome: String(a.arquivoNome ?? '').trim(),
    video: String(a.video ?? '').trim(),
  })
}

export async function excluirAtividade(trilhaId: string, atividadeId: string): Promise<void> {
  await deleteDoc(doc(db(), COL, trilhaId, 'atividades', atividadeId))
}

export function novoIdAtividade(): string {
  return 'a_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
export function atividadeVazia(ordem: number, tipo: TipoAtividade = 'multipla_uma'): Atividade {
  const comOpcoes = TIPOS_COM_OPCOES.includes(tipo)
  return {
    id: novoIdAtividade(), ordem, tipo, titulo: '', enunciado: '', imagem: '',
    opcoes: comOpcoes ? ['', ''] : (tipo === 'assinalar' ? ['', ''] : []), corretas: [], campos: tipo === 'listar' ? [''] : [],
    perguntas: tipo === 'quiz' ? [perguntaVazia(false)] : [], notaMinima: 0,
    link: '', arquivo: '', arquivoNome: '', video: '',
  }
}

// ---------------- Semear a trilha de Onboarding (exemplo editável) ----------------
/**
 * Cria (ou atualiza) a trilha "Integração (Onboarding)" com as casas 1 a 4 do
 * documento, como PONTO DE PARTIDA para o RH editar. Idempotente: usa ids fixos,
 * então semear de novo não duplica. A casa 5 (caça-palavras) fica para a Fase 2.
 */
export async function semearOnboarding(): Promise<void> {
  const id = 't_onboarding'
  await setDoc(doc(db(), COL, id), {
    titulo: 'Integração (Onboarding)',
    descricao: 'Trilha de boas-vindas: manual, conferência de cadastro e acessos. Edite as perguntas conforme a Soulan.',
    capa: '', pontos: 200, ordem: 0, ativa: false,
  })
  const base = { imagem: '', opcoes: [], corretas: [], campos: [], perguntas: [], notaMinima: 0, link: '', arquivo: '', arquivoNome: '', video: '' }
  const casas: Atividade[] = [
    {
      ...base, id: 'a_onb_1', ordem: 1, tipo: 'material', titulo: 'Integração Institucional',
      enunciado: 'Boas-vindas! Leia o manual de integração para conhecer a Soulan. Cole aqui o link do manual (ou anexe o PDF) e depois clique em concluir.',
      link: '',
    },
    {
      ...base, id: 'a_onb_2', ordem: 2, tipo: 'quiz', titulo: 'Quiz do Manual',
      enunciado: 'Responda às perguntas sobre o manual. (Exemplo: adicione as suas 10 perguntas e ajuste a nota mínima.)',
      notaMinima: 1,
      perguntas: [{
        texto: 'Qual é a senha padrão do notebook e do celular corporativo?',
        imagem: '', explicacao: 'A senha padrão é soulan@ para os dois.', simnao: false,
        opcoes: ['soulan@', 'thomas@', 'soulan123', 'gentecultura@'], correta: 0,
      }],
    },
    {
      ...base, id: 'a_onb_3', ordem: 3, tipo: 'quiz', titulo: 'Conferência de Cadastro e Acessos',
      enunciado: 'Confirme cada item. Qualquer "Não" segura a conclusão: resolva com o RH antes de seguir.',
      notaMinima: 4,
      perguntas: [
        { texto: 'Seu cartão Flash (VR e VA) já está ativo?', imagem: '', explicacao: '', simnao: true, opcoes: ['Sim', 'Não'], correta: 0 },
        { texto: 'Você recebeu os equipamentos (notebook e celular)?', imagem: '', explicacao: '', simnao: true, opcoes: ['Sim', 'Não'], correta: 0 },
        { texto: 'Seu e-mail está no padrão da empresa?', imagem: '', explicacao: '', simnao: true, opcoes: ['Sim', 'Não'], correta: 0 },
        { texto: 'Seu WhatsApp corporativo está no padrão?', imagem: '', explicacao: '', simnao: true, opcoes: ['Sim', 'Não'], correta: 0 },
      ],
    },
    {
      ...base, id: 'a_onb_4', ordem: 4, tipo: 'responder', titulo: 'Conclusão',
      enunciado: 'Confirme que o seu cadastro e os seus acessos estão corretos. Escreva "Confirmado" para encerrar a integração.',
    },
  ]
  for (const c of casas) await salvarAtividade(id, c)
  await registrarLog('trilha_dev_semear', 'onboarding')
}

// ---------------- Progresso do usuário ----------------
const PROG = 'trilhas_dev_progresso'

export async function getProgressoUsuario(uid: string): Promise<ProgressoUsuario> {
  const snap = await getDoc(doc(db(), PROG, uid)).catch(() => null)
  if (!snap || !snap.exists()) return { trilhas: {}, pontos_total: 0 }
  const d = snap.data() as Record<string, unknown>
  const trilhas = (d.trilhas && typeof d.trilhas === 'object' ? d.trilhas : {}) as Record<string, ProgressoTrilha>
  return { trilhas, pontos_total: typeof d.pontos_total === 'number' ? d.pontos_total : 0 }
}

/**
 * Marca a atividade como concluída. Se a pessoa concluiu todas as atividades da
 * trilha, marca a trilha como concluída e credita os pontos. Recalcula o total
 * a partir das trilhas concluídas (idempotente: não credita em dobro).
 */
export async function concluirAtividade(
  uid: string,
  trilha: { id: string; pontos: number },
  atividadeId: string,
  totalAtividades: number,
  resposta?: unknown,
  pessoa?: { nome: string },
): Promise<{ progresso: ProgressoUsuario; creditou: boolean }> {
  const atual = await getProgressoUsuario(uid)
  const tr: ProgressoTrilha = atual.trilhas[trilha.id] ?? { concluidas: [], concluida: false, pontos: 0, respostas: {} }
  const concluidas = tr.concluidas.includes(atividadeId) ? tr.concluidas : [...tr.concluidas, atividadeId]
  const respostas = resposta !== undefined ? { ...(tr.respostas ?? {}), [atividadeId]: resposta } : (tr.respostas ?? {})

  let concluida = tr.concluida
  let pontos = tr.pontos
  let creditou = false
  if (!concluida && totalAtividades > 0 && concluidas.length >= totalAtividades) {
    concluida = true
    pontos = Math.max(0, Math.round(Number(trilha.pontos) || 0))
    creditou = true
  }

  const trilhas = { ...atual.trilhas, [trilha.id]: { concluidas, concluida, pontos, respostas } }
  const pontos_total = Object.values(trilhas).reduce((s, t) => s + (t.concluida ? (t.pontos || 0) : 0), 0)

  await setDoc(doc(db(), PROG, uid), { trilhas, pontos_total }, { merge: false })
  // Projeção pública para o ranking (nome + pontos). Best-effort: não quebra o fluxo.
  if (pessoa?.nome) {
    await setDoc(doc(db(), RANKING, uid), { nome: pessoa.nome, pontos: pontos_total, atualizado_em: new Date().toISOString() }, { merge: true }).catch(() => {})
  }
  return { progresso: { trilhas, pontos_total }, creditou }
}

// ---------------- Ranking (projeção pública: nome + pontos) ----------------
const RANKING = 'trilhas_dev_ranking'

export interface RankingItem { uid: string; nome: string; pontos: number }

/** Top do ranking por pontos (desc). Ordena no cliente para dispensar índice. */
export async function listarRankingTrilhas(limite = 20): Promise<RankingItem[]> {
  const snap = await getDocs(collection(db(), RANKING)).catch(() => null)
  if (!snap) return []
  return snap.docs
    .map((d) => {
      const x = d.data() as Record<string, unknown>
      return { uid: d.id, nome: String(x.nome ?? '').trim(), pontos: Number(x.pontos) || 0 }
    })
    .filter((r) => r.pontos > 0 && r.nome)
    .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome))
    .slice(0, limite)
}
