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
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-3 transition-colors hover:text-marca">
          <ArrowLeft size={15} aria-hidden /> Início
        </Link>

        {s.capa && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-borda shadow-[0_1px_3px_rgba(26,23,20,0.04),0_6px_18px_rgba(26,23,20,0.08)]">
            <img src={s.capa} alt="Soulan Recursos Humanos" className="h-44 w-full object-cover sm:h-60 md:h-72" />
          </div>
        )}

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
      </main>
      <RodapePublico />
    </div>
  )
}
