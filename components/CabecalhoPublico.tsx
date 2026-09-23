'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { LogIn, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react'
import { observarLogin, sair, type User } from '@/lib/fb/auth'
import { perfilAtual, type Perfil } from '@/lib/fb/funcionarios'

/** Menu suspenso "Sobre Nós" com as duas páginas institucionais. */
function MenuSobre() {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  const item = 'block px-4 py-2.5 text-[0.8125rem] font-medium text-tinta-2 transition-colors hover:bg-superficie-2 hover:text-marca-texto'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-tinta-2 transition-colors hover:text-marca-texto"
      >
        Sobre Nós
        <ChevronDown size={14} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {aberto && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-borda bg-white py-1 shadow-[0_8px_24px_rgba(26,23,20,0.12)]"
        >
          <Link href="/sobre" role="menuitem" onClick={() => setAberto(false)} className={item}>Gente e Cultura</Link>
          <Link href="/missao-visao-valores" role="menuitem" onClick={() => setAberto(false)} className={item}>Missão, Visão e Valores</Link>
        </div>
      )}
    </div>
  )
}

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
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo-soulan.png" alt={empresa} className="h-9 w-auto sm:h-10" />
            <span className="hidden items-center gap-3 sm:flex">
              <span className="h-6 w-px bg-borda-forte" aria-hidden />
              <span className="text-[0.9375rem] font-[620] tracking-[-0.018em] text-tinta">Gente Cultura</span>
            </span>
          </Link>

          {/* Menu institucional "Sobre Nós", sempre visível no topo. */}
          <nav className="flex items-center">
            <MenuSobre />
          </nav>
        </div>

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

            {/* Ninguém logado: um único acesso. O nível (colaborador, gestor,
                financeiro, master) é decidido pelo e-mail autenticado. */}
            {!logado && (
              <Link
                href="/entrar"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe0e8] bg-marca-clara px-3.5 py-1.5 font-semibold text-marca-escura transition-colors hover:border-marca hover:bg-white"
              >
                <LogIn size={15} aria-hidden /> Acesso
              </Link>
            )}

            {/* Logado (Comum ou admin): sair. O reembolso fica só como card. */}
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
      <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-tinta-3">
        <p>© {new Date().getFullYear()} Soulan Recursos Humanos</p>
      </div>
    </footer>
  )
}
