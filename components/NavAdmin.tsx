'use client'

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
} from 'lucide-react'

type Item = { href: string; rotulo: string; Icone: typeof LayoutDashboard; exato?: boolean }

// Todos os admins (Master e Super)
const BASE: Item[] = [
  { href: '/admin', rotulo: 'Visão geral', Icone: LayoutDashboard, exato: true },
  { href: '/admin/canal', rotulo: 'Canal', Icone: Inbox },
  { href: '/admin/mural', rotulo: 'Mural', Icone: Megaphone, exato: true },
  { href: '/admin/mural/moderacao', rotulo: 'Moderação', Icone: ShieldQuestion },
  { href: '/admin/clima', rotulo: 'Clima', Icone: HeartPulse },
  { href: '/admin/humor', rotulo: 'Humor', Icone: SmilePlus },
  { href: '/reembolso', rotulo: 'Reembolsos', Icone: Receipt },
  { href: '/banco-horas', rotulo: 'Banco de Horas', Icone: Clock },
  { href: '/admin/funcionarios', rotulo: 'Funcionários', Icone: Contact },
  { href: '/admin/informacoes', rotulo: 'Informações Adm.', Icone: Info },
  { href: '/admin/contato', rotulo: 'Contato', Icone: LifeBuoy },
]

// Só Super Admin
const SUPER: Item[] = [
  { href: '/admin/pesquisas', rotulo: 'Pesquisas', Icone: ClipboardList },
  { href: '/admin/logs', rotulo: 'Logs', Icone: ScrollText },
  { href: '/admin/configuracoes', rotulo: 'Configurações', Icone: Settings },
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
  const itens = [...BASE, ...(souSuper ? SUPER : [])]

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-2">
      {itens.map(({ href, rotulo, Icone, exato }) => {
        const ativo = exato ? caminho === href : caminho.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={aoNavegar}
            aria-current={ativo ? 'page' : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium tracking-[-0.006em] transition-colors ${
              ativo ? 'bg-marca-clara text-marca-escura' : 'text-tinta-2 hover:bg-superficie-2 hover:text-tinta'
            }`}
          >
            <Icone size={18} strokeWidth={2} aria-hidden />
            <span className="flex-1">{rotulo}</span>
            {href === '/admin/canal' && pendentes > 0 && (
              <span className="rounded-full bg-critico px-1.5 text-[11px] font-semibold leading-5 text-white tabular">
                {pendentes}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
