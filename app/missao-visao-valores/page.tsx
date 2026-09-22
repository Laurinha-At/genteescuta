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
                <p className="mt-1 text-[0.9688rem] leading-7 text-tinta-2">
                  Nossa visão é ser reconhecida como a principal Consultoria de RH, Líder em Gestão de Pessoas. Isso
                  significa que nos dedicamos a fornecer as melhores práticas e soluções que promovem o sucesso de
                  nossos clientes e colaboradores.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-marca-clara text-marca">
                <Target size={19} aria-hidden />
              </span>
              <div>
                <h2 className="text-[0.9375rem] font-semibold text-tinta">Missão</h2>
                <p className="mt-1 text-[0.9688rem] leading-7 text-tinta-2">
                  Nossa missão é oferecer produtos e serviços que apoiem a gestão de pessoas, buscando sempre a
                  melhoria da performance e satisfação profissional. Queremos garantir que todos os membros de nossa
                  equipe se sintam motivados e preparados para alcançar seus objetivos.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-marca-clara text-marca">
                <Gem size={19} aria-hidden />
              </span>
              <div>
                <h2 className="text-[0.9375rem] font-semibold text-tinta">Valores Fundamentais</h2>
                <p className="mt-1 text-[0.9688rem] leading-7 text-tinta-2">
                  Para nós, ética é um valor tão fundamental que você inclusive já viu que temos um código inteiro só
                  voltado a isso. Mas além dele, temos outros 4 valores que são essenciais no nosso dia a dia:
                </p>
                <ul className="mt-3 space-y-2.5">
                  {[
                    { nome: 'Trabalho Cooperativo', desc: 'Acreditamos no poder do trabalho colaborativo. Incentivamos uma abordagem que se concentra em ações realistas, autoconfiança e pensamento coletivo. Juntos, podemos alcançar resultados maiores do que alcançaríamos sozinhos.' },
                    { nome: 'Atendimento ao Cliente', desc: 'O atendimento ao cliente é um dos pilares da nossa operação. Praticamos a escuta ativa e estamos sempre atentos a novas oportunidades dentro dos clientes, mantendo a flexibilidade necessária para adaptar nossas rotinas e entregar o melhor serviço.' },
                    { nome: 'Inovação', desc: 'A inovação está no centro de nossa estratégia. Valorizamos a iniciativa na resolução de problemas e a proatividade na proposição de novas soluções. Buscamos constantemente melhorar nossos processos e nos adaptar às mudanças do mercado.' },
                    { nome: 'Ímpeto por Excelência', desc: 'Comprometemo-nos com a excelência em tudo o que fazemos. Incentivamos a conscientização do papel de cada colaborador dentro da organização, o senso de responsabilidade e urgência, e um foco contínuo em medir, acompanhar e alcançar resultados.' },
                  ].map(({ nome, desc }) => (
                    <li key={nome} className="rounded-xl border border-borda bg-superficie-2 px-4 py-3 text-sm leading-6 text-tinta-2">
                      <strong className="font-semibold text-tinta">{nome}</strong> — {desc}
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
