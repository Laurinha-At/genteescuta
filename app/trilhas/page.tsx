'use client'

import { useEffect, useState } from 'react'
import { Rocket } from 'lucide-react'
import { BotaoVoltar } from '@/components/BotaoVoltar'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'
import { TrilhasColaborador } from '@/components/TrilhasColaborador'

export default function Trilhas() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')

  useEffect(() => {
    if (!configurado()) return
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
  }, [])

  if (!configurado()) return <TelaConfiguracao />

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <BotaoVoltar />
        <div className="mt-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-marca-clara text-marca">
            <Rocket size={22} aria-hidden />
          </span>
          <h1 className="titulo-hero mt-4 text-[1.75rem] text-tinta">Trilhas de Desenvolvimento</h1>
          <p className="mt-2 max-w-2xl text-[0.9688rem] leading-7 text-tinta-2">
            Avance pelas atividades, conclua as trilhas e some pontos. Cada trilha libera uma atividade de cada vez.
          </p>
        </div>

        <div className="mt-6">
          <TrilhasColaborador />
        </div>
      </main>
      <RodapePublico />
    </div>
  )
}
