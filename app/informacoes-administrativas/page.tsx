'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, LogIn } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { observarLogin } from '@/lib/fb/auth'
import { perfilAtual, type Perfil } from '@/lib/fb/funcionarios'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'
import { InfoAdminApp } from '@/components/InfoAdmin'

export default function InformacoesAdministrativas() {
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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-marca-clara text-marca">
            <ClipboardList size={22} aria-hidden />
          </span>
          <div>
            <h1 className="titulo-hero text-[1.75rem] text-tinta">Informações Administrativas</h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-[0.9688rem] leading-7 text-tinta-2">
          Consulte orientações sobre ponto, holerite, benefícios, vale-transporte, ferramentas corporativas e outros
          assuntos relacionados à rotina dos colaboradores.
        </p>

        <div className="mt-7">
          {perfil === undefined ? (
            <p className="text-sm text-tinta-3">Carregando…</p>
          ) : logado ? (
            <InfoAdminApp perfil={perfil!} />
          ) : (
            <div className="mx-auto max-w-md">
              <div className="cartao-g p-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-marca-clara text-marca">
                  <ClipboardList size={26} aria-hidden />
                </span>
                <h2 className="titulo-hero mt-5 text-[1.5rem] text-tinta">Área para colaboradores</h2>
                <p className="mx-auto mt-3 max-w-sm text-[0.9688rem] leading-7 text-tinta-2">
                  Entre com o seu e-mail para consultar as informações administrativas da Soulan.
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
        </div>
      </main>
      <RodapePublico />
    </div>
  )
}
