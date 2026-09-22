import type { Opcao, PerguntaTipo } from './types'

/**
 * Instrumento de avaliação de fatores de risco psicossocial no trabalho.
 *
 * Estruturado para atender ao inventário de riscos psicossociais que a NR-1
 * passou a exigir no PGR (Portaria MTE nº 1.419/2024). As dimensões seguem os
 * agrupamentos consagrados na literatura de saúde ocupacional (COPSOQ III,
 * ISTAS21 e HSE Management Standards), adaptados ao contexto brasileiro.
 *
 * Este questionário é um instrumento de levantamento. Ele não substitui a
 * avaliação e as medidas de controle conduzidas pelo SESMT ou por profissional
 * habilitado — ele alimenta essa avaliação com dados.
 */

export const ESCALA_FREQUENCIA: Opcao[] = [
  { valor: 1, rotulo: 'Nunca' },
  { valor: 2, rotulo: 'Raramente' },
  { valor: 3, rotulo: 'Às vezes' },
  { valor: 4, rotulo: 'Frequentemente' },
  { valor: 5, rotulo: 'Sempre' },
]

export const ESCALA_CONCORDANCIA: Opcao[] = [
  { valor: 1, rotulo: 'Discordo totalmente' },
  { valor: 2, rotulo: 'Discordo em parte' },
  { valor: 3, rotulo: 'Neutro' },
  { valor: 4, rotulo: 'Concordo em parte' },
  { valor: 5, rotulo: 'Concordo totalmente' },
]

export interface PerguntaTemplate {
  enunciado: string
  ajuda?: string
  tipo?: PerguntaTipo
  opcoes?: Opcao[]
  /** Item protetivo: nota alta significa MENOS risco. */
  invertida?: boolean
  /** Assédio, violência, discriminação: qualquer ocorrência gera alerta. */
  critica?: boolean
  obrigatoria?: boolean
  segmentacao?: string
  escala?: 'frequencia' | 'concordancia'
}

export interface SecaoTemplate {
  titulo: string
  descricao?: string
  /** Chave usada para agrupar as notas no painel. Seções sem dimensão não pontuam. */
  dimensao?: string
  perguntas: PerguntaTemplate[]
}

// ---------------------------------------------------------------
// Perfil — usado para os recortes do painel, nunca para identificar
// ---------------------------------------------------------------
export const OPCOES_TEMPO_CASA: Opcao[] = [
  { valor: 'ate_6m', rotulo: 'Menos de 6 meses' },
  { valor: '6m_2a', rotulo: 'De 6 meses a 2 anos' },
  { valor: '2a_5a', rotulo: 'De 2 a 5 anos' },
  { valor: '5a_10a', rotulo: 'De 5 a 10 anos' },
  { valor: 'mais_10a', rotulo: 'Mais de 10 anos' },
]

export const OPCOES_CARGO: Opcao[] = [
  { valor: 'operacional', rotulo: 'Operacional / Técnico' },
  { valor: 'analista', rotulo: 'Analista / Especialista' },
  { valor: 'coordenacao', rotulo: 'Coordenação / Supervisão' },
  { valor: 'gerencia', rotulo: 'Gerência' },
  { valor: 'diretoria', rotulo: 'Diretoria' },
]

export const OPCOES_MODELO: Opcao[] = [
  { valor: 'presencial', rotulo: 'Presencial' },
  { valor: 'hibrido', rotulo: 'Híbrido' },
  { valor: 'remoto', rotulo: 'Remoto' },
]

