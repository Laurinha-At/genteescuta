import type {
  FaixaRisco,
  ItemResposta,
  Pergunta,
  Pesquisa,
  Resposta,
  Secao,
} from './types'
import { ROTULO_DIMENSAO } from './nr1-template'

/**
 * Como a nota de risco é calculada
 * --------------------------------
 * Cada item Likert vale de 1 a 5. Itens "invertidos" são protetivos — neles,
 * nota alta significa MENOS risco — então a escala é espelhada (6 - valor).
 * O resultado vira um índice de 0 a 100, onde 0 é a melhor situação possível
 * e 100 é a pior. As faixas seguem a lógica de priorização do PGR: quanto
 * maior o índice, mais urgente é a medida de controle.
 */

export const FAIXAS: { faixa: FaixaRisco; min: number; max: number }[] = [
  { faixa: 'baixo', min: 0, max: 25 },
  { faixa: 'moderado', min: 25, max: 50 },
  { faixa: 'alto', min: 50, max: 75 },
  { faixa: 'critico', min: 75, max: 100.01 },
]

export function faixaDeRisco(indice: number): FaixaRisco {
  const encontrada = FAIXAS.find((f) => indice >= f.min && indice < f.max)
  return encontrada?.faixa ?? 'baixo'
}

/** Converte a resposta bruta (1..5) na nota de risco (1..5, maior = pior). */
export function riscoDoItem(valor: number, invertida: boolean): number {
  return invertida ? 6 - valor : valor
}

/** Converte a nota de risco 1..5 no índice 0..100. */
export function normalizar(risco: number): number {
  return ((risco - 1) / 4) * 100
}

function media(valores: number[]): number {
  if (valores.length === 0) return 0
  return valores.reduce((soma, v) => soma + v, 0) / valores.length
}

function arredondar(n: number, casas = 1): number {
  const fator = 10 ** casas
  return Math.round(n * fator) / fator
}

// ---------------------------------------------------------------
// Estruturas de saída
// ---------------------------------------------------------------
export interface ItemResultado {
  perguntaId: string
  enunciado: string
  indice: number
  faixa: FaixaRisco
  invertida: boolean
  critica: boolean
  respondentes: number
  /** Quantas pessoas marcaram cada ponto da escala, de 1 a 5. */
  distribuicao: number[]
}

export interface DimensaoResultado {
  dimensao: string
  rotulo: string
  indice: number
  faixa: FaixaRisco
  respondentes: number
  itens: ItemResultado[]
}

export interface ResultadoENPS {
  enps: number
  promotores: number
  neutros: number
  detratores: number
  total: number
  percentualPromotores: number
  percentualNeutros: number
  percentualDetratores: number
}

export interface RecorteResultado {
  chave: string
  rotulo: string
  n: number
  /** true quando o grupo é pequeno demais e os números ficam ocultos. */
  suprimido: boolean
  indiceGeral: number | null
  faixa: FaixaRisco | null
  porDimensao: Record<string, number | null>
}

export interface Alerta {
  perguntaId: string
  enunciado: string
  ocorrencias: number
  percentual: number
  gravidade: 'atencao' | 'grave'
}

export interface RespostaAberta {
  perguntaId: string
  enunciado: string
  textos: { texto: string; area: string | null }[]
}

export interface Analise {
  totalRespostas: number
  publicoAlvo: number | null
  taxaParticipacao: number | null
  indiceGeral: number
  faixaGeral: FaixaRisco
  dimensoes: DimensaoResultado[]
  pontosPositivos: DimensaoResultado[]
  pontosAtencao: DimensaoResultado[]
  enps: ResultadoENPS | null
  satisfacao: number | null
  alertas: Alerta[]
  porArea: RecorteResultado[]
  porCargo: RecorteResultado[]
  porTempoCasa: RecorteResultado[]
  porModelo: RecorteResultado[]
  abertas: RespostaAberta[]
  minGrupo: number
}

