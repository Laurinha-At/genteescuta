'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, LifeBuoy, Mail, ShieldCheck, Phone, Users } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { getContato, CONTATO_PADRAO, type ContatoConfig } from '@/lib/fb/contato'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'

function telLink(t: string) {
  return `tel:+55${t.replace(/\D/g, '')}`
}

export default function Contato() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')
  const [conteudo, setConteudo] = useState<ContatoConfig>(CONTATO_PADRAO)

  useEffect(() => {
    if (!configurado()) return
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
    getContato().then(setConteudo).catch(() => {})
  }, [])

  if (!configurado()) return <TelaConfiguracao />

  const EMAIL_CONTATO = conteudo.email_contato
  const FOCAIS = conteudo.focais
  const CONTATOS = conteudo.contatos

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
          <p className="mt-3 whitespace-pre-wrap text-[0.9688rem] leading-7 text-tinta-2">{conteudo.intro_topo}</p>

          {EMAIL_CONTATO && (
            <a
              href={`mailto:${EMAIL_CONTATO}`}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-borda-forte bg-white px-4 py-3 text-sm font-medium text-tinta transition-colors hover:border-marca hover:text-marca-texto"
            >
              <Mail size={17} className="flex-none text-marca" aria-hidden />
              {EMAIL_CONTATO}
            </a>
          )}

          {conteudo.aviso_sigilo && (
            <p className="mt-5 flex items-start gap-2 rounded-lg bg-superficie-2 px-4 py-3 text-xs leading-5 text-tinta-2">
              <ShieldCheck size={15} className="mt-0.5 flex-none text-verde-escuro" aria-hidden />
              {conteudo.aviso_sigilo}
            </p>
          )}
        </div>

        {/* -------- Dúvidas e contatos úteis -------- */}
        <div className="mt-6 cartao-g p-6 sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-marca-clara text-marca">
            <Users size={22} aria-hidden />
          </span>
          <h2 className="titulo-hero mt-4 text-[1.5rem] text-tinta">Dúvidas e contatos úteis</h2>
          <p className="mt-3 whitespace-pre-wrap text-[0.9688rem] leading-7 text-tinta-2">{conteudo.intro_focais}</p>

          {/* Responsáveis por assunto */}
          {FOCAIS.length > 0 && (
            <ul className="mt-5 space-y-2">
              {FOCAIS.map(({ assunto, responsaveis }, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg bg-superficie-2 px-3.5 py-2.5 text-sm">
                  <span className="font-semibold text-tinta">{assunto}:</span>
                  <span className="text-tinta-2">{responsaveis}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Diretório */}
          {CONTATOS.length > 0 && (
            <>
              <h3 className="mt-7 text-sm font-semibold text-tinta">Telefones e e-mails</h3>
              <div className="mt-2 divide-y divide-borda overflow-hidden rounded-lg border border-borda">
                {CONTATOS.map(({ nome, cargo, telefone, email }, i) => (
                  <div key={i} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-tinta">{nome}</span>
                      {cargo && <span className="block text-xs text-tinta-3">{cargo}</span>}
                    </span>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      {telefone && (
                        <a href={telLink(telefone)} className="inline-flex items-center gap-1.5 text-tinta-2 transition-colors hover:text-marca-texto">
                          <Phone size={14} className="flex-none text-marca" aria-hidden /> {telefone}
                        </a>
                      )}
                      {email && (
                        <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 text-tinta-2 transition-colors hover:text-marca-texto">
                          <Mail size={14} className="flex-none text-marca" aria-hidden /> {email}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <RodapePublico />
    </div>
  )
}