// ---------------------------------------------------------------
// As 12 dimensões de risco psicossocial
// ---------------------------------------------------------------
export const DIMENSOES_NR1: SecaoTemplate[] = [
  {
    titulo: 'Demandas e ritmo de trabalho',
    dimensao: 'demandas_ritmo',
    descricao: 'Sobre o volume de trabalho e o tempo disponível para dar conta dele.',
    perguntas: [
      { enunciado: 'Preciso trabalhar em ritmo acelerado para dar conta das minhas tarefas.' },
      { enunciado: 'Meu trabalho se acumula porque não consigo concluir tudo dentro do prazo.' },
      { enunciado: 'Preciso estender minha jornada, levar trabalho para casa ou abrir mão de pausas para cumprir as demandas.' },
      { enunciado: 'Tenho tempo suficiente para realizar minhas tarefas com a qualidade que elas exigem.', invertida: true },
      { enunciado: 'As metas que me são atribuídas são possíveis de alcançar.', invertida: true, escala: 'concordancia' },
    ],
  },
  {
    titulo: 'Demandas cognitivas e emocionais',
    dimensao: 'demandas_cognitivas',
    descricao: 'Sobre o esforço mental e emocional que o trabalho exige de você.',
    perguntas: [
      { enunciado: 'Meu trabalho exige atenção constante, e um erro meu teria consequências sérias.' },
      { enunciado: 'Meu trabalho me expõe a situações emocionalmente desgastantes.' },
      { enunciado: 'Preciso esconder o que realmente sinto ao lidar com clientes, colegas ou gestores.' },
      { enunciado: 'Lido com pessoas em situação de sofrimento, conflito ou agressividade.' },
    ],
  },
  {
    titulo: 'Autonomia e controle sobre o trabalho',
    dimensao: 'autonomia',
    descricao: 'Sobre o quanto você pode decidir a respeito do próprio trabalho.',
    perguntas: [
      { enunciado: 'Posso decidir como organizar e executar minhas tarefas.', invertida: true },
      { enunciado: 'Tenho influência sobre as decisões que afetam a minha rotina de trabalho.', invertida: true },
      { enunciado: 'Consigo fazer uma pausa, ir ao banheiro ou beber água quando preciso.', invertida: true },
      { enunciado: 'Posso opinar sobre os prazos e as metas que me são atribuídos.', invertida: true },
    ],
  },
  {
    titulo: 'Clareza de papel e previsibilidade',
    dimensao: 'clareza',
    descricao: 'Sobre saber o que se espera de você e o que vem pela frente.',
    perguntas: [
      { enunciado: 'Sei exatamente o que é esperado de mim no meu trabalho.', invertida: true, escala: 'concordancia' },
      { enunciado: 'Recebo com antecedência as informações de que preciso para fazer bem o meu trabalho.', invertida: true },
      { enunciado: 'Recebo ordens ou orientações contraditórias de pessoas diferentes.' },
      { enunciado: 'Sou informado(a) sobre mudanças importantes antes que elas aconteçam.', invertida: true },
      { enunciado: 'Preciso realizar tarefas que considero desnecessárias ou que poderiam ser feitas de outra forma.' },
    ],
  },
  {
    titulo: 'Apoio e qualidade da liderança',
    dimensao: 'lideranca',
    descricao: 'Sobre a sua relação com quem lidera você diretamente.',
    perguntas: [
      { enunciado: 'Meu gestor direto me dá apoio quando eu preciso.', invertida: true },
      { enunciado: 'Meu gestor direto trata a equipe com respeito.', invertida: true },
      { enunciado: 'Meu gestor percebe quando alguém da equipe está sobrecarregado e age a respeito.', invertida: true },
      { enunciado: 'Recebo retorno (feedback) sobre a qualidade do meu trabalho.', invertida: true },
      { enunciado: 'Sinto-me à vontade para dizer ao meu gestor que discordo de algo.', invertida: true, escala: 'concordancia' },
    ],
  },
  {
    titulo: 'Relações e clima na equipe',
    dimensao: 'relacoes',
    descricao: 'Sobre a convivência com as pessoas ao seu redor.',
    perguntas: [
      { enunciado: 'Existe um clima de cooperação entre as pessoas da minha equipe.', invertida: true },
      { enunciado: 'Recebo ajuda dos meus colegas quando preciso.', invertida: true },
      { enunciado: 'Presencio conflitos ou disputas frequentes no meu ambiente de trabalho.' },
      { enunciado: 'Sinto que faço parte do grupo.', invertida: true, escala: 'concordancia' },
    ],
  },
  {
    titulo: 'Reconhecimento e desenvolvimento',
    dimensao: 'reconhecimento',
    descricao: 'Sobre o retorno que você recebe pelo que entrega.',
    perguntas: [
      { enunciado: 'Meu esforço e minha dedicação são reconhecidos pela empresa.', invertida: true, escala: 'concordancia' },
      { enunciado: 'Considero justa a minha remuneração diante do que eu entrego.', invertida: true, escala: 'concordancia' },
      { enunciado: 'Tenho oportunidades reais de aprender e crescer aqui.', invertida: true, escala: 'concordancia' },
      { enunciado: 'Sinto que meu trabalho tem sentido e importa para alguém.', invertida: true, escala: 'concordancia' },
    ],
  },
  {
    titulo: 'Equilíbrio entre trabalho e vida pessoal',
    dimensao: 'equilibrio',
    descricao: 'Sobre a fronteira entre o trabalho e o resto da sua vida.',
    perguntas: [
      { enunciado: 'O trabalho interfere negativamente na minha vida pessoal e familiar.' },
      { enunciado: 'Sou acionado(a) fora do meu horário de trabalho por mensagens, ligações ou e-mails.' },
      { enunciado: 'Consigo me desconectar do trabalho durante o meu tempo de descanso.', invertida: true },
      { enunciado: 'Consigo tirar minhas férias e folgas sem prejuízo ou cobrança.', invertida: true },
    ],
  },
  {
    titulo: 'Assédio, violência e discriminação',
    dimensao: 'assedio',
    descricao:
      'Estas perguntas tratam de situações graves. Suas respostas são tratadas com sigilo. Se você estiver passando por algo assim, use também o canal Gente Cultura para relatar o caso.',
    perguntas: [
      { enunciado: 'Fui alvo de humilhação, constrangimento ou hostilidade no trabalho.', critica: true },
      { enunciado: 'Sofri ou presenciei assédio moral (perseguição, isolamento, exposição ao ridículo).', critica: true },
      { enunciado: 'Sofri ou presenciei assédio sexual (cantadas, insinuações, contato indesejado).', critica: true },
      { enunciado: 'Sofri ou presenciei discriminação por raça, gênero, idade, religião, orientação sexual ou deficiência.', critica: true },
      { enunciado: 'Sofri ameaças ou violência física no exercício do meu trabalho.', critica: true },
      { enunciado: 'Sei a quem recorrer e confio no canal de denúncia da empresa.', invertida: true, escala: 'concordancia' },
    ],
  },
  {
    titulo: 'Justiça organizacional e confiança',
    dimensao: 'justica',
    descricao: 'Sobre a forma como as decisões são tomadas e comunicadas.',
    perguntas: [
      { enunciado: 'As decisões da empresa são tomadas de forma justa e transparente.', invertida: true, escala: 'concordancia' },
      { enunciado: 'Confio nas informações que a empresa comunica.', invertida: true, escala: 'concordancia' },
      { enunciado: 'As regras valem igualmente para todo mundo, independente do cargo.', invertida: true, escala: 'concordancia' },
      { enunciado: 'Sinto insegurança quanto à manutenção do meu emprego.' },
    ],
  },
  {
    titulo: 'Saúde, estresse e esgotamento',
    dimensao: 'saude',
    descricao: 'Sobre como você tem se sentido nas últimas semanas.',
    perguntas: [
      { enunciado: 'Sinto-me esgotado(a) ao final da jornada de trabalho.' },
      { enunciado: 'Tenho dificuldade para dormir por causa de preocupações com o trabalho.' },
      { enunciado: 'Sinto irritabilidade, ansiedade ou tristeza que associo ao trabalho.' },
      { enunciado: 'Sinto dores físicas (cabeça, estômago, tensão muscular) que associo ao trabalho.' },
      { enunciado: 'Já pensei em sair da empresa por causa do desgaste emocional.' },
    ],
  },
  {
    titulo: 'Ambiente físico e condições de trabalho',
    dimensao: 'ambiente',
    descricao: 'Sobre o local e os recursos com que você trabalha.',
    perguntas: [
      { enunciado: 'O ambiente físico (ruído, temperatura, iluminação) atrapalha o meu trabalho.' },
      { enunciado: 'Meu posto de trabalho é adequado em mobiliário, equipamentos e postura.', invertida: true, escala: 'concordancia' },
      { enunciado: 'Tenho os equipamentos e recursos necessários para trabalhar com segurança.', invertida: true, escala: 'concordancia' },
    ],
  },
]

