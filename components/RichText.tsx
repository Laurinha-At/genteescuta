'use client'

// =============================================================
// Editor de texto rico simples (negrito, itálico, sublinhado,
// parágrafos/quebras e listas) + exibição sanitizada.
//
// contentEditable "não controlado": o conteúdo inicial é injetado uma
// vez via ref (para o cursor não pular a cada tecla) e o HTML é lido no
// onInput. A sanitização final acontece ao salvar (lib/sanitizeHtml).
// =============================================================
import { useRef, useEffect } from 'react'
import { Bold, Italic, Underline, List } from 'lucide-react'
import { sanitizeRich } from '@/lib/sanitizeHtml'

function cmd(comando: string) {
  // execCommand é depreciado, mas segue funcionando em todos os navegadores
  // e é o caminho mais leve para um editor interno simples (sem dependências).
  document.execCommand(comando, false)
}

export function RichTextEditor({
  valorInicial,
  onChange,
  placeholder,
  minHeight = 96,
}: {
  valorInicial: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = sanitizeRich(valorInicial || '')
    // Só na montagem — depois é não controlado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emitir = () => onChange(ref.current?.innerHTML ?? '')

  const Botao = ({ acao, titulo, children }: { acao: string; titulo: string; children: React.ReactNode }) => (
    <button
      type="button"
      title={titulo}
      onMouseDown={(e) => { e.preventDefault(); cmd(acao); emitir() }}
      className="rounded p-1.5 text-tinta-2 transition-colors hover:bg-white hover:text-marca"
    >
      {children}
    </button>
  )

  return (
    <div className="overflow-hidden rounded-lg border border-borda-forte bg-white focus-within:border-marca focus-within:outline focus-within:outline-2 focus-within:outline-offset-[-1px] focus-within:outline-marca">
      <div className="flex items-center gap-0.5 border-b border-borda bg-superficie-2 px-1.5 py-1">
        <Botao acao="bold" titulo="Negrito"><Bold size={15} aria-hidden /></Botao>
        <Botao acao="italic" titulo="Itálico"><Italic size={15} aria-hidden /></Botao>
        <Botao acao="underline" titulo="Sublinhado"><Underline size={15} aria-hidden /></Botao>
        <Botao acao="insertUnorderedList" titulo="Lista"><List size={15} aria-hidden /></Botao>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emitir}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="prose-rico px-3.5 py-2.5 text-sm leading-6 text-tinta outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 empty:before:text-tinta-3 empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  )
}

/** Exibe HTML rico já sanitizado (re-sanitiza por segurança). */
export function RichHtml({ html, className = '' }: { html: string; className?: string }) {
  const limpo = sanitizeRich(html || '')
  if (!limpo) return null
  return (
    <div
      className={`[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 last:[&_p]:mb-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: limpo }}
    />
  )
}
