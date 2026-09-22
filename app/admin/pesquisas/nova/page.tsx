'use client'

import { CabecalhoPagina } from '@/components/ui'
import { FormNovaPesquisa } from '@/components/FormNovaPesquisa'

export default function NovaPesquisa() {
  return (
    <>
      <CabecalhoPagina
        titulo="Nova pesquisa"
        descricao="Escolha o modelo, defina como as pessoas se identificam e o resto vem pronto."
        voltar={{ href: '/admin/pesquisas', rotulo: 'Voltar às pesquisas' }}
      />
      <div className="p-4 sm:p-6">
        <div className="cartao-g max-w-4xl p-5 sm:p-6">
          <FormNovaPesquisa />
        </div>
      </div>
    </>
  )
}
