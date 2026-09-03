'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Target, Eye, Gem } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'

export default function MissaoVisaoValores() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')

  useEffect(() => {
    if (!configurado()) return
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
  }, [])

  if (!configurado()) return <TelaConfiguracao />

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-3 transition-colors hover:text-marca">
          <ArrowLeft size={15} aria-hidden /> Início
        </Link>
        <h1 className="titulo-hero mt-4 text-[1.875rem] text-tinta">Missão, Visão e Valores</h1>

        <div className="mt-6 grid items-center gap-6 rounded-2xl border border-borda bg-white p-6 shadow-[0_1px_3px_rgba(26,23,20,0.04),0_4px_12px_rgba(26,23,20,0.06)] sm:p-8 md:grid-cols-2 md:gap-8">
          <div className="flex justify-center">
            <img src="/foto-site.png" alt="Missão, Visão e Valores da Soulan" className="h-auto w-full max-w-[400px]" />
          </div>

          <ul className="space-y-5">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-marca-clara text-marca">
                <Target size={19} aria-hidden />
              </span>
              <div>
                <h2 className="text-[0.9375rem] font-semibold text-tinta">Missão</h2>
                <p className="mt-0.5 text-sm leading-6 text-tinta-2">
                  Oferecer uma escuta técnica, ética e segura no ambiente organizacional.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#eaf3e1] text-verde-escuro">
                <Eye size={19} aria-hidden />
              </span>
              <div>
                <h2 className="text-[0.9375rem] font-semibold text-tinta">Visão</h2>
                <p className="mt-0.5 text-sm leading-6 text-tinta-2">
                  Ser referência em acolhimento profissional e prevenção de riscos psicossociais nas empresas.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-marca-clara text-marca">
                <Gem size={19} aria-hidden />
              </span>
              <div>
                <h2 className="text-[0.9375rem] font-semibold text-tinta">Valores</h2>
                <ul className="mt-1.5 flex flex-wrap gap-2">
                  {['Sigilo', 'Ética', 'Respeito', 'Humanização', 'Transparência'].map((v) => (
                    <li key={v} className="rounded-full border border-borda-forte bg-white px-3 py-1 text-xs font-medium text-tinta-2">
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          </ul>
        </div>
      </main>
      <RodapePublico />
    </div>
  )
}