// ---------------------------------------------------------------
// Seções fixas: perfil (início), clima (fim) e campos abertos
// ---------------------------------------------------------------
export const SECAO_PERFIL: SecaoTemplate = {
  titulo: 'Sobre você',
  descricao:
    'Estas informações servem apenas para agrupar os resultados por área e entender onde estão os pontos de atenção. Nenhum resultado é divulgado em grupos pequenos demais para preservar o anonimato.',
  perguntas: [
    {
      enunciado: 'Em qual área você trabalha?',
      tipo: 'escolha_unica',
      segmentacao: 'area',
      obrigatoria: true,
    },
    {
      enunciado: 'Qual o seu nível de atuação?',
      tipo: 'escolha_unica',
      opcoes: OPCOES_CARGO,
      segmentacao: 'cargo',
      obrigatoria: true,
    },
    {
      enunciado: 'Há quanto tempo você trabalha aqui?',
      tipo: 'escolha_unica',
      opcoes: OPCOES_TEMPO_CASA,
      segmentacao: 'tempo_casa',
      obrigatoria: true,
    },
    {
      enunciado: 'Qual o seu modelo de trabalho?',
      tipo: 'escolha_unica',
      opcoes: OPCOES_MODELO,
      segmentacao: 'modelo_trabalho',
      obrigatoria: true,
    },
  ],
}

