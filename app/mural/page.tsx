'use client'

import { useEffect, useState } from 'react'
import { Megaphone } from 'lucide-react'
import { configurado } from '@/lib/firebase'
import { getConfig, getPostsMural } from '@/lib/fb/publico'
import { observarLogin } from '@/lib/fb/auth'
import { perfilAtual, type Perfil } from '@/lib/fb/funcionarios'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'
import { MuralFeed } from '@/components/Mural'
import { AniversariantesDia } from '@/components/AniversariantesDia'

export default function Mural() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')
  const [posts, setPosts] = useState<any[]>([])
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!configurado()) return
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
    getPostsMural()
      .then(setPosts)
      .catch(() => {})
      .finally(() => setCarregando(false))
    const cancelar = observarLogin(async (u) => {
      setPerfil(u ? await perfilAtual().catch(() => null) : null)
    })
    return cancelar
  }, [])

  if (!configurado()) return <TelaConfiguracao />

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <div className="mb-7 flex items-start gap-3">
          <span className="mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-marca-clara text-marca">
            <Megaphone size={20} aria-hidden />
          </span>
          <div>
            <h1 className="titulo-hero text-[1.875rem] text-tinta">Nosso Mural | Gente e Cultura</h1>
            <div className="mt-3 space-y-2.5 text-[0.9688rem] leading-relaxed text-tinta-2">
              <p>
                Reconhecimentos, novidades e informações para manter você sempre por dentro de tudo o
                que acontece na nossa empresa. 💙
              </p>
              <p>
                Aqui, além de escutar você, também queremos compartilhar, informar e aproximar.
                Acompanhe as novidades, participe, reaja, deixe seu comentário e faça parte dessa
                construção com a gente!
              </p>
              <p className="font-semibold text-marca-texto">Sua voz importa. Sua participação também!</p>
            </div>
          </div>
        </div>

        <AniversariantesDia />

        {carregando ? (
          <p className="text-sm text-tinta-3">Carregando…</p>
        ) : (
          <MuralFeed posts={posts} perfil={perfil} />
        )}
      </main>
      <RodapePublico />
    </div>
  )
}
