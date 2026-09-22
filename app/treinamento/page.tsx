'use client'

import { useEffect, useState } from 'react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { observarLogin } from '@/lib/fb/auth'
import { perfilAtual, type Perfil } from '@/lib/fb/funcionarios'
import { getProgresso, type ProgressoTreino } from '@/lib/fb/treino'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'
import { TrilhasApp } from '@/components/Treino'

export default function Treinamento() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined)
  const [prog, setProg] = useState<ProgressoTreino | null>(null)

  useEffect(() => {
    if (!configurado()) return
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
    const cancelar = observarLogin(async (u) => {
      const p = u ? await perfilAtual().catch(() => null) : null
      setPerfil(p)
      setProg(await getProgresso().catch(() => ({ etapas: {}, trilhas: {}, pontos: 0 })))
    })
    return cancelar
  }, [])

  if (!configurado()) return <TelaConfiguracao />

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        {perfil === undefined || prog === null ? (
          <p className="text-sm text-tinta-3">Carregando trilhas…</p>
        ) : (
          <TrilhasApp perfil={perfil} progInicial={prog} />
        )}
      </main>
      <RodapePublico />
    </div>
  )
}
