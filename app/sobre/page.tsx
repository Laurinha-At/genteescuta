'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { getSobre, SOBRE_PADRAO, type SobreConfig } from '@/lib/fb/institucional'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'

export default function Sobre() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')
  const [s, setS] = useState<SobreConfig>(SOBRE_PADRAO)

  useEffect(() => {
    if (!configurado()) return
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
    getSobre().then(setS).catch(() => {})
  }, [])

  if (!configurado()) return <TelaConfiguracao />

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-3 transition-colors hover:text-marca">
          <ArrowLeft size={15} aria-hidden /> Início
        </Link>

        {/* Mosaico de capa (fotos do escritório) */}
        <div className="mt-4 grid gap-3 sm:h-[26rem] sm:grid-cols-3 sm:grid-rows-2">
          <img src="/sobre-2.jpg" alt="Parede de boas-vindas da Soulan" className="h-56 w-full rounded-2xl object-cover shadow-[0_6px_18px_rgba(26,23,20,0.1)] sm:col-span-2 sm:row-span-2 sm:h-full" />
          <img src="/sobre-1.jpg" alt="Eu te ajudo a trabalhar mais feliz" className="h-40 w-full rounded-2xl object-cover shadow-[0_6px_18px_rgba(26,23,20,0.1)] sm:h-full" />
          <img src="/sobre-3.jpg" alt="Sala de treinamento da Soulan" className="h-40 w-full rounded-2xl object-cover shadow-[0_6px_18px_rgba(26,23,20,0.1)] sm:h-full" />
        </div>

        <h1 className="titulo-hero mt-6 text-[1.875rem] text-tinta">{s.titulo}</h1>
        {s.subtitulo && <p className="mt-2 text-[1.0625rem] text-tinta-2">{s.subtitulo}</p>}

        <div className="mt-6 overflow-hidden rounded-2xl border border-borda bg-white shadow-[0_1px_3px_rgba(26,23,20,0.04),0_4px_12px_rgba(26,23,20,0.06)]">
          <div className="h-1.5 w-full" style={{ background: 'var(--gradiente-suave)' }} aria-hidden />
          <div className="space-y-3 p-6 text-[0.9688rem] leading-7 text-tinta-2 sm:p-8">
            {s.blocos.map((b, i) =>
              b.tipo === 'sub' ? (
                <h2 key={i} className="pt-3 text-[0.9375rem] font-semibold text-tinta">{b.texto}</h2>
              ) : (
                <p key={i} className="whitespace-pre-wrap">{b.texto}</p>
              ),
            )}

            {s.destaque && (
              <div className="mt-2 rounded-xl bg-marca-clara px-4 py-3">
                <p className="font-semibold text-marca-escura">“{s.destaque}”</p>
              </div>
            )}

            {s.link_url && (
              <div className="pt-3">
                <a
                  href={s.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-marca-texto transition-colors hover:text-marca-escura"
                >
                  {s.link_texto || 'Saiba mais'}
                  <ExternalLink size={14} aria-hidden />
                </a>
              </div>
            )}
          </div>
        </div>
        {/* -------- Nossa equipe -------- */}
        <section className="mt-6 grid items-stretch overflow-hidden rounded-2xl border border-borda shadow-[0_1px_3px_rgba(26,23,20,0.04),0_10px_30px_rgba(26,23,20,0.12)] md:grid-cols-[minmax(0,20rem)_1fr]">
          <div className="flex flex-col justify-center p-8 text-white sm:p-10 [text-shadow:0_1px_6px_rgba(0,0,0,0.18)]" style={{ background: 'var(--gradiente)' }}>
            <h2 className="text-2xl font-bold tracking-[-0.01em] sm:text-3xl">Nossa equipe 💙</h2>
            <p className="mt-3 text-[1.0625rem] leading-8 text-white/95">
              Quem faz o jeito Soulan acontecer todos os dias
            </p>
          </div>
          <div className="relative min-h-[18rem] md:min-h-[30rem]">
            <img src="/sobre-equipe.webp" alt="Equipe da Soulan reunida" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </section>
      </main>
      <RodapePublico />
    </div>
  )
}
