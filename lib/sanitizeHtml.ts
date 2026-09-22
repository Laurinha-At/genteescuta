// =============================================================
// Sanitização de HTML do editor de texto rico.
//
// Permite APENAS um conjunto pequeno de tags de formatação (negrito,
// itálico, sublinhado, parágrafos, quebras e listas) e REMOVE todos os
// atributos — então não há como injetar `href="javascript:"`, `onclick`,
// `style` malicioso, `<script>`, etc. Qualquer tag fora da lista é
// "desembrulhada" (mantém só o texto). Roda no navegador (DOMParser).
// =============================================================

const TAGS_PERMITIDAS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'DIV', 'SPAN'])

/** Tamanho máximo do HTML guardado (evita estourar o doc do Firestore). */
export const MAX_HTML = 20_000

function limpar(node: Node) {
  for (const filho of Array.from(node.childNodes)) {
    if (filho.nodeType === Node.TEXT_NODE) continue
    if (filho.nodeType !== Node.ELEMENT_NODE) {
      filho.parentNode?.removeChild(filho)
      continue
    }
    const el = filho as HTMLElement
    if (!TAGS_PERMITIDAS.has(el.tagName)) {
      // Tag não permitida: limpa o conteúdo e desembrulha (mantém o texto).
      limpar(el)
      el.replaceWith(...Array.from(el.childNodes))
      continue
    }
    // Remove TODOS os atributos (nada de href/onclick/style/etc.).
    for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name)
    limpar(el)
  }
}

/** Devolve o HTML sanitizado (só tags de formatação, sem atributos). */
export function sanitizeRich(html: string): string {
  if (!html || typeof window === 'undefined') return ''
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const raiz = doc.body.firstElementChild as HTMLElement | null
  if (!raiz) return ''
  limpar(raiz)
  return raiz.innerHTML.slice(0, MAX_HTML)
}

/** Texto puro (sem tags) — para validar se um campo rico está vazio. */
export function richParaTexto(html: string): string {
  if (!html) return ''
  if (typeof window === 'undefined') return html.replace(/<[^>]*>/g, ' ').trim()
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** O conteúdo rico está vazio (sem texto visível)? */
export function richVazio(html: string): boolean {
  return richParaTexto(html).length === 0
}
