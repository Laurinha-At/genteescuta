import { analisar } from '../lib/scoring'
import type { ItemResposta, Pergunta, Resposta, Secao } from '../lib/types'

let falhas = 0
const ok = (nome: string, real: unknown, esperado: unknown) => {
  const bateu = JSON.stringify(real) === JSON.stringify(esperado)
  if (!bateu) falhas++
  console.log(
    `${bateu ? 'PASSA' : 'FALHA'}  ${nome}` +
      (bateu ? '' : `\n        obtive ${JSON.stringify(real)} / esperava ${JSON.stringify(esperado)}`),
  )
}

const secao = (id: string, dimensao: string): Secao => ({
  id, pesquisa_id: 'p1', titulo: id, descricao: null, dimensao, ordem: 0,
})

const pergunta = (id: string, secaoId: string, extra: Partial<Pergunta> = {}): Pergunta => ({
  id, pesquisa_id: 'p1', secao_id: secaoId, enunciado: `Pergunta ${id}`, ajuda: null,
  tipo: 'likert5', opcoes: null, obrigatoria: true, invertida: false, critica: false,
  peso: 1, segmentacao: null, ordem: 0, ...extra,
})

// ---------------------------------------------------------------
// Cenário: 1 dimensão com um item normal e um protetivo.
// 10 pessoas na área A, 3 na área B (abaixo do mínimo de 5).
// Todas respondem 5 nos dois itens.
//   item normal   → risco 5 → índice 100
//   item protetivo→ risco 1 → índice 0
//   média da dimensão = 50 → "alto"
// ---------------------------------------------------------------
const secoes = [secao('s1', 'teste'), secao('s2', 'assedio')]
const perguntas = [
  pergunta('q1', 's1'),
  pergunta('q2', 's1', { invertida: true }),
  pergunta('q3', 's2', { critica: true }),
]

const respostas: Resposta[] = []
const itens: ItemResposta[] = []
let n = 0
const addPessoa = (area: string, notaCritica: number) => {
  const id = `r${++n}`
  respostas.push({
    id, pesquisa_id: 'p1', email: null, email_hash: null, area,
    cargo: null, tempo_casa: null, modelo_trabalho: null, enviada_em: new Date().toISOString(),
  })
  for (const [q, v] of [['q1', 5], ['q2', 5], ['q3', notaCritica]] as const) {
    itens.push({ id: `${id}-${q}`, resposta_id: id, pergunta_id: q, valor_num: v, valor_texto: null, valor_json: null })
  }
}
for (let i = 0; i < 10; i++) addPessoa('Área A', i < 2 ? 4 : 1) // 2 pessoas relatam assédio
for (let i = 0; i < 3; i++) addPessoa('Área B', 1)

const a = analisar({
  pesquisa: { min_grupo: 5, publico_alvo: 26 },
  secoes, perguntas, respostas, itens,
})

console.log('\n--- agregação por dimensão ---')
const dimTeste = a.dimensoes.find((d) => d.dimensao === 'teste')!
ok('item normal com nota 5 = índice 100', dimTeste.itens.find((i) => i.perguntaId === 'q1')!.indice, 100)
ok('item protetivo com nota 5 = índice 0', dimTeste.itens.find((i) => i.perguntaId === 'q2')!.indice, 0)
ok('média da dimensão = 50', dimTeste.indice, 50)
ok('faixa da dimensão = alto', dimTeste.faixa, 'alto')
ok('respondentes contados', dimTeste.respondentes, 13)

console.log('\n--- participação ---')
ok('total de respostas', a.totalRespostas, 13)
ok('taxa de participação 13/26', a.taxaParticipacao, 50)

console.log('\n--- supressão de grupo pequeno ---')
const areaA = a.porArea.find((r) => r.chave === 'Área A')!
const areaB = a.porArea.find((r) => r.chave === 'Área B')!
ok('Área A (n=10) aparece', areaA.suprimido, false)
ok('Área A traz índice', areaA.indiceGeral !== null, true)
ok('Área B (n=3) é suprimida', areaB.suprimido, true)
ok('Área B não vaza o índice', areaB.indiceGeral, null)
ok('Área B não vaza recorte por dimensão', Object.keys(areaB.porDimensao).length, 0)
ok('Área B ainda mostra o n', areaB.n, 3)

console.log('\n--- alerta crítico ---')
ok('gerou 1 alerta', a.alertas.length, 1)
ok('contou as 2 ocorrências (nota >= 2)', a.alertas[0]?.ocorrencias, 2)
ok('percentual sobre quem respondeu o item', a.alertas[0]?.percentual, Math.round((2 / 13) * 1000) / 10)

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} FALHA(S)`)
process.exit(falhas === 0 ? 0 : 1)
