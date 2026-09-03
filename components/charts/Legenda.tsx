import { FAIXAS } from '@/lib/scoring'
import { COR_RISCO } from '@/lib/format'
import { FAIXA_LABEL } from '@/lib/types'

/**
 * Legenda das faixas de risco. Sempre presente onde a cor codifica faixa —
 * a cor nunca carrega o significado sozinha.
 */
export function LegendaRisco({ compacta = false }: { compacta?: boolean }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {FAIXAS.map(({ faixa, min, max }) => (
        <li key={faixa} className="flex items-center gap-1.5 text-xs text-tinta-2">
          <span
            className="h-2.5 w-2.5 flex-none rounded-sm"
            style={{ background: COR_RISCO[faixa] }}
            aria-hidden
          />
          <span>{FAIXA_LABEL[faixa]}</span>
          {!compacta && (
            <span className="text-tinta-3 tabular">
              {min}–{max > 100 ? 100 : max}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function LegendaSeries({
  itens,
}: {
  itens: { rotulo: string; cor: string }[]
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {itens.map((i) => (
        <li key={i.rotulo} className="flex items-center gap-1.5 text-xs text-tinta-2">
          <span
            className="h-2.5 w-2.5 flex-none rounded-sm"
            style={{ background: i.cor }}
            aria-hidden
          />
          {i.rotulo}
        </li>
      ))}
    </ul>
  )
}