export const SECAO_CLIMA: SecaoTemplate = {
  titulo: 'Clima e satisfação',
  dimensao: 'clima',
  perguntas: [
    {
      enunciado:
        'Em uma escala de 0 a 10, o quanto você recomendaria esta empresa como um bom lugar para trabalhar?',
      ajuda: '0 significa "de jeito nenhum" e 10 significa "com certeza".',
      tipo: 'enps',
      obrigatoria: true,
    },
    {
      enunciado: 'De 0 a 10, qual é o seu nível de satisfação geral trabalhando aqui hoje?',
      tipo: 'nota10',
      obrigatoria: true,
    },
  ],
}

export const SECAO_ABERTA: SecaoTemplate = {
  titulo: 'Na sua palavra',
  descricao: 'Opcional, mas é aqui que costumam aparecer as melhores informações.',
  perguntas: [
    {
      enunciado: 'O que mais contribui para o seu bem-estar no trabalho hoje?',
      tipo: 'texto_longo',
      obrigatoria: false,
    },
    {
      enunciado: 'O que mais te desgasta? Se você pudesse mudar uma coisa, o que seria?',
      tipo: 'texto_longo',
      obrigatoria: false,
    },
  ],
}

/** Questionário NR-1 completo, na ordem em que o colaborador responde. */
export function montarTemplateNR1(): SecaoTemplate[] {
  return [SECAO_PERFIL, ...DIMENSOES_NR1, SECAO_CLIMA, SECAO_ABERTA]
}

/** Versão curta (pulso trimestral): 2 itens por dimensão + clima. */
export function montarTemplatePulso(): SecaoTemplate[] {
  const curtas = DIMENSOES_NR1.map((secao) => ({
    ...secao,
    perguntas: secao.dimensao === 'assedio' ? secao.perguntas : secao.perguntas.slice(0, 2),
  }))
  return [SECAO_PERFIL, ...curtas, SECAO_CLIMA, SECAO_ABERTA]
}

/** Só clima + eNPS, para medir com frequência sem cansar as pessoas. */
export function montarTemplateClima(): SecaoTemplate[] {
  return [SECAO_PERFIL, SECAO_CLIMA, SECAO_ABERTA]
}

// ===============================================================
// Template específico da Soulan — "NR-1 | Sua Voz, Nosso Compromisso"
// Exatamente os 13 blocos do arquivo pesquisa-nr1-soulan.md.
// Não inclui as dimensões Autonomia nem Assédio; o bloco Ambiente
// tem só 2 itens. Toda escala Likert aqui é de concordância
// (Discordo totalmente → Concordo totalmente).
// ===============================================================
export const OPCOES_AREA_SOULAN: Opcao[] = [
  { valor: 'Administrativo/Financeiro', rotulo: 'Administrativo/Financeiro' },
  { valor: 'Gente & Cultura/Cadastro e Suprimentos', rotulo: 'Gente & Cultura/Cadastro e Suprimentos' },
  { valor: 'Marketing', rotulo: 'Marketing' },
  { valor: 'Comercial Soulan', rotulo: 'Comercial Soulan' },
  { valor: 'Atração & Seleção', rotulo: 'Atração & Seleção' },
  { valor: 'Thomas', rotulo: 'Thomas' },
  { valor: 'Suporte e Dados', rotulo: 'Suporte e Dados' },
  { valor: 'outro', rotulo: 'Outros (especificar)' },
]

