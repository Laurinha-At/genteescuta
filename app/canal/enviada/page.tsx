'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'
import { BotaoLink, Aviso } from '@/components/ui'

function EnviadaConteudo() {
  const params = useSearchParams()
  const anonima = params.get('a') === '1'
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')

  useEffect(() => {
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div className="cartao-g p-6 sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eff8ef] text-[#0b5d0b]">
            <CheckCircle2 size={24} aria-hidden />
          </span>

          <h1 className="titulo-hero mt-5 text-[1.875rem] text-tinta">Recebemos a sua manifestação 💚</h1>
          <div className="mt-3 space-y-3 text-sm leading-6 text-tinta-2">
            <p>
              Ela já está na fila de análise da equipe de Gente &amp; Cultura. Toda manifestação é lida e
              avaliada com atenção, considerando sua relevância e viabilidade.
            </p>
            <p>Quando uma sugestão ou manifestação resultar em uma iniciativa, ela poderá aparecer no mural.</p>
          </div>

          {anonima && (
            <div className="mt-5">
              <Aviso tom="alerta" titulo="Você enviou de forma anônima">
                Seu nome e e-mail não foram gravados, só a sua área, para que a equipe saiba onde
                agir. Como não há e-mail registrado, não temos como te responder diretamente:
                acompanhe o desfecho pelo mural.
              </Aviso>
            </div>
          )}

          <p className="mt-5 rounded-xl border border-[#cfe6b8] bg-[#f4faec] px-4 py-3 text-sm font-semibold leading-6 text-verde-escuro">
            Obrigada por compartilhar sua opinião e contribuir para a construção de um ambiente cada vez melhor!
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <BotaoLink href="/mural">Ver o mural</BotaoLink>
            <BotaoLink href="/" variante="secundario">
              Voltar ao início
            </BotaoLink>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-tinta-3">
          Quer enviar outra coisa?{' '}
          <Link href="/canal" className="font-medium text-marca hover:underline">
            Abrir uma nova manifestação
          </Link>
        </p>
      </main>
      <RodapePublico />
    </div>
  )
}

export default function Enviada() {
  if (!configurado()) return <TelaConfiguracao />
  return (
    <Suspense fallback={null}>
      <EnviadaConteudo />
    </Suspense>
  )
}