export interface DadosAnalise {
  pesquisa: Pick<Pesquisa, 'min_grupo' | 'publico_alvo'>
  secoes: Secao[]
  perguntas: Pergunta[]
  respostas: Resposta[]
  itens: ItemResposta[]
}

// ---------------------------------------------------------------
// Cálculo principal
// ---------------------------------------------------------------
export function analisar(dados: DadosAnalise): Analise {
  const { pesquisa, secoes, perguntas, respostas, itens } = dados
  const minGrupo = pesquisa.min_grupo ?? 5

  const perguntaPorId = new Map(perguntas.map((p) => [p.id, p]))
  const secaoPorId = new Map(secoes.map((s) => [s.id, s]))

  // Agrupa os valores numéricos por pergunta.
  const valoresPorPergunta = new Map<string, number[]>()
  // Agrupa por pergunta e por resposta, para conseguir fazer os recortes.
  const valorPorRespostaPergunta = new Map<string, number>()

  for (const item of itens) {
    if (item.valor_num === null || item.valor_num === undefined) continue
    const lista = valoresPorPergunta.get(item.pergunta_id) ?? []
    lista.push(Number(item.valor_num))
    valoresPorPergunta.set(item.pergunta_id, lista)
    valorPorRespostaPergunta.set(`${item.resposta_id}:${item.pergunta_id}`, Number(item.valor_num))
  }

  // ---- Dimensões -----------------------------------------------------
  const perguntasLikert = perguntas.filter((p) => p.tipo === 'likert5')
  const dimensoesMap = new Map<string, Pergunta[]>()

  for (const pergunta of perguntasLikert) {
    const secao = pergunta.secao_id ? secaoPorId.get(pergunta.secao_id) : undefined
    const dimensao = secao?.dimensao
    if (!dimensao) continue
    const lista = dimensoesMap.get(dimensao) ?? []
    lista.push(pergunta)
    dimensoesMap.set(dimensao, lista)
  }

  const dimensoes: DimensaoResultado[] = []

  for (const [dimensao, itensDim] of dimensoesMap) {
    const resultadosItens: ItemResultado[] = []

    for (const pergunta of itensDim) {
      const valores = valoresPorPergunta.get(pergunta.id) ?? []
      const distribuicao = [0, 0, 0, 0, 0]
      for (const v of valores) {
        const idx = Math.round(v) - 1
        if (idx >= 0 && idx < 5) distribuicao[idx] += 1
      }
      const riscos = valores.map((v) => riscoDoItem(v, pergunta.invertida))
      const indice = valores.length ? arredondar(normalizar(media(riscos))) : 0

      resultadosItens.push({
        perguntaId: pergunta.id,
        enunciado: pergunta.enunciado,
        indice,
        faixa: faixaDeRisco(indice),
        invertida: pergunta.invertida,
        critica: pergunta.critica,
        respondentes: valores.length,
        distribuicao,
      })
    }

    const comResposta = resultadosItens.filter((i) => i.respondentes > 0)
    const indiceDim = comResposta.length ? arredondar(media(comResposta.map((i) => i.indice))) : 0
    const respondentesDim = Math.max(0, ...resultadosItens.map((i) => i.respondentes))

    dimensoes.push({
      dimensao,
      rotulo: ROTULO_DIMENSAO[dimensao] ?? dimensao,
      indice: indiceDim,
      faixa: faixaDeRisco(indiceDim),
      respondentes: respondentesDim,
      itens: resultadosItens.sort((a, b) => b.indice - a.indice),
    })
  }

  dimensoes.sort((a, b) => b.indice - a.indice)

  const dimensoesComDados = dimensoes.filter((d) => d.respondentes > 0)
  const indiceGeral = dimensoesComDados.length
    ? arredondar(media(dimensoesComDados.map((d) => d.indice)))
    : 0

  // ---- eNPS e satisfação ---------------------------------------------
  const perguntaEnps = perguntas.find((p) => p.tipo === 'enps')
  const enps = perguntaEnps
    ? calcularENPS(valoresPorPergunta.get(perguntaEnps.id) ?? [])
    : null

  const perguntaSatisfacao = perguntas.find((p) => p.tipo === 'nota10')
  const valoresSatisfacao = perguntaSatisfacao
    ? valoresPorPergunta.get(perguntaSatisfacao.id) ?? []
    : []
  const satisfacao = valoresSatisfacao.length ? arredondar(media(valoresSatisfacao) * 10) : null

  // ---- Alertas críticos ----------------------------------------------
  // Em itens de assédio/violência, "raramente" já conta como ocorrência.
  const alertas: Alerta[] = []
  for (const pergunta of perguntas.filter((p) => p.critica)) {
    const valores = valoresPorPergunta.get(pergunta.id) ?? []
    if (valores.length === 0) continue
    const ocorrencias = valores.filter((v) => (pergunta.invertida ? 6 - v : v) >= 2).length
    if (ocorrencias === 0) continue
    const percentual = arredondar((ocorrencias / valores.length) * 100)
    alertas.push({
      perguntaId: pergunta.id,
      enunciado: pergunta.enunciado,
      ocorrencias,
      percentual,
      gravidade: percentual >= 10 ? 'grave' : 'atencao',
    })
  }
  alertas.sort((a, b) => b.percentual - a.percentual)

  // ---- Recortes -------------------------------------------------------
  const recorte = (campo: keyof Resposta, rotulos?: Record<string, string>) =>
    calcularRecorte(respostas, campo, dimensoesMap, valorPorRespostaPergunta, minGrupo, rotulos)

  const porArea = recorte('area')
  const porCargo = recorte('cargo', ROTULOS_CARGO)
  const porTempoCasa = recorte('tempo_casa', ROTULOS_TEMPO)
  const porModelo = recorte('modelo_trabalho', ROTULOS_MODELO)

  // ---- Respostas abertas ----------------------------------------------
  const respostaPorId = new Map(respostas.map((r) => [r.id, r]))
  const abertas: RespostaAberta[] = perguntas
    .filter((p) => p.tipo === 'texto' || p.tipo === 'texto_longo')
    .map((pergunta) => ({
      perguntaId: pergunta.id,
      enunciado: pergunta.enunciado,
      textos: itens
        .filter((i) => i.pergunta_id === pergunta.id && i.valor_texto?.trim())
        .map((i) => ({
          texto: i.valor_texto!.trim(),
          area: respostaPorId.get(i.resposta_id)?.area ?? null,
        })),
    }))
    .filter((a) => a.textos.length > 0)

  const totalRespostas = respostas.length
  const publicoAlvo = pesquisa.publico_alvo ?? null
  const taxaParticipacao =
    publicoAlvo && publicoAlvo > 0
      ? arredondar(Math.min(100, (totalRespostas / publicoAlvo) * 100))
      : null

  const ordenadasPorIndice = [...dimensoesComDados].sort((a, b) => a.indice - b.indice)

  return {
    totalRespostas,
    publicoAlvo,
    taxaParticipacao,
    indiceGeral,
    faixaGeral: faixaDeRisco(indiceGeral),
    dimensoes,
    pontosPositivos: ordenadasPorIndice.slice(0, 3),
    pontosAtencao: [...dimensoesComDados].sort((a, b) => b.indice - a.indice).slice(0, 3),
    enps,
    satisfacao,
    alertas,
    porArea,
    porCargo,
    porTempoCasa,
    porModelo,
    abertas,
    minGrupo,
  }
}