const SECAO_PERFIL_SOULAN: SecaoTemplate = {
  titulo: 'Sobre você',
  descricao:
    'Estas informações servem apenas para agrupar os resultados por área e entender onde estão os pontos de atenção. Nenhum resultado é divulgado em grupos pequenos demais para preservar o anonimato.',
  perguntas: [
    { enunciado: 'Qual o seu nível de atuação?', tipo: 'escolha_unica', opcoes: OPCOES_CARGO, segmentacao: 'cargo', obrigatoria: true },
    { enunciado: 'Há quanto tempo você trabalha aqui?', tipo: 'escolha_unica', opcoes: OPCOES_TEMPO_CASA, segmentacao: 'tempo_casa', obrigatoria: true },
    { enunciado: 'Em qual área você trabalha?', tipo: 'escolha_unica', opcoes: OPCOES_AREA_SOULAN, segmentacao: 'area', obrigatoria: true },
    { enunciado: 'Qual o seu modelo de trabalho?', tipo: 'escolha_unica', opcoes: OPCOES_MODELO, segmentacao: 'modelo_trabalho', obrigatoria: true },
  ],
}

const c = 'concordancia' as const

export const DIMENSOES_SOULAN: SecaoTemplate[] = [
  {
    titulo: 'Demandas e ritmo de trabalho',
    dimensao: 'demandas_ritmo',
    descricao: 'Sobre o volume de trabalho e o tempo disponível para dar conta dele.',
    perguntas: [
      { enunciado: 'Preciso trabalhar em ritmo acelerado para dar conta das minhas tarefas.', escala: c },
      { enunciado: 'Meu trabalho se acumula porque não consigo concluir tudo dentro do prazo.', escala: c },
      { enunciado: 'Preciso estender minha jornada, levar trabalho para casa ou abrir mão de pausas para cumprir as demandas.', escala: c },
      { enunciado: 'Tenho tempo suficiente para realizar minhas tarefas com a qualidade que elas exigem.', invertida: true, escala: c },
      { enunciado: 'As metas que me são atribuídas são possíveis de alcançar.', invertida: true, escala: c },
    ],
  },
  {
    titulo: 'Demandas cognitivas e emocionais',
    dimensao: 'demandas_cognitivas',
    descricao: 'Sobre o esforço mental e emocional que o trabalho exige de você.',
    perguntas: [
      { enunciado: 'Meu trabalho exige atenção constante, e um erro meu teria consequências sérias.', escala: c },
      { enunciado: 'Meu trabalho me expõe a situações emocionalmente desgastantes.', escala: c },
      { enunciado: 'Preciso esconder o que realmente sinto ao lidar com clientes, colegas ou gestores.', escala: c },
      { enunciado: 'Lido com pessoas em situação de sofrimento, conflito ou agressividade.', escala: c },
    ],
  },
  {
    titulo: 'Clareza nas Atividades e Expectativas',
    dimensao: 'clareza',
    descricao: 'Sobre saber o que se espera de você e o que vem pela frente.',
    perguntas: [
      { enunciado: 'Sei exatamente o que é esperado de mim no meu trabalho.', invertida: true, escala: c },
      { enunciado: 'Recebo com antecedência as informações de que preciso para fazer bem o meu trabalho.', invertida: true, escala: c },
      { enunciado: 'Recebo ordens ou orientações contraditórias de pessoas diferentes.', escala: c },
      { enunciado: 'Sou informado(a) sobre mudanças importantes antes que elas aconteçam.', invertida: true, escala: c },
      { enunciado: 'Preciso realizar tarefas que considero desnecessárias ou que poderiam ser feitas de outra forma.', escala: c },
    ],
  },
  {
    titulo: 'Apoio e qualidade da liderança',
    dimensao: 'lideranca',
    descricao: 'Sobre a sua relação com quem lidera você diretamente.',
    perguntas: [
      { enunciado: 'Meu gestor direto me dá apoio quando eu preciso.', invertida: true, escala: c },
      { enunciado: 'Meu gestor direto trata a equipe com respeito.', invertida: true, escala: c },
      { enunciado: 'Meu gestor percebe quando alguém da equipe está sobrecarregado e age a respeito.', invertida: true, escala: c },
      { enunciado: 'Recebo retorno (feedback) sobre a qualidade do meu trabalho.', invertida: true, escala: c },
      { enunciado: 'Sinto-me à vontade para dizer ao meu gestor que discordo de algo.', invertida: true, escala: c },
    ],
  },
  {
    titulo: 'Relações e clima na equipe',
    dimensao: 'relacoes',
    descricao: 'Sobre a convivência com as pessoas ao seu redor.',
    perguntas: [
      { enunciado: 'Existe um clima de cooperação entre as pessoas da minha equipe.', invertida: true, escala: c },
      { enunciado: 'Recebo ajuda dos meus colegas quando preciso.', invertida: true, escala: c },
      { enunciado: 'Presencio conflitos ou disputas frequentes no meu ambiente de trabalho.', escala: c },
      { enunciado: 'Sinto que faço parte do grupo.', invertida: true, escala: c },
    ],
  },
  {
    titulo: 'Reconhecimento e desenvolvimento',
    dimensao: 'reconhecimento',
    descricao: 'Sobre o retorno que você recebe pelo que entrega.',
    perguntas: [
      { enunciado: 'Meu esforço e minha dedicação são reconhecidos pela empresa.', invertida: true, escala: c },
      { enunciado: 'Considero justa a minha remuneração diante do que eu entrego.', invertida: true, escala: c },
      { enunciado: 'Tenho oportunidades reais de aprender e crescer aqui.', invertida: true, escala: c },
      { enunciado: 'Sinto que meu trabalho tem sentido e importa para alguém.', invertida: true, escala: c },
    ],
  },
  {
    titulo: 'Equilíbrio entre trabalho e vida pessoal',
    dimensao: 'equilibrio',
    descricao: 'Sobre a fronteira entre o trabalho e o resto da sua vida.',
    perguntas: [
      { enunciado: 'O trabalho interfere negativamente na minha vida pessoal e familiar.', escala: c },
      { enunciado: 'Sou acionado(a) fora do meu horário de trabalho por mensagens, ligações ou e-mails.', escala: c },
      { enunciado: 'Consigo me desconectar do trabalho durante o meu tempo de descanso.', invertida: true, escala: c },
      { enunciado: 'Consigo tirar minhas férias e folgas sem prejuízo ou cobrança.', invertida: true, escala: c },
    ],
  },
  {
    titulo: 'Justiça e transparência organizacional',
    dimensao: 'justica',
    descricao: 'Sobre a forma como as decisões são tomadas e comunicadas.',
    perguntas: [
      { enunciado: 'As decisões da empresa são tomadas de forma justa e transparente.', invertida: true, escala: c },
      { enunciado: 'Confio nas informações que a empresa comunica.', invertida: true, escala: c },
      { enunciado: 'As regras valem igualmente para todo mundo, independente do cargo.', invertida: true, escala: c },
      { enunciado: 'Sinto insegurança quanto à manutenção do meu emprego.', escala: c },
    ],
  },
  {
    titulo: 'Saúde, estresse e esgotamento',
    dimensao: 'saude',
    descricao: 'Sobre como você tem se sentido nas últimas semanas.',
    perguntas: [
      { enunciado: 'Sinto-me esgotado(a) ao final da jornada de trabalho.', escala: c },
      { enunciado: 'Tenho dificuldade para dormir por causa de preocupações com o trabalho.', escala: c },
      { enunciado: 'Sinto irritabilidade, ansiedade ou tristeza que associo ao trabalho.', escala: c },
      { enunciado: 'Sinto dores físicas (cabeça, estômago, tensão muscular) que associo ao trabalho.', escala: c },
      { enunciado: 'Já pensei em sair da empresa por causa do desgaste emocional.', escala: c },
    ],
  },
  {
    titulo: 'Ambiente físico e condições de trabalho',
    dimensao: 'ambiente',
    descricao: 'Sobre o local e os recursos com que você trabalha.',
    perguntas: [
      { enunciado: 'O ambiente físico (ruído, temperatura, iluminação) atrapalha o meu trabalho.', escala: c },
      { enunciado: 'Tenho os equipamentos e recursos necessários para trabalhar com segurança.', invertida: true, escala: c },
    ],
  },
]

/** "NR-1 | Sua Voz, Nosso Compromisso" — exatamente os 13 blocos do arquivo. */
export function montarTemplateSoulan(): SecaoTemplate[] {
  return [SECAO_PERFIL_SOULAN, ...DIMENSOES_SOULAN, SECAO_CLIMA, SECAO_ABERTA]
}

export const ROTULO_DIMENSAO: Record<string, string> = {
  demandas_ritmo: 'Demandas e ritmo',
  demandas_cognitivas: 'Demandas cognitivas e emocionais',
  autonomia: 'Autonomia e controle',
  clareza: 'Clareza e previsibilidade',
  lideranca: 'Apoio da liderança',
  relacoes: 'Relações e clima na equipe',
  reconhecimento: 'Reconhecimento e desenvolvimento',
  equilibrio: 'Trabalho e vida pessoal',
  assedio: 'Assédio, violência e discriminação',
  justica: 'Justiça e confiança',
  saude: 'Saúde, estresse e esgotamento',
  ambiente: 'Ambiente e condições',
  clima: 'Clima e satisfação',
}
