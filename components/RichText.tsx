'use client'

// =============================================================
// Editor de texto rico simples (negrito, itálico, sublinhado, listas e
// quebra de linha) + exibição sanitizada.
//
// "Não controlado": o conteúdo inicial é injetado uma vez e o HTML é lido
// só quando o pai chama getHtml() (ao salvar). NÃO há estado do React por
// tecla → sem re-render → o cursor nunca reseta.
//
// O placeholder é uma CAMADA com `pointer-events: none` (não intercepta o
// clique) — evita o bug de "precisar clicar várias vezes para digitar".
// =============================================================
import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Bold, Italic, Underline, List } from 'lucide-react'
import { sanitizeRich } from '@/lib/sanitizeHtml'

export interface RichHandle {
  getHtml: () => string
}

export const RichTextEditor = forwardRef<RichHandle, {
  valorInicial: string
  placeholder?: string
  minHeight?: number
}>(function RichTextEditor({ valorInicial, placeholder, minHeight = 96 }, ref) {
  const elRef = useRef<HTMLDivElement>(null)
  const phRef = useRef<HTMLDivElement>(null)

  function atualizarPlaceholder() {
    if (!phRef.current || !elRef.current) return
    const temTexto = (elRef.current.textContent ?? '').trim().length > 0 || !!elRef.current.querySelector('img, li, br')
    phRef.current.style.display = temTexto ? 'none' : 'block'
  }

  useEffect(() => {
    if (elRef.current) elRef.current.innerHTML = sanitizeRich(valorInicial || '')
    atualizarPlaceholder()
    // Só na montagem — depois é não controlado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({ getHtml: () => elRef.current?.innerHTML ?? '' }), [])

  function cmd(comando: string) {
    elRef.current?.focus()
    document.execCommand(comando, false)
    atualizarPlaceholder()
  }

  const Bt = ({ acao, titulo, children }: { acao: string; titulo: string; children: React.ReactNode }) => (
    <button
      type="button"
      title={titulo}
      // preventDefault preserva a seleção/foco no editor ao clicar no botão.
      onMouseDown={(e) => { e.preventDefault(); cmd(acao) }}
      className="rounded p-1.5 text-tinta-2 transition-colors hover:bg-white hover:text-marca"
    >
      {children}
    </button>
  )

  return (
    <div className="overflow-hidden rounded-lg border border-borda-forte bg-white focus-within:border-marca focus-within:outline focus-within:outline-2 focus-within:outline-offset-[-1px] focus-within:outline-marca">
      <div className="flex items-center gap-0.5 border-b border-borda bg-superficie-2 px-1.5 py-1">
        <Bt acao="bold" titulo="Negrito"><Bold size={15} aria-hidden /></Bt>
        <Bt acao="italic" titulo="Itálico"><Italic size={15} aria-hidden /></Bt>
        <Bt acao="underline" titulo="Sublinhado"><Underline size={15} aria-hidden /></Bt>
        <Bt acao="insertUnorderedList" titulo="Lista"><List size={15} aria-hidden /></Bt>
      </div>
      <div className="relative">
        {placeholder && (
          <div ref={phRef} className="pointer-events-none absolute left-0 top-0 px-3.5 py-2.5 text-sm leading-6 text-tinta-3" aria-hidden>
            {placeholder}
          </div>
        )}
        <div
          ref={elRef}
          contentEditable
          suppressContentEditableWarning
          onInput={atualizarPlaceholder}
          style={{ minHeight }}
          className="px-3.5 py-2.5 text-sm leading-6 text-tinta outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        />
      </div>
    </div>
  )
})

/** Exibe HTML rico já sanitizado (re-sanitiza por segurança). */
export function RichHtml({ html, className = '' }: { html: string; className?: string }) {
  const limpo = sanitizeRich(html || '')
  if (!limpo) return null
  return (
    <div
      className={`[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: limpo }}
    />
  )
}
