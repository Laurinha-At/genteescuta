'use client'

// Unificada em "Pesquisa de Clima" (aba Clima). Mantém o link antigo vivo.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClimaRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/admin/pesquisa-clima?aba=clima') }, [router])
  return <p className="p-6 text-sm text-tinta-3">Esta página foi unificada em “Pesquisa de Clima”. Redirecionando…</p>
}
