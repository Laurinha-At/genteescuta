'use client'

// =============================================================
// Seção "Qual solicitação você deseja realizar?" (orientações).
// Guardado em `orientacao_solicitacoes/{id}`. Público lê; o admin de
// conteúdo gerencia. A visibilidade por item é respeitada NA CONSULTA
// (o colaborador comum não recebe os itens 'gestores_admin').
// =============================================================
import { collection, doc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { registrarLog } from './usuarios'
import type { Conta } from './usuarios'

export type Visibilidade = 'todos' | 'gestores_admin'

export interface OrientacaoDoc {
  id: string
  ordem: number
  emoji: string
  titulo: string
  email: string
  assunto: string
  /** Rótulos dos campos do corpo (pré-preenchidos no e-mail). */
  corpo: string[]
  /** Passos de "como pedir". */
  passos: string[]
  /** Observação opcional (aparece como "Atenção:"). */
  observacao: string
  /** Documento opcional (caminho em public/docs enquanto não há Storage). */
  doc_rotulo: string
  doc_href: string
  doc_instrucao: string
  visibilidade: Visibilidade
  ativo: boolean
}

export const COLECAO = 'orientacao_solicitacoes'

// Papéis que enxergam os itens 'gestores_admin': gestor OU admin
// (Administrador, ADM Principal, ADM Master). Usa os valores exatos de PerfilId.
export function podeVerRestritos(conta: Conta | null): boolean {
  return !!conta && conta.ativo && ['gestor', 'adm', 'adm_principal', 'adm_master'].includes(conta.perfil)
}

// Seed inicial: os 6 itens atuais, sem perder nada. Admissão Interna e
// Movimentação Interna ficam restritas a gestores/admins; os outros, todos.
export const ORIENTACOES_SEED: OrientacaoDoc[] = [
  {
    id: 'uber',
    ordem: 1,
    emoji: '🚗',
    titulo: 'Cadastro de Uber',
    email: 'fabiana@soulan.com.br',
    assunto: 'Cadastro Uber',
    corpo: ['Nome completo:', 'Área/centro de custo:', 'Finalidade do uso:'],
    observacao: 'Coloque o seu gestor em cópia (CC). Ele precisa estar ciente e aprovar antes de seguir.',
    doc_rotulo: '', doc_href: '', doc_instrucao: '',
    passos: [
      'Clique em "Escrever e-mail": ele já abre com o assunto e os campos prontos.',
      'Preencha nome completo, área/centro de custo e finalidade do uso.',
      'Coloque o seu gestor em cópia (CC) para aprovação.',
      'Envie o e-mail.',
    ],
    visibilidade: 'todos',
    ativo: true,
  },
  {
    id: 'admissao-interna',
    ordem: 2,
    emoji: '👤',
    titulo: 'Admissão Interna',
    email: 'gentecultura@soulan.com.br',
    assunto: 'Admissão Interna',
    corpo: [],
    observacao: '',
    doc_rotulo: 'Baixar formulário de admissão',
    doc_href: '/docs/formulario-nova-admissao.docx',
    doc_instrucao: 'Preencha o formulário e anexe ao e-mail.',
    passos: [
      'Baixe o formulário de admissão no botão acima.',
      'Preencha todos os campos do formulário.',
      'Clique em "Escrever e-mail" e anexe o formulário preenchido.',
      'Envie o e-mail.',
    ],
    visibilidade: 'gestores_admin',
    ativo: true,
  },
  {
    id: 'movimentacao-interna',
    ordem: 3,
    emoji: '🔄',
    titulo: 'Movimentação Interna',
    email: 'gentecultura@soulan.com.br',
    assunto: 'Movimentação Interna',
    corpo: [],
    observacao: '',
    doc_rotulo: 'Baixar formulário de movimentação',
    doc_href: '/docs/formulario-movimentacao-interna.docx',
    doc_instrucao: 'Preencha o formulário e anexe ao e-mail.',
    passos: [
      'Baixe o formulário de movimentação no botão acima.',
      'Preencha todos os campos do formulário.',
      'Clique em "Escrever e-mail" e anexe o formulário preenchido.',
      'Envie o e-mail.',
    ],
    visibilidade: 'gestores_admin',
    ativo: true,
  },
  {
    id: 'convenio',
    ordem: 4,
    emoji: '🏥',
    titulo: 'Convênio Médico',
    email: 'beneficios@soulan.com.br',
    assunto: 'Convênio Médico',
    corpo: ['Nome:', 'Centro de custo:', 'Tipo (cadastro, valores, inclusão de dependente, 2ª via, dúvida de cobertura):'],
    observacao: '',
    doc_rotulo: '', doc_href: '', doc_instrucao: '',
    passos: [
      'Clique em "Escrever e-mail": ele já abre com o assunto e os campos prontos.',
      'Preencha nome, centro de custo e o tipo da solicitação.',
      'Envie o e-mail.',
    ],
    visibilidade: 'todos',
    ativo: true,
  },
  {
    id: 'pagamentos',
    ordem: 5,
    emoji: '💰',
    titulo: 'Pagamentos / Salários',
    email: 'folha@soulan.com.br',
    assunto: 'Salário referente ao mês de ',
    corpo: ['Nome:', 'Matrícula:', 'Mês de referência:', 'Descrição:'],
    observacao: '',
    doc_rotulo: '', doc_href: '', doc_instrucao: '',
    passos: [
      'Clique em "Escrever e-mail" e complete o mês de referência no assunto.',
      'Preencha nome, matrícula, mês de referência e a descrição.',
      'Envie o e-mail.',
    ],
    visibilidade: 'todos',
    ativo: true,
  },
  {
    id: 'vr-va-vt',
    ordem: 6,
    emoji: '🍽️',
    titulo: 'VR, VA e VT',
    email: 'beneficios@soulan.com.br',
    assunto: 'VR / VA / VT',
    corpo: ['Nome:', 'Tipo (alteração cadastral, de residência ou valor errado):', 'Descrição:'],
    observacao: '',
    doc_rotulo: '', doc_href: '', doc_instrucao: '',
    passos: [
      'Clique em "Escrever e-mail": ele já abre com o assunto e os campos prontos.',
      'Preencha nome, o tipo e a descrição.',
      'Envie o e-mail.',
    ],
    visibilidade: 'todos',
    ativo: true,
  },
]

function normaliza(d: Record<string, unknown>, id: string): OrientacaoDoc {
  const strArr = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)) : [])
  return {
    id,
    ordem: typeof d.ordem === 'number' ? d.ordem : 0,
    emoji: String(d.emoji ?? ''),
    titulo: String(d.titulo ?? ''),
    email: String(d.email ?? ''),
    assunto: String(d.assunto ?? ''),
    corpo: strArr(d.corpo),
    passos: strArr(d.passos),
    observacao: String(d.observacao ?? ''),
    doc_rotulo: String(d.doc_rotulo ?? ''),
    doc_href: String(d.doc_href ?? ''),
    doc_instrucao: String(d.doc_instrucao ?? ''),
    visibilidade: d.visibilidade === 'gestores_admin' ? 'gestores_admin' : 'todos',
    ativo: d.ativo !== false,
  }
}

