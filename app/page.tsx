'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, LifeBuoy, GraduationCap, Receipt, ClipboardList, Cake, MessageSquarePlus } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { Carrossel } from '@/components/Carrossel'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'

type CardHome = { href: string; titulo: string; frase: string; Icone: typeof LifeBuoy; cor: string; destaque?: boolean }

// "Sobre nós" e "Missão, Visão e Valores" saíram daqui e viraram itens do
// rodapé (RodapePublico), acessíveis de qualquer página.
const CARDS: CardHome[] = [
  { href: '/canal', titulo: 'Compartilhe sua voz', frase: 'Tem uma ideia, sugestão ou reconhecimento? Envie a sua manifestação.', Icone: MessageSquarePlus, cor: 'var(--gradiente)' },
  { href: '/aniversariantes', titulo: 'Aniversariantes do mês', frase: 'Veja quem aniversaria e quem completa tempo de casa neste mês.', Icone: Cake, cor: 'linear-gradient(135deg, #2f9e8a 0%, #1c6350 100%)' },
  { href: '/informacoes-administrativas', titulo: 'Informações Administrativas', frase: 'Aqui você encontra acessos e informações importantes para facilitar sua rotina, consultar documentos, e acompanhar os principais processos administrativos da Soulan.', Icone: ClipboardList, cor: 'linear-gradient(135deg, #4a6fa5 0%, #263a5c 100%)' },
  { href: '/contato', titulo: 'Contato e Suporte', frase: 'Fale com a equipe de Gente & Cultura.', Icone: LifeBuoy, cor: 'linear-gradient(135deg, #2a7897 0%, #123f52 100%)' },
  { href: '/treinamento', titulo: 'Treinamento e Desenvolvimento', frase: 'Trilhas de aprendizagem: leia, responda e conquiste.', Icone: GraduationCap, cor: 'linear-gradient(135deg, #3f7db0 0%, #223f6a 100%)' },
  { href: '/reembolso', titulo: 'Solicitação de Reembolso', frase: 'Peça reembolsos, anexe o comprovante e acompanhe a aprovação.', Icone: Receipt, cor: 'linear-gradient(135deg, #2a7897 0%, #557d26 100%)' },
]

export default function Inicio() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')

  useEffect(() => {
    if (!configurado()) return
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
  }, [])

  if (!configurado()) return <TelaConfiguracao />

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />

      {/* -------- Banner full-bleed -------- */}
      <section className="banner-hero">
        <div className="banner-bg" aria-hidden />
        <img
          src="/capa-soulan.png"
          alt="Equipe da Soulan de costas, com a frase “Eu te ajudo a trabalhar mais feliz” nas camisetas"
          className="banner-img"
        />
      </section>

      <main className="mx-auto max-w-7xl px-4 pt-10">
        {/* -------- Carrossel de notícias (aniversariantes, mural, …) -------- */}
        <Carrossel />

        {/* -------- Grade de cards -------- */}
        <section className="mb-14">
          <h2 className="titulo-secao text-tinta">Explore o Gente Cultura</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARDS.map(({ href, titulo, frase, Icone, cor, destaque }) => (
              <Link
                key={href}
                href={href}
                style={{ background: cor }}
                className={`group flex flex-col items-center gap-3 rounded-2xl p-5 text-center text-white transition-transform hover:-translate-y-1 sm:p-6 [text-shadow:0_1px_6px_rgba(0,0,0,0.22)] ${
                  destaque
                    ? 'shadow-[0_10px_30px_rgba(78,155,46,0.4)] ring-2 ring-[#4e9b2e] ring-offset-2 ring-offset-white'
                    : 'shadow-[0_6px_18px_rgba(26,23,20,0.14)]'
                }`}
              >
                {destaque && (
                  <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide [text-shadow:none]">Destaque</span>
                )}
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                  <Icone size={22} aria-hidden />
                </span>
                <span className="text-base font-semibold tracking-[-0.012em]">{titulo}</span>
                <span className="text-sm leading-6 text-white/90">{frase}</span>
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-semibold">
                  Abrir
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </section>

      </main>

      <RodapePublico />
    </div>
  )
}
