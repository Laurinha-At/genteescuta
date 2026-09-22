'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquarePlus,
  AlertTriangle,
  Lightbulb,
  Wrench,
  Award,
  ArrowLeft,
} from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig, getAreas } from '@/lib/fb/publico'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'
import { FormCanal } from '@/components/FormCanal'
import { TIPO_MANIFESTACAO_DESC, TIPO_MANIFESTACAO_LABEL } from '@/lib/types'
import type { ManifestacaoTipo } from '@/lib/types'

const ICONES: Record<ManifestacaoTipo, typeof MessageSquarePlus> = {
  contribuicao: MessageSquarePlus,
  sugestao: MessageSquarePlus,
  reclamacao: AlertTriangle,
  ideia: Lightbulb,
  melhoria: Wrench,
  reconhecimento: Award,
}
const ORDEM: ManifestacaoTipo[] = ['contribuicao', 'reconhecimento']

function NovoConteudo() {
  const params = useSearchParams()
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')
  const [areas, setAreas] = useState<string[]>([])

  useEffect(() => {
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
    getAreas().then(setAreas).catch(() => {})
  }, [])

  const tipoParam = params.get('tipo')
  const tipo = ORDEM.includes(tipoParam as ManifestacaoTipo)
    ? (tipoParam as ManifestacaoTipo)
    : 'contribuicao'
  const Icone = ICONES[tipo]
  const i = ORDEM.indexOf(tipo)

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <Link
          href="/canal"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-3 transition-colors hover:text-marca"
        >
          <ArrowLeft size={15} aria-hidden /> Escolher outro tipo
        </Link>

        <div className="mt-4 flex items-center gap-3.5">
          <span
            className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl text-white shadow-[0_2px_6px_rgba(26,23,20,0.16)]"
            style={{ background: `var(--serie-${i + 1})` }}
          >
            <Icone size={22} strokeWidth={2} aria-hidden />
          </span>
          <div>
            <h1 className="titulo-hero text-[1.75rem] text-tinta">{TIPO_MANIFESTACAO_LABEL[tipo]}</h1>
            <p className="text-sm text-tinta-2">{TIPO_MANIFESTACAO_DESC[tipo]}</p>
          </div>
        </div>

        <div className="cartao-g mt-7 p-5 sm:p-7">
          <FormCanal areas={areas} tipo={tipo} />
        </div>
      </main>
      <RodapePublico />
    </div>
  )
}

export default function NovaManifestacao() {
  if (!configurado()) return <TelaConfiguracao />
  return (
    <Suspense fallback={null}>
      <NovoConteudo />
    </Suspense>
  )
}
