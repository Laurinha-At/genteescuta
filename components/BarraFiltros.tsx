'use client'

// =============================================================
// Barra de filtros padrão, reutilizável nas telas de listagem do canal
// (e em qualquer outra listagem): campo de busca + grupos de pílulas.
// =============================================================
import { Search } from 'lucide-react'
import { Cartao } from '@/components/ui'

export type OpcaoFiltro = { valor: string; rotulo: string }
export type GrupoFiltro = {
  rotulo: string
  valor: string
  onChange: (v: string) => void
  opcoes: OpcaoFiltro[]
}

export function BarraFiltros({
  busca,
  onBusca,
  buscaPlaceholder = 'Buscar…',
  grupos,
}: {
  busca: string
  onBusca: (v: string) => void
  buscaPlaceholder?: string
  grupos: GrupoFiltro[]
}) {
  return (
    <Cartao titulo="Filtros">
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-3" aria-hidden />
          <input
            type="search"
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder={buscaPlaceholder}
            className="block w-full rounded-lg border border-borda-forte bg-white py-2 pl-10 pr-3 text-sm text-tinta placeholder:text-tinta-3 focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
          />
        </div>
        {grupos.map((g) => (
          <div key={g.rotulo} className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 w-24 flex-none text-xs font-semibold text-tinta-3">{g.rotulo}</span>
            <Pilula ativo={!g.valor} onClick={() => g.onChange('')}>Todos</Pilula>
            {g.opcoes.map((o) => (
              <Pilula key={o.valor} ativo={g.valor === o.valor} onClick={() => g.onChange(o.valor)}>{o.rotulo}</Pilula>
            ))}
          </div>
        ))}
      </div>
    </Cartao>
  )
}

function Pilula({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${ativo ? 'border-marca bg-marca-clara text-marca-escura' : 'border-borda-forte bg-white text-tinta-2 hover:bg-superficie-2'}`}
    >
      {children}
    </button>
  )
}
