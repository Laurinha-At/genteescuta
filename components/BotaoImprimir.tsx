'use client'

import { Printer } from 'lucide-react'

export function BotaoImprimir({ rotulo = 'Imprimir / PDF' }: { rotulo?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md border border-borda-forte bg-white px-3.5 py-2 text-sm font-medium text-tinta hover:bg-superficie-2"
    >
      <Printer size={15} aria-hidden /> {rotulo}
    </button>
  )
}
