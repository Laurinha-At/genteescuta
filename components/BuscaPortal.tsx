'use client'

// =============================================================
// Busca rápida de navegação do portal (cabeçalho). Filtra os destinos
// conforme a pessoa digita (sem diferenciar maiúsculas/acentos) e
// respeita o papel: só mostra o que o usuário pode acessar.
// =============================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from '@/components/LinkSemPrefetch'
import { Search, CornerDownRight } from 'lucide-react'
import { observarLogin } from '@/lib/fb/auth'
import { minhaConta, type Conta } from '@/lib/fb/usuarios'
import { destinosVisiveis, normalizar, type Destino } from '@/lib/destinos'

export function BuscaPortal({ className = 'w-full' }: { className?: string }) {
  const [conta, setConta] = useState<Conta | null>(null)
  const [termo, setTermo] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const off = observarLogin(async () => {
      setConta(await minhaConta().catch(() => null))
    })
    return off
  }, [])

  // Fecha a lista ao clicar fora.
  useEffect(() => {
    if (!termo) return
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setTermo('')
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [termo])

  const destinos = useMemo(() => destinosVisiveis(conta), [conta])

  const resultados = useMemo(() => {
    const q = normalizar(termo.trim())
    if (!q) return []
    return destinos
      .filter((d) => normalizar(`${d.nome} ${d.caminho.join(' ')}`).includes(q))
      .slice(0, 8)
  }, [termo, destinos])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <label className="relative block">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tinta-3" aria-hidden />
        <input
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Pesquisar no portal..."
          aria-label="Pesquisar no portal"
          className="block w-full rounded-full border border-borda-forte bg-white py-1.5 pl-8 pr-3 text-[0.8125rem] text-tinta transition-colors placeholder:text-tinta-3 hover:border-[#c4bdb2] focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
        />
      </label>

      {termo.trim() && (
        <div className="absolute left-0 right-0 z-50 mt-2 min-w-[16rem] overflow-hidden rounded-xl border border-borda bg-white shadow-[0_10px_28px_rgba(0,36,67,0.16)]">
          {resultados.length === 0 ? (
            <p className="px-3 py-3 text-sm text-tinta-3">Nada encontrado para “{termo.trim()}”.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-borda overflow-y-auto">
              {resultados.map((d: Destino) => (
                <li key={d.href}>
                  <Link
                    href={d.href}
                    onClick={() => setTermo('')}
                    className="flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-superficie-2"
                  >
                    <CornerDownRight size={15} className="mt-0.5 flex-none text-marca" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-tinta">{d.nome}</span>
                      <span className="block truncate text-xs text-tinta-3">{d.caminho.join(' › ')}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
