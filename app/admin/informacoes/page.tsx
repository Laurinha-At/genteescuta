'use client'

import { useEffect, useState } from 'react'
import { CabecalhoPagina } from '@/components/ui'
import { perfilAtual, type Perfil } from '@/lib/fb/funcionarios'
import { InfoAdminApp } from '@/components/InfoAdmin'

export default function AdminInformacoes() {
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined)

  useEffect(() => {
    perfilAtual().then(setPerfil).catch(() => setPerfil(null))
  }, [])

  return (
    <>
      <CabecalhoPagina
        titulo="Informações Administrativas"
        descricao="Crie e organize os tópicos e itens da página pública. As mudanças aparecem no site na hora."
        voltar={{ href: '/informacoes-administrativas', rotulo: 'Ver página pública' }}
      />
      <div className="max-w-6xl p-4 sm:p-6">
        {perfil === undefined ? (
          <p className="text-sm text-tinta-3">Carregando…</p>
        ) : perfil && perfil.tipo === 'admin' && perfil.ativo ? (
          <InfoAdminApp perfil={perfil} />
        ) : (
          <p className="text-sm text-tinta-3">Acesso restrito ao Master.</p>
        )}
      </div>
    </>
  )
}
