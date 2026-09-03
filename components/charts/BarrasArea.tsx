'use client'

import { useState } from 'react'
import { UserX } from 'lucide-react'

export interface AreaItem {
  rotulo: string
  valor: number
  anonimas: number
}

/**
 * Manifestações por área.
 * Série única — o título já nomeia o que a barra mede, então não leva legenda.
 * A coluna de anônimas é o motivo de a área ser obrigatória no envio: mesmo
 * sem saber QUEM falou, a administração sabe ONDE agir.
 */
export function BarrasArea({ dados }: { dados: AreaItem[] }) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const [posicao, setPosicao] = useState({ x: 0, y: 0 })

  const total = dados.reduce((s, d) => s + d.valor, 0)
  const maximo = Math.max(...dados.map((d) => d.valor), 1)
  const totalAnonimas = dados.reduce((s, d) => s + d.anonimas, 0)

  if (total === 0) {
    return <p className="text-sm text-tinta-3">Nenhuma manifestação recebida ainda.</p>
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
            className={`grid grid-cols-[minmax(6rem,11rem)_1fr_5.5rem] items-center gap-3 rounded px-1 py-0.5 ${
              ativo === i ? 'bg-superficie-2' : ''
            }`}
          >
            <span className="truncate text-xs text-tinta-2" title={d.rotulo}>
              {d.rotulo}
            </span>

            <span className="relative block h-3.5 rounded-sm bg-plano">
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px] bg-marca"
                style={{ width: `${Math.max((d.valor / maximo) * 100, 1.5)}%` }}
              />
            </span>

            <span className="flex items-center justify-end gap-1.5 text-xs text-tinta-3">
              <strong className="font-semibold text-tinta tabular">{d.valor}</strong>
              {d.anonimas > 0 && (
                <span
                  className="inline-flex items-center gap-0.5 tabular"
                  title={`${d.anonimas} enviada(s) sem identificação`}
                >
                  <UserX size={11} aria-hidden />
                  {d.anonimas}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-center gap-1.5 border-t border-borda pt-3 text-xs leading-4 text-tinta-3">
        <UserX size={12} className="flex-none" aria-hidden />
        {totalAnonimas === 0
          ? 'Nenhuma manifestação anônima até agora.'
          : `${totalAnonimas} de ${total} vieram sem identificação — a área continua registrada, então dá para agir mesmo sem saber quem enviou.`}
      </p>

      {ativo !== null && dados[ativo] && (
        <div className="dica" style={{ left: Math.min(posicao.x + 12, 240), top: posicao.y + 14 }}>
          <p className="font-semibold">{dados[ativo].rotulo}</p>
          <p className="mt-0.5">
            {dados[ativo].valor} de {total} ({Math.round((dados[ativo].valor / total) * 100)}%)
          </p>
          <p className="text-white/70">
            {dados[ativo].anonimas === 0
              ? 'Todas identificadas'
              : `${dados[ativo].anonimas} sem identificação`}
          </p>
        </div>
      )}
    </div>
  )
}
