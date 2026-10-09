// =============================================================
// Lista central de destinos de navegação do portal (para a busca
// rápida do rodapé). Mantê-la aqui: páginas públicas na lista
// PUBLICOS; telas do painel derivadas automaticamente de TELAS.
// A visibilidade respeita o papel/permissões do usuário.
// =============================================================
import { TELAS, GRUPO_LABEL, podeVer } from '@/lib/permissoes'
import type { Conta } from '@/lib/fb/usuarios'

export interface Destino {
  nome: string
  /** Trilha para exibir, ex.: ['Gente Escuta', 'Painel', 'Bem-estar', 'Humor']. */
  caminho: string[]
  href: string
}

const RAIZ = 'Gente Escuta'

// Páginas públicas do portal. requer 'logado' = só aparece para quem logou.
const PUBLICOS: { nome: string; href: string; requer?: 'todos' | 'logado' }[] = [
  { nome: 'Início', href: '/' },
  { nome: 'Compartilhe sua voz', href: '/canal' },
  { nome: 'Nosso Mural', href: '/mural' },
  { nome: 'Aniversariantes do mês', href: '/aniversariantes' },
  { nome: 'Informações Administrativas', href: '/informacoes-administrativas' },
  { nome: 'Treinamento e Desenvolvimento', href: '/treinamento' },
  { nome: 'Contato e Suporte', href: '/contato' },
  { nome: 'Gente e Cultura (Sobre nós)', href: '/sobre' },
  { nome: 'Missão, Visão e Valores', href: '/missao-visao-valores' },
  { nome: 'Solicitação de Reembolso', href: '/reembolso', requer: 'logado' },
  { nome: 'Banco de Horas', href: '/banco-horas', requer: 'logado' },
]

/** Destinos que o usuário informado pode acessar. conta = null → visitante. */
export function destinosVisiveis(conta: Conta | null): Destino[] {
  const logado = !!conta && conta.ativo
  const out: Destino[] = []
  const vistos = new Set<string>()

  for (const p of PUBLICOS) {
    if (p.requer === 'logado' && !logado) continue
    if (vistos.has(p.href)) continue
    vistos.add(p.href)
    out.push({ nome: p.nome, href: p.href, caminho: [RAIZ, p.nome] })
  }

  // Telas do Painel Admin: só as que o usuário tem permissão de ver.
  const perm = conta?.permissoes
  if (perm) {
    for (const t of TELAS) {
      if (vistos.has(t.href)) continue
      if (!podeVer(perm, t.id)) continue
      vistos.add(t.href)
      out.push({ nome: t.rotulo, href: t.href, caminho: [RAIZ, 'Painel', GRUPO_LABEL[t.grupo], t.rotulo] })
    }
  }

  return out
}

/** Normaliza para busca: sem acentos e em minúsculas. */
export function normalizar(s: string): string {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
