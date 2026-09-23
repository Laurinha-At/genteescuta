'use client'

// =============================================================
// Bloco "destaques do dia" no Mural: aniversariantes e tempo de Soulan.
// Não renderiza nada quando não há ninguém no dia.
// =============================================================
import { useEffect, useState } from 'react'
import { PartyPopper } from 'lucide-react'
import { destaquesDoDia, type DestaqueDia } from '@/lib/fb/aniversarios'

export function AniversariantesDia() {
  const [itens, setItens] = useState<DestaqueDia[] | null>(null)

  useEffect(() => {
    destaquesDoDia().then(setItens).catch(() => setItens([]))
  }, [])

  if (!itens || itens.length === 0) return null

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-borda bg-white shadow-[0_1px_3px_rgba(26,23,20,0.04),0_4px_12px_rgba(26,23,20,0.06)]">
      <div className="h-1.5 w-full" style={{ background: 'var(--gradiente-suave)' }} aria-hidden />
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-marca-clara text-marca">
            <PartyPopper size={18} aria-hidden />
          </span>
          <h2 className="titulo-secao text-tinta">Datas de hoje</h2>
        </div>
        <ul className="mt-3 space-y-1.5">
          {itens.map((d, i) => (
            <li key={i} className="text-[0.9688rem] leading-7 text-tinta-2">{d.texto}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
