'use client'

import { useState } from 'react'
import { LegendaSeries } from './Legenda'

export interface PontoENPS {
  rotulo: string
  enps: number
  respostas: number
}

/**
 * Evolução do eNPS. O valor cruza o zero, então usa a dupla divergente
 * documentada (azul para positivo, vermelho para negativo) com a linha do
 * zero desenhada e o número escrito em cada barra.
 */
const POSITIVO = '#2a78d6'
const NEGATIVO = '#d03b3b'

export function EvolucaoENPS({ pontos }: { pontos: PontoENPS[] }) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const [posicao, setPosicao] = useState({ x: 0, y: 0 })

  if (pontos.length === 0) {
    return <p className="text-sm text-tinta-3">Nenhuma medição de eNPS registrada.</p>
  }

  if (pontos.length === 1) {
    const p = pontos[0]
    return (
      <div>
        <p className="text-sm text-tinta-2">
          Primeira medição:{' '}
          <strong className="font-semibold text-tinta tabular">
            {p.enps > 0 ? `+${p.enps}` : p.enps}
          </strong>{' '}
          em {p.rotulo}.
        </p>
        <p className="mt-1 text-xs text-tinta-3">
          A partir da segunda medição a evolução aparece em gráfico aqui.
        </p>
      </div>
    )
  }

  // A escala vai do maior valor absoluto, para o zero ficar no centro visual certo.
  const extremo = Math.max(...pontos.map((p) => Math.abs(p.enps)), 10)

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
        {pontos.map((p, i) => {
          const largura = (Math.abs(p.enps) / extremo) * 50 // metade da faixa
          const positivo = p.enps >= 0

          return (
            <li
              key={`${p.rotulo}-${i}`}
              onMouseEnter={() => setAtivo(i)}
              className={`grid grid-cols-[minmax(6rem,11rem)_1fr_3rem] items-center gap-3 rounded px-1 py-0.5 ${
                ativo === i ? 'bg-superficie-2' : ''
              }`}
            >
              <span className="truncate text-xs text-tinta-2" title={p.rotulo}>
                {p.rotulo}
              </span>

              <span className="relative block h-3.5">
                {/* linha do zero */}
                <span
                  className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
                  style={{ background: 'var(--eixo)' }}
                  aria-hidden
                />
                <span
                  className="absolute inset-y-0"
                  style={{
                    width: `${Math.max(largura, 0.6)}%`,
                    background: positivo ? POSITIVO : NEGATIVO,
                    left: positivo ? '50%' : undefined,
                    right: positivo ? undefined : '50%',
                    borderRadius: positivo ? '0 4px 4px 0' : '4px 0 0 4px',
                  }}
                />
              </span>

              <span className="text-right text-xs font-semibold text-tinta tabular">
                {p.enps > 0 ? `+${p.enps}` : p.enps}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="mt-3">
        <LegendaSeries
          itens={[
            { rotulo: 'eNPS positivo', cor: POSITIVO },
            { rotulo: 'eNPS negativo', cor: NEGATIVO },
          ]}
        />
      </div>

      {ativo !== null && pontos[ativo] && (
        <div className="dica" style={{ left: Math.min(posicao.x + 12, 240), top: posicao.y + 14 }}>
          <p className="font-semibold">{pontos[ativo].rotulo}</p>
          <p className="mt-0.5">
            eNPS {pontos[ativo].enps > 0 ? `+${pontos[ativo].enps}` : pontos[ativo].enps}
          </p>
          <p className="text-white/70">{pontos[ativo].respostas} respostas</p>
        </div>
      )}
    </div>
  )
}