// ---------------------------------------------------------------
export function calcularENPS(notas: number[]): ResultadoENPS {
  const total = notas.length
  const promotores = notas.filter((n) => n >= 9).length
  const neutros = notas.filter((n) => n >= 7 && n <= 8).length
  const detratores = notas.filter((n) => n <= 6).length

  const pct = (n: number) => (total ? (n / total) * 100 : 0)

  return {
    enps: total ? Math.round(pct(promotores) - pct(detratores)) : 0,
    promotores,
    neutros,
    detratores,
    total,
    percentualPromotores: arredondar(pct(promotores)),
    percentualNeutros: arredondar(pct(neutros)),
    percentualDetratores: arredondar(pct(detratores)),
  }
}

/** Classificação usual de mercado para o eNPS. */
export function classificarENPS(enps: number): { rotulo: string; faixa: FaixaRisco } {
  if (enps >= 50) return { rotulo: 'Excelente', faixa: 'baixo' }
  if (enps >= 10) return { rotulo: 'Bom', faixa: 'baixo' }
  if (enps >= 0) return { rotulo: 'Razoável', faixa: 'moderado' }
  if (enps >= -50) return { rotulo: 'Ruim', faixa: 'alto' }
  return { rotulo: 'Crítico', faixa: 'critico' }
}

