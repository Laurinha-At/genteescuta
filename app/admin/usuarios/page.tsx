'use client'

// A gestão de usuários e acessos foi UNIFICADA na página de Funcionários.
// Esta rota agora apenas redireciona para lá (mantém links antigos vivos).
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UsuariosRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/admin/funcionarios') }, [router])
  return <p className="p-6 text-sm text-tinta-3">Esta página foi unificada em “Funcionários e acessos”. Redirecionando…</p>
}
