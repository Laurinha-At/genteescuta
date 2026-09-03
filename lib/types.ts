export type PesquisaStatus = 'rascunho' | 'aberta' | 'encerrada'
export type Identificacao = 'identificada' | 'confidencial' | 'anonima'
export type PerguntaTipo =
  | 'likert5'
  | 'enps'
  | 'nota10'
  | 'escolha_unica'
  | 'escolha_multipla'
  | 'texto'
  | 'texto_longo'
  | 'sim_nao'

export type ManifestacaoTipo =
  | 'sugestao'
  | 'reclamacao'
  | 'ideia'
  | 'melhoria'
  | 'reconhecimento'

export type ManifestacaoStatus =
  | 'recebida'
  | 'em_analise'
  | 'analisada'
  | 'em_implementacao'
  | 'implementada'
  | 'nao_aplicavel'
  | 'arquivada'

export type Prioridade = 'baixa' | 'media' | 'alta'
export type FaixaRisco = 'baixo' | 'moderado' | 'alto' | 'critico'

export interface Opcao {
  valor: number | string
  rotulo: string
}

export interface Pesquisa {
  id: string
  slug: string
  titulo: string
  descricao: string | null
  mensagem_abertura: string | null
  tipo: 'nr1' | 'clima' | 'personalizada'
  status: PesquisaStatus
  identificacao: Identificacao
  min_grupo: number
  publico_alvo: number | null
  abre_em: string | null
  fecha_em: string | null
  criado_em: string
  atualizado_em: string
}

export interface Secao {
  id: string
  pesquisa_id: string
  titulo: string
  descricao: string | null
  dimensao: string | null
  ordem: number
}

export interface Pergunta {
  id: string
  pesquisa_id: string
  secao_id: string | null
  enunciado: string
  ajuda: string | null
  tipo: PerguntaTipo
  opcoes: Opcao[] | null
  obrigatoria: boolean
  invertida: boolean
  critica: boolean
  peso: number
  segmentacao: string | null
  ordem: number
}

export interface Resposta {
  id: string
  pesquisa_id: string
  email: string | null
  email_hash: string | null
  area: string | null
  cargo: string | null
  tempo_casa: string | null
  modelo_trabalho: string | null
  enviada_em: string
}

export interface ItemResposta {
  id: string
  resposta_id: string
  pergunta_id: string
  valor_num: number | null
  valor_texto: string | null
  valor_json: unknown | null
}

export interface Manifestacao {
  id: string
  tipo: ManifestacaoTipo
  titulo: string
  descricao: string
  nome: string | null
  email: string | null
  area: string
  anonima: boolean
  status: ManifestacaoStatus
  prioridade: Prioridade
  responsavel: string | null
  resposta_publica: string | null
  publicar_no_mural: boolean
  criado_em: string
  atualizado_em: string
  analisada_em: string | null
  implementada_em: string | null
}

export interface ManifestacaoUpdate {
  id: string
  manifestacao_id: string
  status_anterior: ManifestacaoStatus | null
  status_novo: ManifestacaoStatus | null
  mensagem: string | null
  autor: string | null
  visivel_ao_colaborador: boolean
  criado_em: string
}

export interface Admin {
  id: string
  email: string
  nome: string
  ativo: boolean
  criado_em: string
}

export interface Config {
  id: number
  empresa_nome: string
  canal_mensagem: string
  min_grupo: number
  atualizado_em: string
}

// ---------------------------------------------------------------
// Rótulos em português usados na interface inteira
// ---------------------------------------------------------------
export const TIPO_MANIFESTACAO_LABEL: Record<ManifestacaoTipo, string> = {
  sugestao: 'Sugestão',
  reclamacao: 'Reclamação',
  ideia: 'Ideia',
  melhoria: 'Melhoria',
  reconhecimento: 'Reconhecimento',
}

export const TIPO_MANIFESTACAO_DESC: Record<ManifestacaoTipo, string> = {
  sugestao: 'Algo que você propõe para a empresa considerar',
  reclamacao: 'Algo que está errado ou te incomoda no dia a dia',
  ideia: 'Uma proposta nova, ainda em formato de ideia',
  melhoria: 'Um processo que existe e pode funcionar melhor',
  reconhecimento: 'Alguém ou algum time que merece ser reconhecido',
}

export const STATUS_MANIFESTACAO_LABEL: Record<ManifestacaoStatus, string> = {
  recebida: 'Recebida',
  em_analise: 'Em análise',
  analisada: 'Analisada',
  em_implementacao: 'Em implementação',
  implementada: 'Implementada',
  nao_aplicavel: 'Não aplicável',
  arquivada: 'Arquivada',
}

/** Ordem do funil mostrado no painel. */
export const FUNIL_STATUS: ManifestacaoStatus[] = [
  'recebida',
  'em_analise',
  'analisada',
  'em_implementacao',
  'implementada',
]

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

export const FAIXA_LABEL: Record<FaixaRisco, string> = {
  baixo: 'Risco baixo',
  moderado: 'Risco moderado',
  alto: 'Risco alto',
  critico: 'Risco crítico',
}
