'use client'

// =============================================================
// Busca rápida de navegação do portal (cabeçalho). Ao focar, mostra
// atalhos; ao digitar, filtra os destinos (sem diferenciar maiúsculas/
// acentos). Respeita o papel: só mostra o que o usuário pode acessar.
// =============================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from '@/components/LinkSemPrefetch'
import { Search, CornerDownRight } from 'lucide-react'
import { observarLogin } from '@/lib/fb/auth'
import { minhaConta, type Conta } from '@/lib/fb/usuarios'
import { destinosVisiveis, normalizar, type Destino } from '@/lib/destinos'

// Atalhos sugeridos (na ordem). Só aparecem os que o usuário pode acessar.
const ATALHOS = ['/reembolso', '/informacoes-administrativas', '/banco-horas', '/contato', '/mural']

export function BuscaPortal({ className = 'w-full' }: { className?: string }) {
  const [conta, setConta] = useState<Conta | null>(null)
  const [termo, setTermo] = useState('')
  const [foco, setFoco] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const off = observarLogin(async () => {
      setConta(await minhaConta().catch(() => null))
    })
    return off
  }, [])

  const destinos = useMemo(() => destinosVisiveis(conta), [conta])

  const resultados = useMemo(() => {
    const q = normalizar(termo.trim())
    if (!q) return []
    return destinos
      .filter((d) => normalizar(`${d.nome} ${d.caminho.join(' ')}`).includes(q))
      .slice(0, 8)
  }, [termo, destinos])

  const atalhos = useMemo(() => {
    const mapa = new Map(destinos.map((d) => [d.href, d]))
    return ATALHOS.map((h) => mapa.get(h)).filter((d): d is Destino => !!d).slice(0, 6)
  }, [destinos])

  const mostrarResultados = termo.trim().length > 0
  const mostrarAtalhos = foco && !mostrarResultados && atalhos.length > 0
  const aberto = mostrarResultados || mostrarAtalhos

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!aberto) return
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setFoco(false); setTermo('') }
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  function fechar() { setFoco(false); setTermo('') }

  function ItemDestino({ d }: { d: Destino }) {
    return (
      <Link
        href={d.href}
        onClick={fechar}
        className="flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-superficie-2"
      >
        <CornerDownRight size={15} className="mt-0.5 flex-none text-marca" aria-hidden />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-tinta">{d.nome}</span>
          <span className="block truncate text-xs text-tinta-3">{d.caminho.join(' › ')}</span>
        </span>
      </Link>
    )
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <label className="relative block">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tinta-3" aria-hidden />
        <input
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onFocus={() => setFoco(true)}
          placeholder="Pesquisar no portal..."
          aria-label="Pesquisar no portal"
          className="block w-full rounded-full border border-borda-forte bg-white py-1.5 pl-8 pr-3 text-[0.8125rem] text-tinta transition-colors placeholder:text-tinta-3 hover:border-[#c4bdb2] focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
        />
      </label>

      {aberto && (
        <div className="absolute left-0 right-0 z-50 mt-2 min-w-[16rem] overflow-hidden rounded-xl border border-borda bg-white shadow-[0_10px_28px_rgba(0,36,67,0.16)]">
          {mostrarResultados ? (
            resultados.length === 0 ? (
              <p className="px-3 py-3 text-sm text-tinta-3">Nada encontrado para “{termo.trim()}”.</p>
            ) : (
              <ul className="max-h-80 divide-y divide-borda overflow-y-auto">
                {resultados.map((d) => <li key={d.href}><ItemDestino d={d} /></li>)}
              </ul>
            )
          ) : (
            <>
              <p className="px-3 pt-2.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-tinta-3">Atalhos</p>
              <ul className="max-h-80 divide-y divide-borda overflow-y-auto">
                {atalhos.map((d) => <li key={d.href}><ItemDestino d={d} /></li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
