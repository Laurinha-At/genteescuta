'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Inbox,
  ClipboardList,
  HeartPulse,
  Megaphone,
  ShieldQuestion,
  Settings,
  SmilePlus,
  Contact,
  ScrollText,
  Receipt,
  Info,
  Clock,
  LifeBuoy,
  BookOpen,
  GraduationCap,
  ChevronDown,
} from 'lucide-react'

type Item = {
  href: string
  rotulo: string
  Icone: typeof LayoutDashboard
  exato?: boolean
  super?: boolean // só aparece para o Super Admin
}
type Grupo = { id: string; titulo: string; abertoPadrao: boolean; itens: Item[] }

// Item solto no topo (sem grupo).
const VISAO: Item = { href: '/admin', rotulo: 'Visão geral', Icone: LayoutDashboard, exato: true }

// Seções (apenas organização visual — cada item mantém rota/ícone/permissão).
// "abertoPadrao" mantém as seções mais usadas abertas; as demais começam recolhidas.
const GRUPOS: Grupo[] = [
  {
    id: 'comunicacao',
    titulo: 'Comunicação',
    abertoPadrao: true,
    itens: [
      { href: '/admin/canal', rotulo: 'Canal', Icone: Inbox },
      { href: '/admin/mural', rotulo: 'Mural', Icone: Megaphone, exato: true },
      { href: '/admin/mural/moderacao', rotulo: 'Moderação', Icone: ShieldQuestion },
    ],
  },
  {
    id: 'bem-estar',
    titulo: 'Bem-estar',
    abertoPadrao: true,
    itens: [
      { href: '/admin/clima', rotulo: 'Clima', Icone: HeartPulse },
      { href: '/admin/humor', rotulo: 'Humor', Icone: SmilePlus },
      { href: '/admin/pesquisas', rotulo: 'Pesquisas', Icone: ClipboardList, super: true },
    ],
  },
  {
    id: 'pessoas',
    titulo: 'Pessoas',
    abertoPadrao: true,
    itens: [
      { href: '/admin/funcionarios', rotulo: 'Funcionários', Icone: Contact },
      { href: '/banco-horas', rotulo: 'Banco de Horas', Icone: Clock },
      { href: '/reembolso', rotulo: 'Reembolsos', Icone: Receipt },
    ],
  },
  {
    id: 'conteudo',
    titulo: 'Conteúdo do site',
    abertoPadrao: false,
    itens: [
      { href: '/admin/informacoes', rotulo: 'Informações Adm.', Icone: Info },
      { href: '/admin/treinamento', rotulo: 'Treinamento', Icone: GraduationCap },
      { href: '/admin/contato', rotulo: 'Contato', Icone: LifeBuoy },
      { href: '/admin/institucional', rotulo: 'Sobre / Missão', Icone: BookOpen },
    ],
  },
  {
    id: 'sistema',
    titulo: 'Sistema',
    abertoPadrao: false,
    itens: [
      { href: '/admin/configuracoes', rotulo: 'Configurações', Icone: Settings, super: true },
      { href: '/admin/logs', rotulo: 'Logs', Icone: ScrollText, super: true },
    ],
  },
]

export function NavAdmin({
  pendentes,
  souSuper,
  aoNavegar,
}: {
  pendentes: number
  souSuper: boolean
  aoNavegar?: () => void
}) {
  const caminho = usePathname()
  const estaAtivo = (it: Item) => (it.exato ? caminho === it.href : caminho.startsWith(it.href))
  const visiveis = (g: Grupo) => g.itens.filter((it) => !it.super || souSuper)

  const [abertos, setAbertos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GRUPOS.map((g) => [g.id, g.abertoPadrao])),
  )

  // Sempre abre o grupo que contém a página atual (sem fechar os que o usuário abriu).
  useEffect(() => {
    const g = GRUPOS.find((grp) => grp.itens.some(estaAtivo))
    if (g) setAbertos((prev) => (prev[g.id] ? prev : { ...prev, [g.id]: true }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminho])

  function ItemLink({ it }: { it: Item }) {
    const ativo = estaAtivo(it)
    return (
      <Link
        href={it.href}
        onClick={aoNavegar}
        aria-current={ativo ? 'page' : undefined}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium tracking-[-0.006em] transition-colors ${
          ativo ? 'bg-marca-clara text-marca-escura' : 'text-tinta-2 hover:bg-superficie-2 hover:text-tinta'
        }`}
      >
        <it.Icone size={18} strokeWidth={2} aria-hidden />
        <span className="flex-1">{it.rotulo}</span>
        {it.href === '/admin/canal' && pendentes > 0 && (
          <span className="rounded-full bg-critico px-1.5 text-[11px] font-semibold leading-5 text-white tabular">
            {pendentes}
          </span>
        )}
      </Link>
    )
  }

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-2">
      {/* Visão geral — solto no topo */}
      <ItemLink it={VISAO} />

      {GRUPOS.map((g) => {
        const itens = visiveis(g)
        if (itens.length === 0) return null // ex.: "Sistema" some para quem não é Super
        const aberto = abertos[g.id]
        // Badge do Canal aparece no cabeçalho quando a seção está recolhida.
        const pendentesNaSecao = !aberto && itens.some((it) => it.href === '/admin/canal') ? pendentes : 0
        return (
          <div key={g.id} className="mt-1.5">
            <button
              type="button"
              onClick={() => setAbertos((prev) => ({ ...prev, [g.id]: !prev[g.id] }))}
              aria-expanded={aberto}
              className="flex w-full items-center gap-2 rounded-lg px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-tinta-3 transition-colors hover:text-tinta-2"
            >
              <span className="flex-1 text-left">{g.titulo}</span>
              {pendentesNaSecao > 0 && (
                <span className="rounded-full bg-critico px-1.5 text-[11px] font-semibold leading-5 text-white tabular">
                  {pendentesNaSecao}
                </span>
              )}
              <ChevronDown size={14} strokeWidth={2.5} aria-hidden className={`transition-transform ${aberto ? '' : '-rotate-90'}`} />
            </button>
            {aberto && (
              <div className="flex flex-col gap-0.5">
                {itens.map((it) => (
                  <ItemLink key={it.href} it={it} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
