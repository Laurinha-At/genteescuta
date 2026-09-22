// =============================================================
// Solicitação de Reembolso — domínio (papéis, centros de custo,
// categorias, status e regras de fluxo). Funções PURAS, sem Firestore
// nem React, para ficarem fáceis de testar e reusar na interface.
// =============================================================

// -------- Papéis de acesso (uma pessoa pode ter VÁRIOS) --------
export type Papel = 'master' | 'gestor' | 'financeiro' | 'colaborador'

export const PAPEIS: Papel[] = ['master', 'gestor', 'financeiro', 'colaborador']

export const PAPEL_LABEL: Record<Papel, string> = {
  master: 'Master Administrador',
  gestor: 'Gestor Aprovador',
  financeiro: 'Financeiro',
  colaborador: 'Colaborador',
}

export const PAPEL_DESC: Record<Papel, string> = {
  master: 'Controle geral: gerencia pessoas, aprova qualquer reembolso e faz tudo.',
  gestor: 'Aprova reembolsos da própria área (centro de custo) e visualiza os painéis. Só leitura + exportação.',
  financeiro: 'Dá a aprovação final (pagamento) dos reembolsos.',
  colaborador: 'Solicita reembolsos, faz manifestações e treinamentos.',
}

// -------- Centros de custo (= áreas da Soulan) --------
// Mantém a MESMA lista oficial usada nos dashboards (lib/fb/publico.ts).
export const CENTROS_CUSTO = [
  'Comercial Soulan',
  'Marketing',
  'Administrativo/Financeiro',
  'Suporte e Dados',
  'Thomas',
  'Atração & Seleção',
  'Diretoria',
  'Gente & Cultura/Cadastro e Suprimentos',
] as const

// -------- Categorias de despesa (lista controlada) --------
export const CATEGORIAS = [
  'Alimentação',
  'Transporte / Deslocamento',
  'Combustível',
  'Quilometragem (KM)',
  'Hospedagem',
  'Material de escritório',
  'Equipamento',
  'Software / Assinatura',
  'Evento / Treinamento',
  'Saúde',
  'Outros',
] as const

// -------- Status do reembolso --------
export type StatusReembolso =
  | 'pendente_gestor'
  | 'pendente_master'
  | 'pendente_financeiro'
  | 'aprovado'
  | 'recusado'

export const STATUS_LABEL: Record<StatusReembolso, string> = {
  pendente_gestor: 'Aguardando gestor',
  pendente_master: 'Aguardando Master',
  pendente_financeiro: 'Aguardando Financeiro',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
}

/** Faixa de cor para o Chip (reaproveita a paleta de risco da marca). */
export type FaixaChip = 'baixo' | 'moderado' | 'alto' | 'critico' | 'neutro'
export const STATUS_FAIXA: Record<StatusReembolso, FaixaChip> = {
  pendente_gestor: 'moderado',
  pendente_master: 'moderado',
  pendente_financeiro: 'alto',
  aprovado: 'baixo',
  recusado: 'critico',
}

// -------- Regras de fluxo --------
/**
 * Status inicial de uma solicitação, conforme QUEM está pedindo:
 *  - Gestor pedindo para si → vai direto ao Master (não aprova o próprio).
 *  - Master pedindo para si → vai direto ao Financeiro.
 *  - Colaborador (qualquer outro) → começa no gestor da área.
 */
export function statusInicial(papeis: string[]): StatusReembolso {
  if (papeis.includes('gestor')) return 'pendente_master'
  if (papeis.includes('master')) return 'pendente_financeiro'
  return 'pendente_gestor'
}

/** Para onde o pedido vai quando a etapa atual APROVA. */
export function proximoStatus(atual: StatusReembolso): StatusReembolso {
  if (atual === 'pendente_gestor') return 'pendente_financeiro'
  if (atual === 'pendente_master') return 'pendente_financeiro'
  if (atual === 'pendente_financeiro') return 'aprovado'
  return atual
}

/** Quem aprova a etapa atual (papel responsável). */
export function papelDaEtapa(atual: StatusReembolso): Papel | null {
  if (atual === 'pendente_gestor') return 'gestor'
  if (atual === 'pendente_master') return 'master'
  if (atual === 'pendente_financeiro') return 'financeiro'
  return null
}

export function estaPendente(s: StatusReembolso): boolean {
  return s === 'pendente_gestor' || s === 'pendente_master' || s === 'pendente_financeiro'
}

/**
 * Uma pessoa (com seus papéis e centro de custo) pode agir na etapa atual
 * de um reembolso? Master age em tudo; gestor só no próprio centro; financeiro
 * na etapa financeira. Nunca no próprio pedido (checado à parte pela tela).
 */
export function podeAprovar(
  status: StatusReembolso,
  papeis: string[],
  meuCentro: string,
  centroDoPedido: string,
): boolean {
  if (!estaPendente(status)) return false
  if (papeis.includes('master')) return true
  if (status === 'pendente_gestor') {
    return papeis.includes('gestor') && mesmoCentro(meuCentro, centroDoPedido)
  }
  if (status === 'pendente_master') return false // só master, tratado acima
  if (status === 'pendente_financeiro') return papeis.includes('financeiro')
  return false
}

/** Compara centros de custo ignorando acentos, caixa e "&" vs "e". */
export function mesmoCentro(a?: string | null, b?: string | null): boolean {
  return chaveCentro(a) === chaveCentro(b) && chaveCentro(a) !== ''
}
function chaveCentro(s?: string | null): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' e ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
}

export function formatBRL(v: number): string {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatData(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('pt-BR')
}
