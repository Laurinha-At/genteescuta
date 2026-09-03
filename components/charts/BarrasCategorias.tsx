'use client'

import { useState } from 'react'
import { CORES_SERIE } from '@/lib/format'
import { LegendaSeries } from './Legenda'

export interface Categoria {
  rotulo: string
  valor: number
}

/**
 * Barras por categoria (tipos de manifestação).
 * Os valores ficam sempre escritos ao lado — três das cores da paleta
 * categórica ficam abaixo de 3:1 no fundo claro, e o rótulo visível é a
 * contrapartida exigida para usá-las.
 */
export function BarrasCategorias({
  dados,
  totalRotulo = 'manifestações',
}: {
  dados: Categoria[]
  totalRotulo?: string
}) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const [posicao, setPosicao] = useState({ x: 0, y: 0 })

  const total = dados.reduce((s, d) => s + d.valor, 0)
  const maximo = Math.max(...dados.map((d) => d.valor), 1)

  if (total === 0) {
    return <p className="text-sm text-tinta-3">Nada recebido ainda.</p>
  }

  return (
    <div
      className="relative"
      onMouseLeave={() => setAtivo(null)}
      onMouseMove={(e) => {
        const caixa = e.currentTarget.getBoundingClientRect()
        setPosicao({ x: e.clientX - caixa.left, y: e.clientY - caixa.top })
      }}
    >
      <ul className="space-y-1.5">
        {dados.map((d, i) => (
          <li
            key={d.rotulo}
            onMouseEnter={() => setAtivo(i)}
            className={`grid grid-cols-[minmax(6rem,9rem)_1fr_4.5rem] items-center gap-3 rounded px-1 py-0.5 ${
              ativo === i ? 'bg-superficie-2' : ''
            }`}
          >
            <span className="truncate text-xs text-tinta-2">{d.rotulo}</span>

            <span className="relative block h-3.5 rounded-sm bg-plano">
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px]"
                style={{
                  width: `${Math.max((d.valor / maximo) * 100, d.valor > 0 ? 1.5 : 0)}%`,
                  background: CORES_SERIE[i % CORES_SERIE.length],
                }}
              />
            </span>

            <span className="text-right text-xs text-tinta-2 tabular">
              <strong className="font-semibold text-tinta">{d.valor}</strong>
              <span className="ml-1 text-tinta-3">
                {total > 0 ? `${Math.round((d.valor / total) * 100)}%` : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <LegendaSeries
          itens={dados.map((d, i) => ({
            rotulo: d.rotulo,
            cor: CORES_SERIE[i % CORES_SERIE.length],
          }))}
        />
      </div>

      {ativo !== null && dados[ativo] && (
        <div className="dica" style={{ left: Math.min(posicao.x + 12, 220), top: posicao.y + 14 }}>
          <p className="font-semibold">{dados[ativo].rotulo}</p>
          <p className="mt-0.5">
            {dados[ativo].valor} de {total} {totalRotulo}
          </p>
        </div>
      )}
    </div>
  )
}
