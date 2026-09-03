'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CalendarX, Lock } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig, getPesquisaPorSlug } from '@/lib/fb/publico'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'
import { FormPesquisa } from '@/components/FormPesquisa'
import { BotaoLink } from '@/components/ui'
import { fmtData } from '@/lib/format'

function ResponderConteudo() {
  const params = useSearchParams()
  const slug = params.get('slug') ?? ''
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')
  const [pesquisa, setPesquisa] = useState<any>(null)
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'indisponivel' | 'inexistente'>('carregando')

  useEffect(() => {
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
    if (!slug) {
      setEstado('inexistente')
      return
    }
    getPesquisaPorSlug(slug)
      .then((p) => {
        if (!p) return setEstado('inexistente')
        const expirada = Boolean(p.fecha_em && new Date(p.fecha_em) < new Date())
        if (p.status !== 'aberta' || expirada) {
          setPesquisa(p)
          setEstado('indisponivel')
        } else {
          setPesquisa(p)
          setEstado('ok')
        }
      })
      .catch(() => setEstado('inexistente'))
  }, [slug])

  if (estado === 'carregando') {
    return (
      <div className="min-h-screen">
        <CabecalhoPublico empresa={empresa} />
        <main className="mx-auto max-w-3xl px-4 py-16 text-sm text-tinta-3">Carregando…</main>
      </div>
    )
  }

  if (estado !== 'ok') {
    const encerrada = pesquisa?.status === 'encerrada' || (pesquisa?.fecha_em && new Date(pesquisa.fecha_em) < new Date())
    return (
      <div className="min-h-screen">
        <CabecalhoPublico empresa={empresa} />
        <main className="mx-auto max-w-xl px-4 py-16">
          <div className="cartao-g p-7 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-plano text-tinta-3">
              {encerrada ? <CalendarX size={22} aria-hidden /> : <Lock size={22} aria-hidden />}
            </span>
            <h1 className="mt-4 text-lg font-semibold text-tinta">
              {estado === 'inexistente'
                ? 'Pesquisa não encontrada'
                : encerrada
                  ? 'Esta pesquisa foi encerrada'
                  : 'Esta pesquisa ainda não abriu'}
            </h1>
            <p className="texto-leitura mt-3">
              {estado === 'inexistente'
                ? 'Confira o link. Ele pode ter sido digitado errado.'
                : encerrada
                  ? `O prazo para responder terminou${pesquisa?.fecha_em ? ` em ${fmtData(pesquisa.fecha_em)}` : ''}. Obrigado a quem participou.`
                  : 'Assim que ela for liberada, o link volta a funcionar. Guarde este endereço.'}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <BotaoLink href="/canal" variante="secundario">
                Enviar uma manifestação
              </BotaoLink>
              <BotaoLink href="/">Ir para o início</BotaoLink>
            </div>
          </div>
        </main>
        <RodapePublico />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <FormPesquisa pesquisa={pesquisa} secoes={pesquisa.secoes ?? []} perguntas={pesquisa.perguntas ?? []} />
      </main>
      <RodapePublico />
    </div>
  )
}

export default function Responder() {
  if (!configurado()) return <TelaConfiguracao />
  return (
    <Suspense fallback={null}>
      <ResponderConteudo />
    </Suspense>
  )
}
