'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  MessageSquarePlus,
  AlertTriangle,
  Lightbulb,
  Wrench,
  Award,
  ArrowRight,
} from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'
import { TIPO_MANIFESTACAO_DESC, TIPO_MANIFESTACAO_LABEL } from '@/lib/types'
import type { ManifestacaoTipo } from '@/lib/types'

const ICONES: Record<ManifestacaoTipo, typeof MessageSquarePlus> = {
  sugestao: MessageSquarePlus,
  reclamacao: AlertTriangle,
  ideia: Lightbulb,
  melhoria: Wrench,
  reconhecimento: Award,
}
const ORDEM: ManifestacaoTipo[] = ['sugestao', 'ideia', 'melhoria', 'reconhecimento']

export default function Canal() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')

  useEffect(() => {
    if (!configurado()) return
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
  }, [])

  if (!configurado()) return <TelaConfiguracao />

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="fio-marca mb-6 w-14" aria-hidden />
        <h1 className="titulo-hero text-[2rem] text-tinta">Compartilhe sua voz</h1>
        <p className="texto-leitura mt-3 text-[1.0625rem]">
          Conte para nós o que você pensa, sente ou acredita que pode ser melhorado.
        </p>

        <h2 className="titulo-secao mt-9 text-tinta">Por onde você quer começar?</h2>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {ORDEM.map((tipo, i) => {
            const Icone = ICONES[tipo]
            return (
              <Link
                key={tipo}
                href={`/canal/novo?tipo=${tipo}`}
                className="cartao-g cartao-clicavel group flex flex-col gap-3 p-5"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-[0_2px_6px_rgba(26,23,20,0.14)]"
                  style={{ background: `var(--serie-${i + 1})` }}
                >
                  <Icone size={20} strokeWidth={2} aria-hidden />
                </span>
                <span className="text-[0.9375rem] font-semibold tracking-[-0.014em] text-tinta">
                  {TIPO_MANIFESTACAO_LABEL[tipo]}
                </span>
                <span className="text-[0.8125rem] leading-[1.5] text-tinta-3">
                  {TIPO_MANIFESTACAO_DESC[tipo]}
                </span>
                <span className="mt-1 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-marca-texto">
                  Começar
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            )
          })}
        </div>
      </main>
      <RodapePublico />
    </div>
  )
}
