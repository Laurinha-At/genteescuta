'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-3 transition-colors hover:text-marca">
          <ArrowLeft size={15} aria-hidden /> Início
        </Link>
        <h1 className="titulo-hero mt-4 text-[1.875rem] text-tinta">Informação, conexão e participação</h1>

        <div className="mt-6 overflow-hidden rounded-2xl border border-borda bg-white shadow-[0_1px_3px_rgba(26,23,20,0.04),0_4px_12px_rgba(26,23,20,0.06)]">
          <div className="h-1.5 w-full" style={{ background: 'var(--gradiente-suave)' }} aria-hidden />
          <div className="space-y-3 p-6 text-[0.9688rem] leading-7 text-tinta-2 sm:p-8">
            <p>
              O <strong className="font-semibold text-tinta">Gente Escuta</strong> é o canal permanente da {empresa}{' '}
              criado para fortalecer a comunicação, a escuta e a conexão entre a empresa e seus colaboradores.
            </p>
            <p>
              Aqui, você poderá enviar sugestões, ideias, oportunidades de melhoria e reconhecimentos aos colegas,
              contribuindo ativamente para a construção de um ambiente cada vez melhor.
            </p>
            <p>
              Além disso, o Gente Escuta será nosso espaço para compartilhar informações, novidades, campanhas,
              comunicados, ações de Gente &amp; Cultura e conteúdos importantes para o dia a dia.
            </p>
            <p>
              Também utilizaremos este canal para trazer conteúdos relacionados à{' '}
              <strong className="font-semibold text-tinta">NR-1</strong> e aos riscos psicossociais no ambiente de
              trabalho, promovendo informação, conscientização, prevenção e cuidado com as pessoas.
            </p>
            <div className="mt-2 rounded-xl bg-marca-clara px-4 py-3">
              <p className="font-semibold text-marca-escura">💙 Sua voz tem espaço aqui.</p>
              <p className="mt-0.5 text-sm leading-6 text-tinta-2">
                Porque ouvir, informar e cuidar também fazem parte da nossa cultura.
              </p>
            </div>
          </div>
        </div>
      </main>
      <RodapePublico />
    </div>
  )
}
