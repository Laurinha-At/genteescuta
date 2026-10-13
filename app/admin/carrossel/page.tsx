'use client'

import { CabecalhoPagina } from '@/components/ui'
import { GestaoCarrossel } from '@/components/GestaoCarrossel'

export default function AdminCarrossel() {
  return (
    <>
      <CabecalhoPagina
        titulo="Carrossel"
        descricao="Configure o carrossel de informações e gerencie os slides. As mudanças aparecem no site na hora."
        voltar={{ href: '/', rotulo: 'Ver página pública' }}
      />
      <div className="max-w-4xl space-y-4 p-4 sm:p-6">
        <GestaoCarrossel />
      </div>
    </>
  )
}
