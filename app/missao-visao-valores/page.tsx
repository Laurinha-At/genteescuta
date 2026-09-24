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
        <h1 className="titulo-hero mt-4 text-[2rem] text-tinta">Missão, Visão e Valores</h1>
        <p className="mt-2 max-w-2xl text-[1.0625rem] leading-7 text-tinta-2">O que guia a forma como a Soulan cuida de pessoas, todos os dias.</p>

        <div className="mt-8 space-y-6">
          {/* -------- Visão (imagem à esquerda) -------- */}
          <section className="grid overflow-hidden rounded-2xl border border-borda bg-white shadow-[0_1px_3px_rgba(26,23,20,0.04),0_8px_24px_rgba(26,23,20,0.08)] md:grid-cols-2">
            <div className="relative h-56 md:h-auto">
              <img src="/mvv-visao.jpg" alt="" className="h-full w-full object-cover" />
            </div>
            <div className="p-6 sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3e1] text-verde-escuro">
                <Eye size={22} aria-hidden />
              </span>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-tinta">Visão</h2>
              <p className="mt-2 whitespace-pre-wrap text-[0.9688rem] leading-7 text-tinta-2">{m.visao}</p>
            </div>
          </section>

          {/* -------- Missão (imagem à direita no desktop) -------- */}
          <section className="grid overflow-hidden rounded-2xl border border-borda bg-white shadow-[0_1px_3px_rgba(26,23,20,0.04),0_8px_24px_rgba(26,23,20,0.08)] md:grid-cols-2">
            <div className="order-1 p-6 sm:p-8 md:order-none">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-marca-clara text-marca">
                <Target size={22} aria-hidden />
              </span>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-tinta">Missão</h2>
              <p className="mt-2 whitespace-pre-wrap text-[0.9688rem] leading-7 text-tinta-2">{m.missao}</p>
            </div>
            <div className="relative h-56 md:h-auto">
              <img src="/mvv-missao.jpg" alt="" className="h-full w-full object-cover" />
            </div>
          </section>

          {/* -------- Valores (banner + grade) -------- */}
          <section className="overflow-hidden rounded-2xl border border-borda bg-white shadow-[0_1px_3px_rgba(26,23,20,0.04),0_8px_24px_rgba(26,23,20,0.08)]">
            <div className="relative h-44 sm:h-56">
              <img src="/mvv-valores.webp" alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-5 sm:p-6 [text-shadow:0_1px_6px_rgba(0,0,0,0.35)]">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-white/25 text-white backdrop-blur">
                  <Gem size={22} aria-hidden />
                </span>
                <h2 className="text-2xl font-semibold tracking-[-0.01em] text-white">Valores Fundamentais</h2>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <p className="whitespace-pre-wrap text-[0.9688rem] leading-7 text-tinta-2">{m.intro_valores}</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {m.valores.map((v, i) => (
                  <li key={i} className="rounded-xl border border-borda bg-superficie-2 p-4">
                    <p className="text-[0.9375rem] font-semibold text-tinta">{v.nome}</p>
                    {v.desc && <p className="mt-1 text-sm leading-6 text-tinta-2">{v.desc}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </main>
      <RodapePublico />
    </div>
  )
}
