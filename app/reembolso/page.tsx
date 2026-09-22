'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Receipt, LogIn } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { observarLogin } from '@/lib/fb/auth'
import { perfilAtual, type Perfil } from '@/lib/fb/funcionarios'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'
import { ReembolsoApp } from '@/components/Reembolso'

export default function ReembolsoPage() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined)

  useEffect(() => {
    if (!configurado()) return
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
    const cancelar = observarLogin(async (u) => {
      setPerfil(u ? await perfilAtual().catch(() => null) : null)
    })
    return cancelar
  }, [])

  if (!configurado()) return <TelaConfiguracao />

  const logado = !!perfil && (perfil.tipo === 'admin' || perfil.tipo === 'funcionario') && perfil.ativo

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        {perfil === undefined ? (
          <p className="text-sm text-tinta-3">Carregando…</p>
        ) : logado ? (
          <ReembolsoApp perfil={perfil!} />
        ) : (
          <div className="mx-auto max-w-md">
            <Link href="/" className="text-sm font-medium text-tinta-3 hover:text-marca">← Início</Link>
            <div className="mt-6 cartao-g p-8 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-marca-clara text-marca">
                <Receipt size={26} aria-hidden />
              </span>
              <h1 className="titulo-hero mt-5 text-[1.75rem] text-tinta">Solicitação de Reembolso</h1>
              <p className="mx-auto mt-3 max-w-sm text-[0.9688rem] leading-7 text-tinta-2">
                Esta área é exclusiva para quem tem acesso. Entre com o seu e-mail para solicitar
                reembolsos e acompanhar as aprovações.
              </p>
              <Link
                href="/entrar"
                className="botao-gradiente mt-6 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                <LogIn size={16} aria-hidden /> Entrar
              </Link>
            </div>
          </div>
        )}
      </main>
      <RodapePublico />
    </div>
  )
}
