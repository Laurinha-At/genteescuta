'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, LifeBuoy, Mail, ShieldCheck } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'

const EMAIL_CONTATO = 'gentecultura@soulan.com.br'

export default function Contato() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')

  useEffect(() => {
    if (!configurado()) return
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
  }, [])

  if (!configurado()) return <TelaConfiguracao />

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-3 transition-colors hover:text-marca">
          <ArrowLeft size={15} aria-hidden /> Início
        </Link>

        <div className="mt-6 cartao-g p-6 sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-marca-clara text-marca">
            <LifeBuoy size={22} aria-hidden />
          </span>
          <h1 className="titulo-hero mt-4 text-[1.75rem] text-tinta">Contato e Suporte</h1>
          <p className="mt-3 text-[0.9688rem] leading-7 text-tinta-2">
            Precisa de ajuda ou quer falar diretamente com a equipe de{' '}
            <strong className="font-semibold text-tinta">Gente &amp; Cultura</strong>? A gente responde.
          </p>

          <a
            href={`mailto:${EMAIL_CONTATO}`}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-borda-forte bg-white px-4 py-3 text-sm font-medium text-tinta transition-colors hover:border-marca hover:text-marca-texto"
          >
            <Mail size={17} className="flex-none text-marca" aria-hidden />
            {EMAIL_CONTATO}
          </a>

          <p className="mt-5 flex items-start gap-2 rounded-lg bg-superficie-2 px-4 py-3 text-xs leading-5 text-tinta-2">
            <ShieldCheck size={15} className="mt-0.5 flex-none text-verde-escuro" aria-hidden />
            Para relatos que exigem sigilo, você também pode usar o próprio canal do Gente Escuta, de forma anônima.
          </p>
        </div>
      </main>
      <RodapePublico />
    </div>
  )
}
