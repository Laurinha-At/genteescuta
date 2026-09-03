'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, GraduationCap, Clock } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'

export default function Treinamento() {
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

        <div className="mt-6 cartao-g p-6 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-marca-clara text-marca">
            <GraduationCap size={26} aria-hidden />
          </span>
          <h1 className="titulo-hero mt-5 text-[1.75rem] text-tinta">Treinamento e Desenvolvimento</h1>
          <p className="mx-auto mt-3 max-w-md text-[0.9688rem] leading-7 text-tinta-2">
            Aqui vamos reunir conteúdos, trilhas e materiais de aprendizagem para o time da {empresa}.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-superficie-2 px-3.5 py-1.5 text-sm font-medium text-tinta-2">
            <Clock size={15} className="text-marca" aria-hidden /> Em breve
          </span>
        </div>
      </main>
      <RodapePublico />
    </div>
  )
}
