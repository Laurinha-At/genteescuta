'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'

export default function Sobre() {
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
        <h1 className="titulo-hero mt-4 text-[1.875rem] text-tinta">Gente Cultura</h1>
        <p className="mt-2 text-[1.0625rem] text-tinta-2">Informação, comunicação e conexão.</p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-borda bg-white shadow-[0_1px_3px_rgba(26,23,20,0.04),0_4px_12px_rgba(26,23,20,0.06)]">
          <div className="h-1.5 w-full" style={{ background: 'var(--gradiente-suave)' }} aria-hidden />
          <div className="space-y-3 p-6 text-[0.9688rem] leading-7 text-tinta-2 sm:p-8">
            <p>
              O <strong className="font-semibold text-tinta">Gente Cultura</strong> é o canal interno da {empresa},
              criado para fortalecer a comunicação e aproximar a empresa de seus colaboradores.
            </p>
            <p>
              Neste espaço, você encontrará informações institucionais e administrativas, comunicados, novidades,
              benefícios, campanhas, ações de Gente &amp; Cultura, treinamentos e outros conteúdos relevantes para o
              dia a dia na Soulan.
            </p>
            <p>
              O portal também é um espaço de participação. Aqui, você pode compartilhar sugestões, ideias,
              oportunidades de melhoria e reconhecimentos, contribuindo para o desenvolvimento contínuo do nosso
              ambiente de trabalho.
            </p>

            <h2 className="pt-3 text-[0.9375rem] font-semibold text-tinta">Um canal para informar, ouvir e conectar.</h2>
            <p>
              O Gente Cultura reúne, em um só lugar, informações importantes para você acompanhar o que acontece na
              Soulan e participar ativamente da nossa cultura.
            </p>

            <h2 className="pt-3 text-[0.9375rem] font-semibold text-tinta">O jeito Soulan de transformar o trabalho</h2>
            <p>
              Nosso propósito orienta a forma como construímos nossas relações e experiências no ambiente de trabalho:
            </p>
            <div className="mt-2 rounded-xl bg-marca-clara px-4 py-3">
              <p className="font-semibold text-marca-escura">“Eu te ajudo a trabalhar mais feliz.”</p>
            </div>

            <div className="pt-3">
              <a
                href="https://soulan.com.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-marca-texto transition-colors hover:text-marca-escura"
              >
                Conheça a Soulan
                <ExternalLink size={14} aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </main>
      <RodapePublico />
    </div>
  )
}
