// =============================================================
// Treinamento e Desenvolvimento — conteúdo migrado do 'Sou Hub'.
//
// As 4 trilhas (com etapas de leitura, quiz e caça-palavras) ficam
// AQUI como dados estáticos — nada de servidor. O progresso de cada
// pessoa é guardado no Firestore (lib/fb/treino.ts), respeitando o
// login: o funcionário Comum vê e faz; ninguém trapaceia porque a
// correção é simples e o que importa (progresso) é por usuário.
//
// Tipos de etapa: 'texto' (leitura), 'quiz' (múltipla escolha),
// 'caca' (caça-palavras com tabuleiro pré-gerado).
// =============================================================

export type TagTrilha = 'obrigatorio' | 'sugerido'

export interface EtapaBase {
  id: string
  type: 'texto' | 'quiz' | 'caca' | 'material'
  title: string
  pts: number
  coins: number
}
export interface EtapaTexto extends EtapaBase { type: 'texto'; content: string }
export interface EtapaQuiz extends EtapaBase { type: 'quiz'; q: string; opts: string[]; ans: number }
export interface EtapaMaterial extends EtapaBase { type: 'material'; url: string; content?: string; midia?: 'link' | 'video' }
export interface EtapaCaca extends EtapaBase {
  type: 'caca'
  intro: string
  palavras: string[]
  grid: string[][]
  posicoes: Record<string, [number, number][]>
}
export type Etapa = EtapaTexto | EtapaQuiz | EtapaMaterial | EtapaCaca

export interface Trilha {
  id: string
  title: string
  icon: string
  color: string
  tag: TagTrilha
  mins: number
  /** Áreas que enxergam a trilha; vazio = todas as áreas. */
  areas: string[]
  desc: string
  capa: string | null
  acts: Etapa[]
}

