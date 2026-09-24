'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, LifeBuoy, GraduationCap, Receipt, ClipboardList, Cake, Clock } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'

type CardHome = { href: string; titulo: string; frase: string; Icone: typeof LifeBuoy; cor: string; destaque?: boolean }

// "Sobre nós" e "Missão, Visão e Valores" saíram daqui e viraram itens do
// rodapé (RodapePublico), acessíveis de qualquer página.
const CARDS: CardHome[] = [
  { href: '/aniversariantes', titulo: 'Aniversariantes do mês', frase: 'Veja quem aniversaria e quem completa tempo de casa neste mês.', Icone: Cake, cor: 'linear-gradient(135deg, #2f9e8a 0%, #1c6350 100%)' },
  { href: '/informacoes-administrativas', titulo: 'Informações Administrativas', frase: 'Tudo o que você precisa saber sobre os principais procedimentos administrativos da Soulan.', Icone: ClipboardList, cor: 'linear-gradient(135deg, #4a6fa5 0%, #263a5c 100%)' },
  { href: '/contato', titulo: 'Contato e Suporte', frase: 'Fale com a equipe de Gente & Cultura.', Icone: LifeBuoy, cor: 'linear-gradient(135deg, #2a7897 0%, #123f52 100%)' },
  { href: '/treinamento', titulo: 'Treinamento e Desenvolvimento', frase: 'Trilhas de aprendizagem: leia, responda e conquiste.', Icone: GraduationCap, cor: 'linear-gradient(135deg, #3f7db0 0%, #223f6a 100%)' },
  { href: '/reembolso', titulo: 'Solicitação de Reembolso', frase: 'Peça reembolsos, anexe o comprovante e acompanhe a aprovação.', Icone: Receipt, cor: 'linear-gradient(135deg, #2a7897 0%, #557d26 100%)' },
  { href: '/banco-horas', titulo: 'Banco de Horas', frase: 'Veja o seu saldo de horas do mês. Gestores acompanham a própria área.', Icone: Clock, cor: 'linear-gradient(135deg, #4a6fa5 0%, #223f6a 100%)' },
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
        {/* -------- Card em destaque: enviar manifestação -------- */}
        <section className="mb-8">
          <Link
            href="/canal"
            className="group flex flex-col gap-5 rounded-2xl p-6 text-white shadow-[0_10px_30px_rgba(26,23,20,0.18)] transition-transform hover:-translate-y-1 sm:flex-row sm:items-center sm:justify-between sm:p-8 [text-shadow:0_1px_6px_rgba(0,0,0,0.22)]"
            style={{ background: 'var(--gradiente)' }}
          >
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">Compartilhe sua voz</h2>
              <p className="mt-2 max-w-[54ch] text-[0.9688rem] leading-6 text-white/90">
                Conte para nós o que você pensa, sente ou acredita que pode ser melhorado.
              </p>
            </div>
            <span className="inline-flex flex-none items-center gap-1.5 self-start rounded-full bg-white px-5 py-3 text-base font-semibold text-marca-escura shadow-[0_4px_14px_rgba(0,0,0,0.18)] sm:self-auto [text-shadow:none]">
              Enviar uma manifestação
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </section>

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
