'use client'

import { useState } from 'react'
import type { ResultadoENPS } from '@/lib/scoring'
import { LegendaSeries } from './Legenda'

/**
 * Composição do eNPS. Promotor/neutro/detrator é um estado ordenado, não uma
 * série categórica — por isso usa a paleta de status, sempre com rótulo e
 * percentual escritos ao lado.
 */
const CORES = {
  promotores: '#0ca30c',
  neutros: '#898781',
  detratores: '#d03b3b',
}

export function BarraENPS({ enps }: { enps: ResultadoENPS }) {
  const [ativo, setAtivo] = useState<string | null>(null)
  const [posicao, setPosicao] = useState({ x: 0, y: 0 })

  if (enps.total === 0) {
    return <p className="text-sm text-tinta-3">Nenhuma resposta de eNPS ainda.</p>
  }

  const segmentos = [
    {
      chave: 'promotores',
      rotulo: 'Promotores',
      nota: 'notas 9 e 10',
      valor: enps.promotores,
      percentual: enps.percentualPromotores,
      cor: CORES.promotores,
    },
    {
      chave: 'neutros',
      rotulo: 'Neutros',
      nota: 'notas 7 e 8',
      valor: enps.neutros,
      percentual: enps.percentualNeutros,
      cor: CORES.neutros,
    },
    {
      chave: 'detratores',
      rotulo: 'Detratores',
      nota: 'notas de 0 a 6',
      valor: enps.detratores,
      percentual: enps.percentualDetratores,
      cor: CORES.detratores,
    },
  ]

  return (
    <div
      className="relative"
      onMouseLeave={() => setAtivo(null)}
      onMouseMove={(e) => {
        const caixa = e.currentTarget.getBoundingClientRect()
        setPosicao({ x: e.clientX - caixa.left, y: e.clientY - caixa.top })
      }}
    >
      {/* Barra empilhada com 2px de respiro entre os blocos */}
      <div className="flex h-5 gap-[2px] overflow-hidden rounded-sm">
        {segmentos.map((s) =>
          s.percentual > 0 ? (
            <div
              key={s.chave}
              onMouseEnter={() => setAtivo(s.chave)}
              style={{ width: `${s.percentual}%`, background: s.cor }}
              className="h-full first:rounded-l-sm last:rounded-r-sm"
            />
          ) : null,
        )}
      </div>

      <div className="mt-3">
        <LegendaSeries
          itens={segmentos.map((s) => ({ rotulo: s.rotulo, cor: s.cor }))}
        />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {segmentos.map((s) => (
          <div key={s.chave} className="rounded-md border border-borda bg-superficie-2 py-2">
            <dt className="text-xs text-tinta-3">{s.rotulo}</dt>
            <dd className="text-base font-semibold text-tinta tabular">{s.percentual}%</dd>
            <dd className="text-xs text-tinta-3 tabular">
              {s.valor} {s.valor === 1 ? 'pessoa' : 'pessoas'}
            </dd>
          </div>
        ))}
      </dl>

      {ativo && (
        <div className="dica" style={{ left: Math.min(posicao.x + 12, 220), top: posicao.y + 14 }}>
          {(() => {
            const s = segmentos.find((x) => x.chave === ativo)!
            return (
              <>
                <p className="font-semibold">{s.rotulo}</p>
                <p className="text-white/70">{s.nota}</p>
                <p className="mt-0.5">
                  {s.valor} de {enps.total} ({s.percentual}%)
                </p>
              </>
            )
          })()}
        </div>
      )}

      <p className="mt-3 text-xs leading-4 text-tinta-3">
        eNPS = % de promotores − % de detratores. Varia de −100 a +100.
      </p>
    </div>
  )
}
