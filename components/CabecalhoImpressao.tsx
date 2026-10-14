'use client'

// Cabeçalho padrão das exportações em PDF (só aparece na impressão):
// logo da Soulan + título do relatório + filtros aplicados + data de geração.
import { rodapeGeracao } from '@/lib/exportar'

export function CabecalhoImpressao({ titulo, filtros }: { titulo: string; filtros?: string }) {
  return (
    <div className="print-only mb-3 border-b border-borda pb-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-soulan.png" alt="Soulan" style={{ height: 44, width: 'auto' }} />
      <h2 className="mt-2 text-lg font-bold text-tinta">{titulo}</h2>
      <p className="text-xs text-tinta-3">{rodapeGeracao(filtros)}</p>
    </div>
  )
}