/** Itens visíveis para a tela pública, já filtrados por papel NA CONSULTA. */
export async function listarOrientacoesVisiveis(verRestritos: boolean): Promise<OrientacaoDoc[]> {
  const col = collection(db(), COLECAO)
  const q = verRestritos
    ? query(col, where('ativo', '==', true))
    : query(col, where('ativo', '==', true), where('visibilidade', '==', 'todos'))
  const snap = await getDocs(q).catch(() => null)
  if (!snap || snap.empty) {
    // Ainda não semeado: usa o seed, respeitando visibilidade/ativo.
    return ORIENTACOES_SEED
      .filter((o) => o.ativo && (verRestritos || o.visibilidade === 'todos'))
      .sort((a, b) => a.ordem - b.ordem)
  }
  return snap.docs.map((d) => normaliza(d.data() as Record<string, unknown>, d.id)).sort((a, b) => a.ordem - b.ordem)
}

/** Todos os itens (para o admin). */
export async function listarOrientacoes(): Promise<OrientacaoDoc[]> {
  const snap = await getDocs(collection(db(), COLECAO)).catch(() => null)
  if (!snap) return []
  return snap.docs.map((d) => normaliza(d.data() as Record<string, unknown>, d.id)).sort((a, b) => a.ordem - b.ordem)
}

/** Semeia os 6 itens iniciais quando a coleção está vazia. */
export async function semearOrientacoes(): Promise<void> {
  await Promise.all(ORIENTACOES_SEED.map((o) => salvarOrientacao(o)))
  await registrarLog('orientacoes_seed', `${ORIENTACOES_SEED.length} itens`)
}

export async function salvarOrientacao(o: OrientacaoDoc): Promise<void> {
  const { id, ...dados } = o
  await setDoc(doc(db(), COLECAO, id), dados)
}

export async function excluirOrientacao(id: string): Promise<void> {
  await deleteDoc(doc(db(), COLECAO, id))
}

export function novoIdOrientacao(): string {
  return 'o_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function orientacaoVazia(ordem: number): OrientacaoDoc {
  return {
    id: novoIdOrientacao(), ordem, emoji: '📝', titulo: '', email: '', assunto: '',
    corpo: [], passos: [], observacao: '', doc_rotulo: '', doc_href: '', doc_instrucao: '',
    visibilidade: 'todos', ativo: true,
  }
}
