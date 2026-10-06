'use client'

// Unificada em "Pesquisa de Clima" (aba Pesquisa). Mantém o link antigo vivo.
// As subrotas (/admin/pesquisas/nova, /ver, /editar, /painel) seguem normais.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PesquisasRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/admin/pesquisa-clima?aba=pesquisa') }, [router])
  return <p className="p-6 text-sm text-tinta-3">Esta página foi unificada em “Pesquisa de Clima”. Redirecionando…</p>
}
