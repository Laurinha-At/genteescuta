'use client'

import { useState } from 'react'
import { CORES_FUNIL } from '@/lib/format'

export interface EtapaFunil {
  rotulo: string
  valor: number
  ajuda?: string
}

/**
 * Funil do canal: recebidas → analisadas → implementadas.
 * Contagens cumulativas — quem foi implementada também passou pela análise.
 */
export function Funil({ etapas }: { etapas: EtapaFunil[] }) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const [posicao, setPosicao] = useState({ x: 0, y: 0 })

  const total = etapas[0]?.valor ?? 0

  if (total === 0) {
    return (
      <p className="text-sm text-tinta-3">
        Assim que a primeira manifestação chegar, o funil aparece aqui.
      </p>
    )
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
      <ul className="space-y-2">
        {etapas.map((etapa, i) => {
          const percentual = total > 0 ? (etapa.valor / total) * 100 : 0
          const anterior = i > 0 ? etapas[i - 1].valor : null
          const conversao =
            anterior && anterior > 0 ? Math.round((etapa.valor / anterior) * 100) : null

          return (
            <li
              key={etapa.rotulo}
              onMouseEnter={() => setAtivo(i)}
              className={`rounded px-1 py-1 ${ativo === i ? 'bg-superficie-2' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-tinta-2">{etapa.rotulo}</span>
                <span className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-tinta tabular">{etapa.valor}</span>
                  <span className="w-11 text-right text-xs text-tinta-3 tabular">
                    {Math.round(percentual)}%
                  </span>
                </span>
              </div>

              <div className="mt-1 h-3.5 rounded-sm bg-plano">
                <div
                  className="h-full rounded-r-[4px]"
                  style={{
                    width: `${Math.max(percentual, etapa.valor > 0 ? 1.2 : 0)}%`,
                    background: CORES_FUNIL[Math.min(i, CORES_FUNIL.length - 1)],
                  }}
                />
              </div>

              {conversao !== null && (
                <p className="mt-1 text-xs text-tinta-3">
                  {conversao}% do que estava na etapa anterior avançou
                </p>
              )}
            </li>
          )
        })}
      </ul>

      {ativo !== null && etapas[ativo] && (
        <div className="dica" style={{ left: Math.min(posicao.x + 12, 240), top: posicao.y + 14 }}>
          <p className="font-semibold">{etapas[ativo].rotulo}</p>
          <p className="mt-0.5">
            {etapas[ativo].valor} de {total} ({Math.round((etapas[ativo].valor / total) * 100)}%)
          </p>
          {etapas[ativo].ajuda && (
            <p className="mt-1 border-t border-white/20 pt-1 text-white/80">
              {etapas[ativo].ajuda}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
