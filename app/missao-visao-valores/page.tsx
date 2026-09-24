'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Target, Eye, Gem } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { getMissao, MISSAO_PADRAO, type MissaoConfig } from '@/lib/fb/institucional'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'

export default function MissaoVisaoValores() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')
  const [m, setM] = useState<MissaoConfig>(MISSAO_PADRAO)

  useEffect(() => {
    if (!configurado()) return
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
    getMissao().then(setM).catch(() => {})
  }, [])

  if (!configurado()) return <TelaConfiguracao />

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-3 transition-colors hover:text-marca">
          <ArrowLeft size={15} aria-hidden /> Início
        </Link>
        <h1 className="titulo-hero mt-4 text-[1.875rem] text-tinta">Missão, Visão e Valores</h1>

        <div className="mt-6 overflow-hidden rounded-2xl border border-borda bg-white shadow-[0_1px_3px_rgba(26,23,20,0.04),0_4px_12px_rgba(26,23,20,0.06)]">
          <div className="h-1.5 w-full" style={{ background: 'var(--gradiente-suave)' }} aria-hidden />
          <ul className="space-y-6 p-6 sm:p-8">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#eaf3e1] text-verde-escuro">
                <Eye size={19} aria-hidden />
              </span>
              <div>
                <h2 className="text-[0.9375rem] font-semibold text-tinta">Visão</h2>
                <p className="mt-1 whitespace-pre-wrap text-[0.9688rem] leading-7 text-tinta-2">{m.visao}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-marca-clara text-marca">
                <Target size={19} aria-hidden />
              </span>
              <div>
                <h2 className="text-[0.9375rem] font-semibold text-tinta">Missão</h2>
                <p className="mt-1 whitespace-pre-wrap text-[0.9688rem] leading-7 text-tinta-2">{m.missao}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-marca-clara text-marca">
                <Gem size={19} aria-hidden />
              </span>
              <div>
                <h2 className="text-[0.9375rem] font-semibold text-tinta">Valores Fundamentais</h2>
                <p className="mt-1 whitespace-pre-wrap text-[0.9688rem] leading-7 text-tinta-2">{m.intro_valores}</p>
                <ul className="mt-3 space-y-2.5">
                  {m.valores.map(({ nome, desc }, i) => (
                    <li key={i} className="rounded-xl border border-borda bg-superficie-2 px-4 py-3 text-sm leading-6 text-tinta-2">
                      <strong className="font-semibold text-tinta">{nome}</strong>{desc ? ` — ${desc}` : ''}
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
