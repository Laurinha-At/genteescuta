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

  // Fotos que alternam com o texto (uma conectando na outra).
  const imgs = [
    { src: '/sobre-2.jpg', alt: 'Parede de boas-vindas da Soulan' },
    { src: '/sobre-1.jpg', alt: 'Eu te ajudo a trabalhar mais feliz' },
    { src: '/sobre-3.jpg', alt: 'Sala de treinamento da Soulan' },
  ]
  // Divide os blocos de texto em até 3 grupos contíguos (um por foto).
  const grupos: SobreConfig['blocos'][] = []
  if (s.blocos.length) {
    const tam = Math.ceil(s.blocos.length / imgs.length)
    for (let i = 0; i < s.blocos.length; i += tam) grupos.push(s.blocos.slice(i, i + tam))
  }

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-3 transition-colors hover:text-marca">
          <ArrowLeft size={15} aria-hidden /> Início
        </Link>

        <h1 className="titulo-hero mt-4 text-[2rem] text-tinta">{s.titulo}</h1>
        {s.subtitulo && <p className="mt-2 max-w-2xl text-[1.0625rem] text-tinta-2">{s.subtitulo}</p>}

        {/* Texto e fotos alternando (uma conectando na outra) */}
        <div className="mt-8 space-y-6">
          {grupos.map((grupo, idx) => {
            const imgLeft = idx % 2 === 0
            const img = imgs[idx % imgs.length]
            return (
              <section key={idx} className="grid overflow-hidden rounded-2xl border border-borda bg-white shadow-[0_1px_3px_rgba(26,23,20,0.04),0_8px_24px_rgba(26,23,20,0.08)] md:grid-cols-2">
                <div className={`relative min-h-[15rem] md:min-h-[22rem] ${imgLeft ? '' : 'md:order-2'}`}>
                  <img src={img.src} alt={img.alt} className="absolute inset-0 h-full w-full object-cover" />
                </div>
                <div className={`flex flex-col justify-center gap-3 p-6 text-[0.9688rem] leading-7 text-tinta-2 sm:p-8 ${imgLeft ? '' : 'md:order-1'}`}>
                  {grupo.map((b, j) =>
                    b.tipo === 'sub' ? (
                      <h2 key={j} className="text-lg font-semibold tracking-[-0.01em] text-tinta">{b.texto}</h2>
                    ) : (
                      <p key={j} className="whitespace-pre-wrap">{b.texto}</p>
                    ),
                  )}
                </div>
              </section>
            )
          })}
        </div>

        {s.destaque && (
          <div className="mt-6 rounded-2xl bg-marca-clara px-6 py-5 text-center">
            <p className="text-xl font-semibold text-marca-escura sm:text-2xl">“{s.destaque}”</p>
          </div>
        )}

        {s.link_url && (
          <div className="mt-6">
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
