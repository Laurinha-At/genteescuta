'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { HeartPulse, ClipboardList } from 'lucide-react'
import { CabecalhoPagina } from '@/components/ui'
import { ClimaPainel } from '@/components/ClimaPainel'
import { PesquisasPainel } from '@/components/PesquisasPainel'

type Aba = 'clima' | 'pesquisa'

function Conteudo() {
  const params = useSearchParams()
  const inicial: Aba = params.get('aba') === 'pesquisa' ? 'pesquisa' : 'clima'
  const [aba, setAba] = useState<Aba>(inicial)

  const ABAS: { id: Aba; rotulo: string; Icone: typeof HeartPulse }[] = [
    { id: 'clima', rotulo: 'Clima', Icone: HeartPulse },
    { id: 'pesquisa', rotulo: 'Pesquisa', Icone: ClipboardList },
  ]

  return (
    <>
      <CabecalhoPagina
        titulo="Pesquisa de Clima"
        descricao="Indicadores de clima (NR-1, eNPS) e a gestão das pesquisas, em um só lugar."
      />
      <div className="p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap gap-2">
          {ABAS.map(({ id, rotulo, Icone }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAba(id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                aba === id ? 'bg-marca text-white' : 'border border-borda-forte bg-white text-tinta-2 hover:border-marca hover:text-marca-texto'
              }`}
            >
              <Icone size={15} aria-hidden /> {rotulo}
            </button>
          ))}
        </div>

        {aba === 'clima' ? <ClimaPainel /> : <PesquisasPainel />}
      </div>
    </>
  )
}

export default function PesquisaDeClima() {
  return <Suspense fallback={null}><Conteudo /></Suspense>
}