export const TRILHAS: Trilha[] = [
  {
    "id": "2b86c4ec2776",
    "title": "Trabalho em Equipe",
    "icon": "🤝",
    "color": "#2BC4A6",
    "tag": "obrigatorio",
    "mins": 14,
    "areas": [],
    "desc": "Aprimore suas habilidades de trabalho em equipe e descubra como isso impulsiona a produtividade das empresas.",
    "capa": "/treino/trilha-2b86c4ec2776.jpg",
    "acts": [
      {
        "id": "1924449ba646",
        "type": "texto",
        "title": "O que é trabalho em equipe?",
        "pts": 100,
        "coins": 10,
        "content": "Trabalho em equipe é a colaboração entre pessoas com habilidades complementares em torno de um objetivo comum. Diferente de um grupo, uma equipe compartilha responsabilidade pelos resultados.\n\nOs quatro pilares: comunicação clara, confiança mútua, papéis bem definidos e objetivo compartilhado."
      },
      {
        "id": "11699e7884ee",
        "type": "quiz",
        "title": "Quiz: conceitos essenciais",
        "pts": 150,
        "coins": 20,
        "q": "Qual é a principal diferença entre um grupo e uma equipe?",
        "opts": [
          "Equipe tem mais pessoas",
          "Equipe compartilha responsabilidade pelo resultado",
          "Grupo trabalha remotamente",
          "Não há diferença"
        ],
        "ans": 1
      },
      {
        "id": "daf6eab8cc23",
        "type": "texto",
        "title": "Benefícios para a empresa",
        "pts": 100,
        "coins": 10,
        "content": "Equipes eficazes reduzem retrabalho, aceleram a tomada de decisão e aumentam a retenção de talentos. Estudos apontam ganhos de até 25% em produtividade quando há clareza de papéis."
      },
      {
        "id": "fb0229b34952",
        "type": "quiz",
        "title": "Quiz: dinâmicas de grupo",
        "pts": 150,
        "coins": 20,
        "q": "Qual prática MAIS fortalece a confiança em uma equipe?",
        "opts": [
          "Competição interna por metas",
          "Feedback constante e transparente",
          "Reuniões mais longas",
          "Centralizar decisões no líder"
        ],
        "ans": 1
      },
      {
        "id": "b0b71ed217a2",
        "type": "quiz",
        "title": "Desafio final",
        "pts": 250,
        "coins": 50,
        "q": "Você percebe um conflito recorrente entre dois colegas. Qual a melhor primeira ação?",
        "opts": [
          "Ignorar, vai passar",
          "Comunicar ao RH imediatamente",
          "Conversar em particular com cada um para entender",
          "Discutir o caso na reunião geral"
        ],
        "ans": 2
      }
    ]
  },
  {
    "id": "5a8b70aa2fba",
    "title": "Técnicas de Persuasão",
    "icon": "💬",
    "color": "#6C3FC5",
    "tag": "sugerido",
    "mins": 20,
    "areas": [
      "Marketing",
      "Atração & Seleção",
      "Comercial Soulan",
      "Thomas",
      "Teamtailor"
    ],
    "desc": "Domine os gatilhos de influência ética para negociar melhor e engajar clientes e colegas.",
    "capa": null,
    "acts": [
      {
        "id": "63aa78204b01",
        "type": "texto",
        "title": "Os 6 princípios de Cialdini",
        "pts": 120,
        "coins": 15,
        "content": "Reciprocidade, compromisso e coerência, prova social, autoridade, afinidade e escassez. Cada um ativa um atalho mental de decisão.\n\nUsados de forma ética, aceleram acordos. Usados de forma manipuladora, destroem confiança."
      },
      {
        "id": "73b284992647",
        "type": "quiz",
        "title": "Quiz: prova social",
        "pts": 150,
        "coins": 20,
        "q": "\"Mais de 10 mil empresas já usam\" é um exemplo de qual princípio?",
        "opts": [
          "Escassez",
          "Prova social",
          "Autoridade",
          "Reciprocidade"
        ],
        "ans": 1
      },
      {
        "id": "f56b5e105d5e",
        "type": "texto",
        "title": "Escuta ativa na negociação",
        "pts": 120,
        "coins": 15,
        "content": "Antes de persuadir, entenda. Parafraseie o que ouviu, valide a emoção e só então apresente sua proposta ancorada no interesse do outro."
      },
      {
        "id": "9b7519e21299",
        "type": "quiz",
        "title": "Desafio final",
        "pts": 250,
        "coins": 50,
        "q": "O cliente diz \"está caro\". Qual resposta é mais persuasiva?",
        "opts": [
          "Posso dar 10% de desconto",
          "Caro comparado a quê? Me ajuda a entender",
          "Todo mundo acha no começo",
          "É o preço de mercado"
        ],
        "ans": 1
      }
    ]
  },
  {
    "id": "a4507e0268ee",
    "title": "5 Dinâmicas para Motivar Funcionários",
    "icon": "🎯",
    "color": "#F5365C",
    "tag": "sugerido",
    "mins": 12,
    "areas": [],
    "desc": "Dinâmicas práticas e prontas para aplicar com seu time e elevar o engajamento.",
    "capa": null,
    "acts": [
      {
        "id": "bf2e9f8c39d7",
        "type": "texto",
        "title": "Por que dinâmicas funcionam",
        "pts": 100,
        "coins": 10,
        "content": "Dinâmicas criam experiências compartilhadas. A memória emocional fixa o aprendizado muito mais que a exposição passiva de conteúdo."
      },
      {
        "id": "708755a75a27",
        "type": "texto",
        "title": "Dinâmica do elogio cruzado",
        "pts": 100,
        "coins": 10,
        "content": "Cada pessoa escreve uma qualidade profissional de quem está à sua direita. Leitura em voz alta. Tempo: 15 min. Efeito: reconhecimento e coesão imediatos."
      },
      {
        "id": "de0bcfeab440",
        "type": "quiz",
        "title": "Quiz: aplicação",
        "pts": 200,
        "coins": 30,
        "q": "Qual o maior erro ao conduzir uma dinâmica de equipe?",
        "opts": [
          "Ser curta demais",
          "Não fazer o fechamento conectando ao trabalho real",
          "Usar música",
          "Fazer em pé"
        ],
        "ans": 1
      }
    ]
  },
  {
    "id": "e32f1e13d4a5",
    "title": "Onboarding 1 · Bem-vindo ao Grupo Soulan + Thomas",
    "icon": "🚀",
    "color": "#2BC4A6",
    "tag": "obrigatorio",
    "mins": 12,
    "areas": [],
    "desc": "Sua primeira parada na plataforma. Conheça quem somos, nossa visão, missão e os valores que guiam o dia a dia.",
    "capa": "/treino/trilha-e32f1e13d4a5.jpg",
    "acts": [
      {
        "id": "2e8453bf0301",
        "type": "texto",
        "title": "Bem-vindo ao Grupo Soulan + Thomas!",
        "pts": 50,
        "coins": 0,
        "content": "🎉 Que bom ter você com a gente!\n\nEste onboarding foi criado a partir do Manual do Colaborador 2026 para orientar e apoiar você nos primeiros passos da sua jornada conosco.\n\nComo parte da nossa equipe, é essencial conhecer e compreender nossa missão, visão e valores a base de tudo o que fazemos e que direciona nossas escolhas, atitudes e a forma como trabalhamos.\n\nNossa Visão:\nSer reconhecida como a principal Consultoria de RH, líder em Gestão de Pessoas.\nPara isso, buscamos oferecer as melhores práticas e soluções em gestão de pessoas, contribuindo para o sucesso dos nossos clientes e para o desenvolvimento dos nossos colaboradores.\n\nNossa Missão:\nOferecer produtos e serviços que apoiem a gestão de pessoas, buscando sempre a melhoria da performance e da satisfação profissional.\n\n E os nossos valores?\nAgora queremos saber de você!\n\nDurante a nossa integração, você conheceu os valores que fazem parte da nossa cultura. Você consegue lembrar quais são? 🤔\n\nNas próximas etapas, vamos revisitar cada um deles e, ao final, você terá a oportunidade de conquistar sua primeira conquista no Sou Hub! 🏆\n\nPrepare-se para conhecer ainda mais sobre a nossa cultura. Vamos lá! 🚀"
      },
      {
        "id": "c44b1ad71ac2",
        "type": "quiz",
        "title": "Valores Fundamentais da Soulan",
        "pts": 180,
        "coins": 10,
        "q": "Quais são alguns dos nossos valores fundamentais?",
        "opts": [
          "Ética, Atendimento ao Cliente, Inovação e Ímpeto por Excelência.",
          "Inovação, Comunicação, Produtividade e Flexibilidade.",
          "Ética, Competitividade, Pontualidade e Liderança.",
          "Atendimento ao Cliente, Agilidade, Organização e Competitividade."
        ],
        "ans": 0
      },
      {
        "id": "1acaabea0fff",
        "type": "caca",
        "title": "Os valores que nos guiam",
        "pts": 100,
        "coins": 15,
        "intro": "Para nós, a ética é um valor tão fundamental que temos um código inteiro dedicado a ela. Além dele, temos outros 4 valores essenciais no nosso dia a dia:\n\n🤝 TRABALHO COOPERATIVO\nAcreditamos no poder do trabalho colaborativo. Incentivamos uma abordagem focada em ações realistas, autoconfiança e pensamento coletivo. Juntos, alcançamos resultados maiores do que alcançaríamos sozinhos.\n\n💬 ATENDIMENTO AO CLIENTE\nUm dos pilares da nossa operação. Praticamos a escuta ativa e estamos sempre atentos a novas oportunidades dentro dos clientes, mantendo a flexibilidade necessária para adaptar rotinas e entregar o melhor serviço.\n\n💡 INOVAÇÃO\nEstá no centro da nossa estratégia. Valorizamos a iniciativa na resolução de problemas e a proatividade na proposição de novas soluções. Buscamos constantemente melhorar processos e nos adaptar às mudanças do mercado.\n\n🚀 ÍMPETO POR EXCELÊNCIA\nComprometemo-nos com a excelência em tudo o que fazemos. Incentivamos a conscientização do papel de cada um dentro da organização, o senso de responsabilidade e urgência, e um foco contínuo em medir, acompanhar e alcançar resultados.",
        "palavras": [
          "ATENDIMENTO",
          "COOPERACAO",
          "EXCELENCIA",
          "INOVACAO",
          "CLIENTE",
          "ETICA"
        ],
        "grid": [
          [
            "U",
            "H",
            "K",
            "I",
            "T",
            "Z",
            "Y",
            "H",
            "U",
            "C",
            "C",
            "F",
            "U",
            "W"
          ],
          [
            "T",
            "S",
            "A",
            "M",
            "Q",
            "A",
            "P",
            "C",
            "O",
            "K",
            "T",
            "L",
            "K",
            "R"
          ],
          [
            "A",
            "G",
            "T",
            "M",
            "Q",
            "B",
            "Z",
            "O",
            "T",
            "C",
            "Q",
            "V",
            "M",
            "H"
          ],
          [
            "L",
            "V",
            "O",
            "J",
            "P",
            "N",
            "Z",
            "O",
            "N",
            "L",
            "Q",
            "T",
            "T",
            "N"
          ],
          [
            "C",
            "L",
            "I",
            "E",
            "N",
            "T",
            "E",
            "P",
            "E",
            "N",
            "E",
            "I",
            "W",
            "K"
          ],
          [
            "N",
            "P",
            "Q",
            "T",
            "F",
            "E",
            "U",
            "E",
            "M",
            "T",
            "X",
            "U",
            "S",
            "J"
          ],
          [
            "P",
            "J",
            "D",
            "F",
            "T",
            "N",
            "N",
            "R",
            "I",
            "P",
            "C",
            "W",
            "H",
            "R"
          ],
          [
            "W",
            "H",
            "A",
            "I",
            "F",
            "C",
            "D",
            "A",
            "D",
            "M",
            "E",
            "G",
            "X",
            "Y"
          ],
          [
            "U",
            "N",
            "C",
            "D",
            "L",
            "Y",
            "A",
            "C",
            "N",
            "C",
            "L",
            "K",
            "J",
            "K"
          ],
          [
            "U",
            "A",
            "L",
            "L",
            "Q",
            "F",
            "Y",
            "A",
            "E",
            "Q",
            "E",
            "A",
            "O",
            "R"
          ],
          [
            "Z",
            "Y",
            "A",
            "F",
            "A",
            "T",
            "E",
            "O",
            "T",
            "A",
            "N",
            "F",
            "L",
            "Q"
          ],
          [
            "O",
            "A",
            "C",
            "A",
            "V",
            "O",
            "N",
            "I",
            "A",
            "H",
            "C",
            "D",
            "N",
            "Z"
          ],
          [
            "G",
            "J",
            "G",
            "C",
            "G",
            "N",
            "A",
            "N",
            "H",
            "X",
            "I",
            "Y",
            "X",
            "A"
          ],
          [
            "V",
            "A",
            "T",
            "W",
            "Z",
            "I",
            "S",
            "O",
            "R",
            "Y",
            "A",
            "C",
            "S",
            "K"
          ]
        ],
        "posicoes": {
          "ATENDIMENTO": [
            [
              11,
              8
            ],
            [
              10,
              8
            ],
            [
              9,
              8
            ],
            [
              8,
              8
            ],
            [
              7,
              8
            ],
            [
              6,
              8
            ],
            [
              5,
              8
            ],
            [
              4,
              8
            ],
            [
              3,
              8
            ],
            [
              2,
              8
            ],
            [
              1,
              8
            ]
          ],
          "COOPERACAO": [
            [
              1,
              7
            ],
            [
              2,
              7
            ],
            [
              3,
              7
            ],
            [
              4,
              7
            ],
            [
              5,
              7
            ],
            [
              6,
              7
            ],
            [
              7,
              7
            ],
            [
              8,
              7
            ],
            [
              9,
              7
            ],
            [
              10,
              7
            ]
          ],
          "EXCELENCIA": [
            [
              4,
              10
            ],
            [
              5,
              10
            ],
            [
              6,
              10
            ],
            [
              7,
              10
            ],
            [
              8,
              10
            ],
            [
              9,
              10
            ],
            [
              10,
              10
            ],
            [
              11,
              10
            ],
            [
              12,
              10
            ],
            [
              13,
              10
            ]
          ],
          "INOVACAO": [
            [
              11,
              7
            ],
            [
              11,
              6
            ],
            [
              11,
              5
            ],
            [
              11,
              4
            ],
            [
              11,
              3
            ],
            [
              11,
              2
            ],
            [
              11,
              1
            ],
            [
              11,
              0
            ]
          ],
          "CLIENTE": [
            [
              4,
              0
            ],
            [
              4,
              1
            ],
            [
              4,
              2
            ],
            [
              4,
              3
            ],
            [
              4,
              4
            ],
            [
              4,
              5
            ],
            [
              4,
              6
            ]
          ],
          "ETICA": [
            [
              5,
              5
            ],
            [
              6,
              4
            ],
            [
              7,
              3
            ],
            [
              8,
              2
            ],
            [
              9,
              1
            ]
          ]
        }
      },
      {
        "id": "58e1cd8c4391",
        "type": "quiz",
        "title": "🧠 Teste seus conhecimentos!",
        "pts": 100,
        "coins": 10,
        "q": "As boas práticas no ambiente de trabalho são responsabilidade apenas da liderança. Por isso, cabe aos colaboradores apenas seguir as orientações recebidas, sem a necessidade de comunicar situações de risco, desperdícios, problemas de organização ou uso inadequado dos recursos da empresa.",
        "opts": [
          "VERDADEIRO",
          "FALSO"
        ],
        "ans": 1
      },
      {
        "id": "b86119b25b51",
        "type": "quiz",
        "title": "PONTO",
        "pts": 300,
        "coins": 20,
        "q": "Um colaborador percebeu que esqueceu de registrar sua entrada no início do expediente. Considerando as regras de controle de ponto da empresa, qual procedimento está correto?",
        "opts": [
          "A) Fazer uma retificação imediatamente no mesmo dia e, se houver alteração de horário, utilizar a opção “Retificação”.",
          "B) Aguardar para realizar a retificação em outro momento, lembrando que alterações de horário de trabalho devem ser feitas pela opção “Alteração”. Caso tenha um atestado, ele deve ser anexado ou enviado por e-mail em até 48 horas.",
          "C) Registrar novamente o ponto no mesmo dia e enviar o atestado somente no fechamento do mês.",
          "D) Solicitar à liderança que faça a marcação do ponto e enviar o atestado quando for solicitado."
        ],
        "ans": 1
      },
      {
        "id": "66484cacde9e",
        "type": "quiz",
        "title": "Códigos de Ética, Conduta e Políticas",
        "pts": 130,
        "coins": 50,
        "q": "A empresa possui diferentes códigos e políticas para orientar comportamentos, prevenir situações inadequadas e garantir relações profissionais éticas. Qual alternativa apresenta corretamente exemplos dessas diretrizes?",
        "opts": [
          "Código de Ética e Conduta, Política de Benefícios e Política de Controle de Ponto.",
          "Política de Prevenção e Combate ao Assédio, Política de Férias e Política de Recrutamento.",
          "Política Anticorrupção e Antissuborno, Manual de Benefícios e Código de Vestimenta.",
          "Código de Ética e Conduta, Política de Prevenção e Combate ao Assédio e Política Anticorrupção e Antissuborno."
        ],
        "ans": 3
      }
    ]
  }
]

/** Pontos possíveis somando todas as etapas da trilha. */
export function pontosPossiveis(t: Trilha): number {
  return t.acts.reduce((s, a) => s + (a.pts || 0), 0)
}

/** A pessoa enxerga a trilha? (sem restrição de área, ou área compatível.) */
export function trilhaVisivel(t: Trilha, area?: string | null): boolean {
  if (!t.areas || t.areas.length === 0) return true
  if (!area) return false
  const norm = (s: string) => s.normalize('NFD').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  return t.areas.some((a) => norm(a) === norm(area))
}

