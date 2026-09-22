'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'
import { BotaoLink } from '@/components/ui'

export default function Obrigado() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')
  useEffect(() => {
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
  }, [])

  if (!configurado()) return <TelaConfiguracao />

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <div className="cartao-g p-6 sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eff8ef] text-[#0b5d0b]">
            <CheckCircle2 size={24} aria-hidden />
          </span>
          <h1 className="titulo-hero mt-5 text-[1.875rem] text-tinta">
            Respostas registradas. Obrigado de verdade.
          </h1>
          <p className="mt-3 text-sm leading-6 text-tinta-2">
            O que você respondeu entra no inventário de riscos psicossociais da {empresa} — o
            levantamento que a NR-1 exige e que orienta as ações de saúde e segurança do próximo
            ciclo.
          </p>
          <p className="mt-3 text-sm leading-6 text-tinta-2">
            Os resultados são analisados de forma agregada, nunca resposta por resposta. Grupos
            pequenos demais não aparecem separados no painel, justamente para que ninguém seja
            identificado.
          </p>
          <div className="mt-6 rounded-md border border-borda bg-superficie-2 p-4">
            <p className="text-sm font-medium text-tinta">A escuta não acaba aqui</p>
            <p className="mt-1 text-sm leading-5 text-tinta-2">
              O canal Gente Cultura fica aberto o ano inteiro para sugestões, reclamações, ideias,
              melhorias e reconhecimentos.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <BotaoLink href="/canal" variante="secundario">
                Enviar uma manifestação
              </BotaoLink>
              <BotaoLink href="/mural" variante="secundario">
                Ver o que já foi feito
              </BotaoLink>
            </div>
          </div>
        </div>
      </main>
      <RodapePublico />
    </div>
  )
}
