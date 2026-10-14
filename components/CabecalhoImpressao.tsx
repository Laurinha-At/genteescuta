'use client'

// Cabeçalho padrão das exportações em PDF (só aparece na impressão):
// logo da Soulan + título do relatório + filtros aplicados + data de geração.
// A data é calculada só no cliente (após montar) para não dar divergência de
// hidratação no export estático.
import { useEffect, useState } from 'react'

export function CabecalhoImpressao({ titulo, filtros }: { titulo: string; filtros?: string }) {
  const [quando, setQuando] = useState('')
  useEffect(() => { setQuando(new Date().toLocaleString('pt-BR')) }, [])

  const apoio = [filtros && filtros.trim(), quando && `Gerado em ${quando}`].filter(Boolean).join(' · ')

  return (
    <div className="print-only mb-3 border-b border-borda pb-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-soulan.png" alt="Soulan" style={{ height: 44, width: 'auto' }} />
      <h2 className="mt-2 text-lg font-bold text-tinta">{titulo}</h2>
      {apoio && <p className="text-xs text-tinta-3">{apoio}</p>}
    </div>
  )
}
