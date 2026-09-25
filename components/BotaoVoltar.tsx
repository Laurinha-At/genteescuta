'use client'

// =============================================================
// Botão "voltar" que segue o histórico de navegação (um passo por
// vez), em vez de um link fixo para a home.
//
//  • <RegistroNavegacao/> fica no layout e registra o caminho de cada
//    página numa pilha em sessionStorage. Ao voltar, a pilha é
//    reduzida (não duplica), então sabemos sempre qual é a página
//    anterior.
//  • <BotaoVoltar/> lê essa pilha: se há página anterior, chama
//    router.back() (preserva rolagem/estado do histórico do navegador)
//    e mostra "Voltar" — ou "Início" quando a anterior for a home.
//    Sem histórico (entrou direto por link), vira um link para a home.
// =============================================================
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

const CHAVE = 'gc_nav'
const CLASSE_PADRAO =
  'inline-flex items-center gap-1.5 text-sm font-medium text-tinta-3 transition-colors hover:text-marca'

function lerPilha(): string[] {
  try {
    const bruto = sessionStorage.getItem(CHAVE)
    const arr = bruto ? JSON.parse(bruto) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

/** Registra o caminho atual na pilha. Vai no layout, roda em toda navegação. */
export function RegistroNavegacao() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    try {
      const arr = lerPilha()
      const topo = arr[arr.length - 1]
      if (arr.length >= 2 && arr[arr.length - 2] === pathname) {
        // Voltou uma página → tira o topo (mantém a pilha coerente).
        arr.pop()
      } else if (topo !== pathname) {
        arr.push(pathname)
      }
      sessionStorage.setItem(CHAVE, JSON.stringify(arr.slice(-25)))
    } catch {
      /* sessionStorage indisponível — segue sem histórico */
    }
  }, [pathname])

  return null
}

export function BotaoVoltar({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  // null = ainda medindo; '' = sem página anterior; senão = caminho anterior.
  const [anterior, setAnterior] = useState<string | null>(null)

  useEffect(() => {
    const arr = lerPilha()
    // Página anterior = último item diferente do caminho atual.
    let prev = ''
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] !== pathname) {
        prev = arr[i]
        break
      }
    }
    // Reforço: se o navegador não tem histórico, não há para onde voltar.
    if (typeof window !== 'undefined' && window.history.length <= 1) prev = ''
    setAnterior(prev)
  }, [pathname])

  const classe = className ?? CLASSE_PADRAO
  const temAnterior = !!anterior
  const rotulo = anterior === '/' ? 'Início' : temAnterior ? 'Voltar' : 'Início'

  if (!temAnterior) {
    // Entrou direto por um link (ou primeira página): volta para a home.
    return (
      <a href="/" className={classe}>
        <ArrowLeft size={15} aria-hidden /> {rotulo}
      </a>
    )
  }

  return (
    <button type="button" onClick={() => router.back()} className={classe}>
      <ArrowLeft size={15} aria-hidden /> {rotulo}
    </button>
  )
}
