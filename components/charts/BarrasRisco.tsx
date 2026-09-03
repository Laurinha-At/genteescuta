'use client'

import { useState } from 'react'
import { Table2, BarChart3 } from 'lucide-react'
import { COR_RISCO } from '@/lib/format'
import { FAIXA_LABEL, type FaixaRisco } from '@/lib/types'
import { LegendaRisco } from './Legenda'

export interface BarraRisco {
  rotulo: string
  indice: number
  faixa: FaixaRisco
  respondentes: number
  detalhe?: string
}

/**
 * Barras horizontais do índice de risco por dimensão.
 * O valor aparece sempre em texto ao lado da barra: a cor apenas reforça.
 */
export function BarrasRisco({ dados }: { dados: BarraRisco[] }) {
  const [tabela, setTabela] = useState(false)
  const [ativo, setAtivo] = useState<number | null>(null)
  const [posicao, setPosicao] = useState({ x: 0, y: 0 })

  if (dados.length === 0) {
    return <p className="text-sm text-tinta-3">Ainda não há respostas suficientes.</p>
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <LegendaRisco />
        <button
          type="button"
          onClick={() => setTabela((t) => !t)}
          className="sem-impressao inline-flex items-center gap-1.5 rounded-md border border-borda-forte bg-white px-2.5 py-1 text-xs font-medium text-tinta-2 hover:bg-superficie-2"
        >
          {tabela ? (
            <>
              <BarChart3 size={13} aria-hidden /> Ver gráfico
            </>
          ) : (
            <>
              <Table2 size={13} aria-hidden /> Ver tabela
            </>
          )}
        </button>
      </div>

      {tabela ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borda text-left text-xs font-semibold text-tinta-3">
                <th className="py-2 font-semibold">Dimensão</th>
                <th className="py-2 font-semibold">Índice</th>
                <th className="py-2 font-semibold">Faixa</th>
                <th className="py-2 font-semibold">Respostas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {dados.map((d) => (
                <tr key={d.rotulo}>
                  <td className="py-2 text-tinta-2">{d.rotulo}</td>
                  <td className="py-2 font-medium text-tinta tabular">{d.indice}</td>
                  <td className="py-2 text-tinta-2">{FAIXA_LABEL[d.faixa]}</td>
                  <td className="py-2 text-tinta-2 tabular">{d.respondentes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="relative"
          onMouseLeave={() => setAtivo(null)}
          onMouseMove={(e) => {
            const caixa = e.currentTarget.getBoundingClientRect()
            setPosicao({ x: e.clientX - caixa.left, y: e.clientY - caixa.top })
          }}
        >
          <ul className="space-y-1">
            {dados.map((d, i) => (
              <li
                key={d.rotulo}
                onMouseEnter={() => setAtivo(i)}
                className={`grid grid-cols-[minmax(7rem,13rem)_1fr_2.75rem] items-center gap-2 rounded px-1 py-1 sm:gap-3 ${
                  ativo === i ? 'bg-superficie-2' : ''
                }`}
              >
                <span className="truncate text-xs leading-4 text-tinta-2" title={d.rotulo}>
                  {d.rotulo}
                </span>

                <span className="relative block h-3.5 rounded-sm bg-plano">
                  <span
                    className="absolute inset-y-0 left-0 rounded-r-[4px]"
                    style={{
                      width: `${Math.max(d.indice, 0.8)}%`,
                      background: COR_RISCO[d.faixa],
                    }}
                  />
                </span>

                <span className="text-right text-xs font-semibold text-tinta tabular">
                  {d.indice}
                </span>
              </li>
            ))}
          </ul>

          {ativo !== null && dados[ativo] && (
            <div
              className="dica"
              style={{
                left: Math.min(posicao.x + 12, 260),
                top: posicao.y + 14,
              }}
            >
              <p className="font-semibold">{dados[ativo].rotulo}</p>
              <p className="mt-0.5">
                Índice {dados[ativo].indice} de 100 — {FAIXA_LABEL[dados[ativo].faixa]}
              </p>
              <p className="text-white/70">{dados[ativo].respondentes} respostas</p>
              {dados[ativo].detalhe && (
                <p className="mt-1 border-t border-white/20 pt-1 text-white/80">
                  {dados[ativo].detalhe}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-3 text-xs leading-4 text-tinta-3">
        O índice vai de 0 a 100: quanto maior, maior a exposição ao fator de risco. Itens
        protetivos entram invertidos no cálculo.
      </p>
    </div>
  )
}
