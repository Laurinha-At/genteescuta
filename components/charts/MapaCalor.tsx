'use client'

import { useState } from 'react'
import { EyeOff } from 'lucide-react'
import { COR_RISCO } from '@/lib/format'
import { faixaDeRisco } from '@/lib/scoring'
import { FAIXA_LABEL } from '@/lib/types'
import { LegendaRisco } from './Legenda'

export interface ColunaMapa {
  chave: string
  rotulo: string
  n: number
  suprimido: boolean
  valores: Record<string, number | null>
}

export interface LinhaMapa {
  chave: string
  rotulo: string
}

/**
 * Mapa de calor dimensão × recorte.
 * O número aparece impresso em toda célula — a cor é reforço, não o dado.
 * Grupos abaixo do mínimo aparecem tarjados, para não expor ninguém.
 */
export function MapaCalor({
  linhas,
  colunas,
  minGrupo,
  rotuloColuna = 'Área',
}: {
  linhas: LinhaMapa[]
  colunas: ColunaMapa[]
  minGrupo: number
  rotuloColuna?: string
}) {
  const [dica, setDica] = useState<{ texto: string[]; x: number; y: number } | null>(null)

  const visiveis = colunas.filter((c) => !c.suprimido)
  const ocultas = colunas.filter((c) => c.suprimido)

  if (visiveis.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-borda-forte p-6 text-center">
        <p className="text-sm text-tinta-2">
          Nenhum grupo alcançou o mínimo de {minGrupo} respostas.
        </p>
        <p className="mt-1 text-xs text-tinta-3">
          O recorte só é liberado quando há gente suficiente para preservar o anonimato.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3">
        <LegendaRisco compacta />
      </div>

      <div
        className="relative overflow-x-auto"
        onMouseLeave={() => setDica(null)}
      >
        <table className="w-full min-w-max border-separate border-spacing-[2px] text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-2 py-1.5 text-left text-xs font-semibold text-tinta-3">
                Dimensão
              </th>
              {visiveis.map((c) => (
                <th
                  key={c.chave}
                  className="px-1.5 py-1.5 text-center text-xs font-semibold text-tinta-3"
                  style={{ minWidth: '4.5rem', maxWidth: '7rem' }}
                >
                  <span className="block truncate" title={c.rotulo}>
                    {c.rotulo}
                  </span>
                  <span className="block font-normal text-tinta-3 tabular">n={c.n}</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.chave}>
                <th className="sticky left-0 z-10 max-w-[13rem] truncate bg-white px-2 py-1 text-left text-xs font-normal text-tinta-2">
                  <span title={linha.rotulo}>{linha.rotulo}</span>
                </th>

                {visiveis.map((coluna) => {
                  const valor = coluna.valores[linha.chave]

                  if (valor === null || valor === undefined) {
                    return (
                      <td
                        key={coluna.chave}
                        className="rounded-sm bg-plano px-1.5 py-1.5 text-center text-xs text-tinta-3"
                      >
                        —
                      </td>
                    )
                  }

                  const faixa = faixaDeRisco(valor)
                  const claro = faixa === 'baixo' || faixa === 'moderado'

                  return (
                    <td
                      key={coluna.chave}
                      onMouseMove={(e) => {
                        const caixa = e.currentTarget
                          .closest('div')
                          ?.getBoundingClientRect()
                        if (!caixa) return
                        setDica({
                          texto: [
                            `${linha.rotulo} · ${coluna.rotulo}`,
                            `Índice ${valor} de 100 — ${FAIXA_LABEL[faixa]}`,
                            `${coluna.n} respostas neste grupo`,
                          ],
                          x: e.clientX - caixa.left,
                          y: e.clientY - caixa.top,
                        })
                      }}
                      className="cursor-default rounded-sm px-1.5 py-1.5 text-center text-xs font-semibold tabular"
                      style={{
                        background: COR_RISCO[faixa],
                        color: claro ? '#0b0b0b' : '#ffffff',
                      }}
                    >
                      {valor}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {dica && (
          <div
            className="dica"
            style={{ left: Math.min(dica.x + 12, 320), top: dica.y + 16 }}
          >
            <p className="font-semibold">{dica.texto[0]}</p>
            <p className="mt-0.5">{dica.texto[1]}</p>
            <p className="text-white/70">{dica.texto[2]}</p>
          </div>
        )}
      </div>

      {ocultas.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-borda bg-superficie-2 px-3 py-2">
          <EyeOff size={14} className="mt-0.5 flex-none text-tinta-3" aria-hidden />
          <p className="text-xs leading-4 text-tinta-2">
            <strong className="font-semibold">
              {ocultas.length} {ocultas.length === 1 ? 'grupo ocultado' : 'grupos ocultados'}
            </strong>{' '}
            por ter menos de {minGrupo} respostas ({rotuloColuna.toLowerCase()}:{' '}
            {ocultas.map((o) => `${o.rotulo} (${o.n})`).join(', ')}). Isso protege o anonimato de
            quem respondeu — as respostas continuam contando no resultado geral.
          </p>
        </div>
      )}
    </div>
  )
}
