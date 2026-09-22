'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, LifeBuoy, Mail, ShieldCheck, Phone, Users } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'

const EMAIL_CONTATO = 'gentecultura@soulan.com.br'

// Quem procurar para cada tipo de situação.
const FOCAIS: { assunto: string; responsaveis: string }[] = [
  { assunto: 'TI', responsaveis: 'Nil' },
  { assunto: 'Gente & Cultura', responsaveis: 'Sarah ou Laura' },
  { assunto: 'Ponto', responsaveis: 'Laura' },
  { assunto: 'Benefícios', responsaveis: 'Edna' },
  { assunto: 'Alterações cadastrais e pagamentos', responsaveis: 'Luciana ou Edilaine' },
  { assunto: 'Equipamentos (Notebook, Celular, Chip)', responsaveis: 'Nathalya ou Fabiana' },
]

// Diretório de contatos.
const CONTATOS: { nome: string; telefone: string; email: string }[] = [
  { nome: 'Nil', telefone: '11 98356-0033', email: 'nil@scavasin.com.br' },
  { nome: 'Sarah', telefone: '11 98212-3474', email: 'sarah.ribeiro@soulan.com.br' },
  { nome: 'Laura', telefone: '11 99102-0882', email: 'laura.antunes@soulan.com.br' },
  { nome: 'Fabiana', telefone: '11 98636-5791', email: 'fabiana@soulan.com.br' },
  { nome: 'Nathalya', telefone: '11 94054-6040', email: 'nathalya.araujo@soulan.com.br' },
  { nome: 'Daniela', telefone: '11 97662-3686', email: 'daniela@soulan.com.br' },
  { nome: 'Luciana', telefone: '11 98171-8659', email: 'luciana.yassuda@souan.com.br' },
  { nome: 'Edna', telefone: '11 97642-9673', email: 'edna@soulan.com.br' },
  { nome: 'Edilaine', telefone: '11 99953-0630', email: 'edilaine@soulan.com.br' },
]

function telLink(t: string) {
  return `tel:+55${t.replace(/\D/g, '')}`
}

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
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
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
            Para relatos que exigem sigilo, você também pode usar o próprio canal do Gente Cultura, de forma anônima.
          </p>
        </div>

        {/* -------- Dúvidas e contatos úteis -------- */}
        <div className="mt-6 cartao-g p-6 sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-marca-clara text-marca">
            <Users size={22} aria-hidden />
          </span>
          <h2 className="titulo-hero mt-4 text-[1.5rem] text-tinta">Dúvidas e contatos úteis</h2>
          <p className="mt-3 text-[0.9688rem] leading-7 text-tinta-2">
            Para facilitar a comunicação e garantir que suas dúvidas sejam rapidamente respondidas, listamos abaixo os
            contatos das pessoas focais para cada tipo de situação. Em caso de necessidade, por favor, entre em contato
            diretamente com o responsável pelo assunto específico:
          </p>

          {/* Responsáveis por assunto */}
          <ul className="mt-5 space-y-2">
            {FOCAIS.map(({ assunto, responsaveis }) => (
              <li key={assunto} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg bg-superficie-2 px-3.5 py-2.5 text-sm">
                <span className="font-semibold text-tinta">{assunto}:</span>
                <span className="text-tinta-2">{responsaveis}</span>
              </li>
            ))}
          </ul>

          {/* Diretório */}
          <h3 className="mt-7 text-sm font-semibold text-tinta">Telefones e e-mails</h3>
          <div className="mt-2 divide-y divide-borda overflow-hidden rounded-lg border border-borda">
            {CONTATOS.map(({ nome, telefone, email }) => (
              <div key={nome} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-semibold text-tinta">{nome}</span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <a href={telLink(telefone)} className="inline-flex items-center gap-1.5 text-tinta-2 transition-colors hover:text-marca-texto">
                    <Phone size={14} className="flex-none text-marca" aria-hidden /> {telefone}
                  </a>
                  <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 text-tinta-2 transition-colors hover:text-marca-texto">
                    <Mail size={14} className="flex-none text-marca" aria-hidden /> {email}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <RodapePublico />
    </div>
  )
}
