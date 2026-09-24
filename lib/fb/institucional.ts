'use client'

// =============================================================
// Textos institucionais (Sobre Nós e Missão/Visão/Valores), editáveis
// pelo painel. Guardados em `config/sobre` e `config/missao`. Público lê;
// só admin (Master) grava. Fallback para o conteúdo atual quando vazio.
// =============================================================
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { registrarLog } from './usuarios'

// -------- Sobre Nós --------
export type BlocoTipo = 'sub' | 'p'
export interface Bloco { tipo: BlocoTipo; texto: string }
export interface SobreConfig {
  titulo: string
  subtitulo: string
  blocos: Bloco[]
  destaque: string
  link_texto: string
  link_url: string
}

export const SOBRE_PADRAO: SobreConfig = {
  titulo: 'Gente Cultura',
  subtitulo: 'Informação, comunicação e conexão.',
  blocos: [
    { tipo: 'p', texto: 'O Gente Cultura é o canal interno da Soulan Recursos Humanos, criado para fortalecer a comunicação e aproximar a empresa de seus colaboradores.' },
    { tipo: 'p', texto: 'Neste espaço, você encontrará informações institucionais e administrativas, comunicados, novidades, benefícios, campanhas, ações de Gente & Cultura, treinamentos e outros conteúdos relevantes para o dia a dia na Soulan.' },
    { tipo: 'p', texto: 'O portal também é um espaço de participação. Aqui, você pode compartilhar sugestões, ideias, oportunidades de melhoria e reconhecimentos, contribuindo para o desenvolvimento contínuo do nosso ambiente de trabalho.' },
    { tipo: 'sub', texto: 'Um canal para informar, ouvir e conectar.' },
    { tipo: 'p', texto: 'O Gente Cultura reúne, em um só lugar, informações importantes para você acompanhar o que acontece na Soulan e participar ativamente da nossa cultura.' },
    { tipo: 'sub', texto: 'O jeito Soulan de transformar o trabalho' },
    { tipo: 'p', texto: 'Nosso propósito orienta a forma como construímos nossas relações e experiências no ambiente de trabalho:' },
  ],
  destaque: 'Eu te ajudo a trabalhar mais feliz.',
  link_texto: 'Conheça a Soulan',
  link_url: 'https://soulan.com.br/',
}

// -------- Missão, Visão e Valores --------
export interface Valor { nome: string; desc: string }
export interface MissaoConfig {
  visao: string
  missao: string
  intro_valores: string
  valores: Valor[]
}

export const MISSAO_PADRAO: MissaoConfig = {
  visao: 'Nossa visão é ser reconhecida como a principal Consultoria de RH, Líder em Gestão de Pessoas. Isso significa que nos dedicamos a fornecer as melhores práticas e soluções que promovem o sucesso de nossos clientes e colaboradores.',
  missao: 'Nossa missão é oferecer produtos e serviços que apoiem a gestão de pessoas, buscando sempre a melhoria da performance e satisfação profissional. Queremos garantir que todos os membros de nossa equipe se sintam motivados e preparados para alcançar seus objetivos.',
  intro_valores: 'Para nós, ética é um valor tão fundamental que você inclusive já viu que temos um código inteiro só voltado a isso. Mas além dele, temos outros 4 valores que são essenciais no nosso dia a dia:',
  valores: [
    { nome: 'Trabalho Cooperativo', desc: 'Acreditamos no poder do trabalho colaborativo. Incentivamos uma abordagem que se concentra em ações realistas, autoconfiança e pensamento coletivo. Juntos, podemos alcançar resultados maiores do que alcançaríamos sozinhos.' },
    { nome: 'Atendimento ao Cliente', desc: 'O atendimento ao cliente é um dos pilares da nossa operação. Praticamos a escuta ativa e estamos sempre atentos a novas oportunidades dentro dos clientes, mantendo a flexibilidade necessária para adaptar nossas rotinas e entregar o melhor serviço.' },
    { nome: 'Inovação', desc: 'A inovação está no centro de nossa estratégia. Valorizamos a iniciativa na resolução de problemas e a proatividade na proposição de novas soluções. Buscamos constantemente melhorar nossos processos e nos adaptar às mudanças do mercado.' },
    { nome: 'Ímpeto por Excelência', desc: 'Comprometemo-nos com a excelência em tudo o que fazemos. Incentivamos a conscientização do papel de cada colaborador dentro da organização, o senso de responsabilidade e urgência, e um foco contínuo em medir, acompanhar e alcançar resultados.' },
  ],
}

// -------------------------------------------------------------
export async function getSobre(): Promise<SobreConfig> {
  const snap = await getDoc(doc(db(), 'config', 'sobre')).catch(() => null)
  if (!snap || !snap.exists()) return SOBRE_PADRAO
  const d = snap.data() as Partial<SobreConfig>
  return {
    titulo: d.titulo ?? SOBRE_PADRAO.titulo,
    subtitulo: d.subtitulo ?? SOBRE_PADRAO.subtitulo,
    blocos: Array.isArray(d.blocos) ? (d.blocos as Bloco[]) : SOBRE_PADRAO.blocos,
    destaque: d.destaque ?? SOBRE_PADRAO.destaque,
    link_texto: d.link_texto ?? SOBRE_PADRAO.link_texto,
    link_url: d.link_url ?? SOBRE_PADRAO.link_url,
  }
}

export async function salvarSobre(c: SobreConfig): Promise<void> {
  const limpo: SobreConfig = {
    titulo: String(c.titulo ?? '').trim(),
    subtitulo: String(c.subtitulo ?? '').trim(),
    blocos: (c.blocos ?? [])
      .map((b) => ({ tipo: b.tipo === 'sub' ? 'sub' as const : 'p' as const, texto: String(b.texto ?? '').trim() }))
      .filter((b) => b.texto),
    destaque: String(c.destaque ?? '').trim(),
    link_texto: String(c.link_texto ?? '').trim(),
    link_url: String(c.link_url ?? '').trim(),
  }
  await setDoc(doc(db(), 'config', 'sobre'), { ...limpo, atualizado_em: new Date().toISOString() }, { merge: true })
  await registrarLog('sobre_editar', `${limpo.blocos.length} blocos`)
}

export async function getMissao(): Promise<MissaoConfig> {
  const snap = await getDoc(doc(db(), 'config', 'missao')).catch(() => null)
  if (!snap || !snap.exists()) return MISSAO_PADRAO
  const d = snap.data() as Partial<MissaoConfig>
  return {
    visao: d.visao ?? MISSAO_PADRAO.visao,
    missao: d.missao ?? MISSAO_PADRAO.missao,
    intro_valores: d.intro_valores ?? MISSAO_PADRAO.intro_valores,
    valores: Array.isArray(d.valores) ? (d.valores as Valor[]) : MISSAO_PADRAO.valores,
  }
}

export async function salvarMissao(c: MissaoConfig): Promise<void> {
  const limpo: MissaoConfig = {
    visao: String(c.visao ?? '').trim(),
    missao: String(c.missao ?? '').trim(),
    intro_valores: String(c.intro_valores ?? '').trim(),
    valores: (c.valores ?? [])
      .map((v) => ({ nome: String(v.nome ?? '').trim(), desc: String(v.desc ?? '').trim() }))
      .filter((v) => v.nome || v.desc),
  }
  await setDoc(doc(db(), 'config', 'missao'), { ...limpo, atualizado_em: new Date().toISOString() }, { merge: true })
  await registrarLog('missao_editar', `${limpo.valores.length} valores`)
}
