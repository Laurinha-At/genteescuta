'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopiarTexto({
  texto,
  rotulo = 'Copiar',
  className = '',
}: {
  texto: string
  rotulo?: string
  className?: string
}) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Alguns navegadores bloqueiam a área de transferência sem HTTPS;
      // nesse caso o texto continua selecionável na tela.
      setCopiado(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className={`inline-flex items-center gap-1.5 rounded-md border border-borda-forte bg-white px-2.5 py-1.5 text-xs font-medium text-tinta-2 transition-colors hover:bg-superficie-2 ${className}`}
    >
      {copiado ? (
        <>
          <Check size={13} aria-hidden /> Copiado
        </>
      ) : (
        <>
          <Copy size={13} aria-hidden /> {rotulo}
        </>
      )}
    </button>
  )
}
