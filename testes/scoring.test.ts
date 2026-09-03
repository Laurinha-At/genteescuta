import { analisar, calcularENPS, faixaDeRisco, riscoDoItem, normalizar } from '../lib/scoring'
import type { Pergunta, Secao, Resposta, ItemResposta, Pesquisa } from '../lib/types'

let falhas = 0
const ok = (nome: string, real: unknown, esperado: unknown) => {
  const bateu = JSON.stringify(real) === JSON.stringify(esperado)
  if (!bateu) falhas++
  console.log(
    `${bateu ? 'PASSA' : 'FALHA'}  ${nome}` +
      (bateu ? '' : `\n        obtive ${JSON.stringify(real)} / esperava ${JSON.stringify(esperado)}`),
  )
}

console.log('\n--- inversão de item protetivo ---')
ok('item normal nota 5 = risco 5', riscoDoItem(5, false), 5)
ok('item protetivo nota 5 = risco 1', riscoDoItem(5, true), 1)
ok('item protetivo nota 1 = risco 5', riscoDoItem(1, true), 5)

console.log('\n--- normalização 1..5 para 0..100 ---')
ok('risco 1 = índice 0', normalizar(1), 0)
ok('risco 5 = índice 100', normalizar(5), 100)
ok('risco 3 = índice 50', normalizar(3), 50)

console.log('\n--- faixas de risco ---')
ok('0 = baixo', faixaDeRisco(0), 'baixo')
ok('24,9 = baixo', faixaDeRisco(24.9), 'baixo')
ok('25 = moderado', faixaDeRisco(25), 'moderado')
ok('50 = alto', faixaDeRisco(50), 'alto')
ok('75 = crítico', faixaDeRisco(75), 'critico')
ok('100 = crítico', faixaDeRisco(100), 'critico')

console.log('\n--- eNPS ---')
const e1 = calcularENPS([10, 10, 9, 8, 7, 6, 0])
ok('promotores (9-10)', e1.promotores, 3)
ok('neutros (7-8)', e1.neutros, 2)
ok('detratores (0-6)', e1.detratores, 2)
ok('cálculo %prom - %detr', e1.enps, Math.round((3 / 7) * 100 - (2 / 7) * 100))
ok('lista vazia não quebra', calcularENPS([]).enps, 0)
ok('só promotores = +100', calcularENPS([9, 10]).enps, 100)
ok('só detratores = -100', calcularENPS([0, 6]).enps, -100)

export { ok }
export const contarFalhas = () => falhas
