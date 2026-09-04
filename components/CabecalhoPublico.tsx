'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Lock, UserRound, LogOut, LayoutDashboard } from 'lucide-react'
import { observarLogin, sair, type User } from '@/lib/fb/auth'
import { perfilAtual, type Perfil } from '@/lib/fb/funcionarios'

export function CabecalhoPublico({ empresa }: { empresa: string }) {
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined)

  useEffect(() => {
    const cancelar = observarLogin(async (u: User | null) => {
      setPerfil(u ? await perfilAtual().catch(() => null) : null)
    })
    return cancelar
  }, [])

  const ehAdmin = perfil?.tipo === 'admin' && perfil.ativo
  const logado = perfil?.tipo === 'admin' || perfil?.tipo === 'funcionario' || perfil?.tipo === 'nenhum'

  return (
    <header className="sticky top-0 z-40 border-b border-borda bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo-soulan.png" alt={empresa} className="h-9 w-auto sm:h-10" />
          <span className="hidden items-center gap-3 sm:flex">
            <span className="h-6 w-px bg-borda-forte" aria-hidden />
            <span className="text-[0.9375rem] font-[620] tracking-[-0.018em] text-tinta">Gente Escuta</span>
          </span>
        </Link>

        {/* Só renderiza os botões depois de saber o perfil, para o Comum nunca
            enxergar (nem de relance) o botão do ADM. */}
        {perfil !== undefined && (
          <nav className="flex items-center gap-2 text-[0.8125rem]">
            {/* Admin: atalho para o painel */}
            {ehAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe0e8] bg-marca-clara px-3.5 py-1.5 font-semibold text-marca-escura transition-colors hover:border-marca hover:bg-white"
              >
                <LayoutDashboard size={14} aria-hidden /> Painel ADM
              </Link>
            )}

            {/* Ninguém logado: entradas de login (admin acessa o ADM por aqui) */}
            {!logado && (
              <>
                <Link
                  href="/entrar"
                  className="inline-flex items-center gap-1.5 rounded-full border border-borda-forte bg-white px-3.5 py-1.5 font-semibold text-tinta transition-colors hover:border-marca hover:text-marca-texto"
                >
                  <UserRound size={15} aria-hidden /> Sou funcionário
                </Link>
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe0e8] bg-marca-clara px-3.5 py-1.5 font-semibold text-marca-escura transition-colors hover:border-marca hover:bg-white"
                >
                  <Lock size={14} aria-hidden /> Administrativo
                </Link>
              </>
            )}

            {/* Logado (Comum ou admin): sair. O Comum NÃO vê botão de ADM. */}
            {logado && (
              <button
                type="button"
                onClick={() => sair()}
                className="inline-flex items-center gap-1.5 rounded-full border border-borda-forte bg-white px-3.5 py-1.5 font-semibold text-tinta transition-colors hover:text-critico"
              >
                <LogOut size={14} aria-hidden /> Sair
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}

export function RodapePublico() {
  return (
    <footer className="mt-20 border-t border-borda bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-tinta-3">
        <p>© {new Date().getFullYear()} Soulan Recursos Humanos</p>
      </div>
    </footer>
  )
}
