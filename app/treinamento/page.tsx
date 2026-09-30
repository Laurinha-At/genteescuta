'use client'

import { useEffect, useState } from 'react'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { observarLogin } from '@/lib/fb/auth'
import { perfilAtual, type Perfil } from '@/lib/fb/funcionarios'
import { getProgresso, type ProgressoTreino } from '@/lib/fb/treino'
import { listarTrilhas, getTreinamentoEmBreve } from '@/lib/fb/treinos'
import { type Trilha } from '@/lib/treinamentos'
import { GraduationCap } from 'lucide-react'
import { BotaoVoltar } from '@/components/BotaoVoltar'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'
import { TrilhasApp } from '@/components/Treino'

export default function Treinamento() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined)
  const [prog, setProg] = useState<ProgressoTreino | null>(null)
  const [trilhas, setTrilhas] = useState<Trilha[] | null>(null)
  const [emBreve, setEmBreve] = useState<boolean | null>(null)

  useEffect(() => {
    if (!configurado()) return
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
    getTreinamentoEmBreve().then(setEmBreve).catch(() => setEmBreve(true))
    listarTrilhas().then((r) => setTrilhas(r.trilhas)).catch(() => setTrilhas([]))
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
        {emBreve === null ? (
          <p className="text-sm text-tinta-3">Carregando…</p>
        ) : emBreve ? (
          <>
            <BotaoVoltar />
            <div className="mt-6 cartao-g mx-auto max-w-lg p-8 text-center sm:p-10">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-marca-clara text-marca">
                <GraduationCap size={30} aria-hidden />
              </span>
              <h1 className="titulo-hero mt-5 text-[1.75rem] text-tinta">Treinamento e Desenvolvimento</h1>
              <p className="mt-3 text-[0.9688rem] leading-7 text-tinta-2">
                Estamos preparando as trilhas de aprendizagem. <strong className="font-semibold text-tinta">Em breve</strong> você poderá
                ler, responder e conquistar por aqui. Fique de olho! 🚀
              </p>
            </div>
          </>
        ) : perfil === undefined || prog === null || trilhas === null ? (
          <p className="text-sm text-tinta-3">Carregando trilhas…</p>
        ) : (
          <TrilhasApp perfil={perfil} progInicial={prog} trilhas={trilhas} />
        )}
      </main>
      <RodapePublico />
    </div>
  )
}