// ---------------------------------------------------------------
function calcularRecorte(
  respostas: Resposta[],
  campo: keyof Resposta,
  dimensoesMap: Map<string, Pergunta[]>,
  valorPorRespostaPergunta: Map<string, number>,
  minGrupo: number,
  rotulos?: Record<string, string>,
): RecorteResultado[] {
  const grupos = new Map<string, Resposta[]>()

  for (const resposta of respostas) {
    const chave = (resposta[campo] as string | null) ?? null
    if (!chave) continue
    const lista = grupos.get(chave) ?? []
    lista.push(resposta)
    grupos.set(chave, lista)
  }

  const resultados: RecorteResultado[] = []

  for (const [chave, doGrupo] of grupos) {
    const n = doGrupo.length
    const suprimido = n < minGrupo

    if (suprimido) {
      resultados.push({
        chave,
        rotulo: rotulos?.[chave] ?? chave,
        n,
        suprimido: true,
        indiceGeral: null,
        faixa: null,
        porDimensao: {},
      })
      continue
    }

    const porDimensao: Record<string, number | null> = {}
    const indicesDim: number[] = []

    for (const [dimensao, perguntasDim] of dimensoesMap) {
      const riscos: number[] = []
      for (const resposta of doGrupo) {
        for (const pergunta of perguntasDim) {
          const valor = valorPorRespostaPergunta.get(`${resposta.id}:${pergunta.id}`)
          if (valor === undefined) continue
          riscos.push(riscoDoItem(valor, pergunta.invertida))
        }
      }
      if (riscos.length === 0) {
        porDimensao[dimensao] = null
        continue
      }
      const indice = arredondar(normalizar(media(riscos)))
      porDimensao[dimensao] = indice
      indicesDim.push(indice)
    }

    const indiceGeral = indicesDim.length ? arredondar(media(indicesDim)) : 0

    resultados.push({
      chave,
      rotulo: rotulos?.[chave] ?? chave,
      n,
      suprimido: false,
      indiceGeral,
      faixa: faixaDeRisco(indiceGeral),
      porDimensao,
    })
  }

  return resultados.sort((a, b) => (b.indiceGeral ?? -1) - (a.indiceGeral ?? -1))
}

const ROTULOS_CARGO: Record<string, string> = {
  operacional: 'Operacional / Técnico',
  analista: 'Analista / Especialista',
  coordenacao: 'Coordenação / Supervisão',
  gerencia: 'Gerência',
  diretoria: 'Diretoria',
}

const ROTULOS_TEMPO: Record<string, string> = {
  ate_6m: 'Menos de 6 meses',
  '6m_2a': '6 meses a 2 anos',
  '2a_5a': '2 a 5 anos',
  '5a_10a': '5 a 10 anos',
  mais_10a: 'Mais de 10 anos',
}

const ROTULOS_MODELO: Record<string, string> = {
  presencial: 'Presencial',
  hibrido: 'Híbrido',
  remoto: 'Remoto',
}

export { ROTULOS_CARGO, ROTULOS_TEMPO, ROTULOS_MODELO }
