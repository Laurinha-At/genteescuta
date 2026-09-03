import Link from 'next/link'
import type { ReactNode } from 'react'
import type { FaixaRisco } from '@/lib/types'
import { CLASSE_CHIP } from '@/lib/format'

// ---------------------------------------------------------------
export function Cartao({
  titulo,
  apoio,
  acao,
  children,
  className = '',
  padding = true,
}: {
  titulo?: ReactNode
  apoio?: ReactNode
  acao?: ReactNode
  children: ReactNode
  className?: string
  padding?: boolean
}) {
  return (
    <section className={`cartao min-w-0 ${className}`}>
      {(titulo || acao) && (
        <header className="flex items-start justify-between gap-4 border-b border-borda px-4 py-3">
          <div className="min-w-0">
            {titulo && <h2 className="cartao-titulo">{titulo}</h2>}
            {apoio && <p className="mt-0.5 text-xs text-tinta-3">{apoio}</p>}
          </div>
          {acao && <div className="flex-none sem-impressao">{acao}</div>}
        </header>
      )}
      <div className={padding ? 'p-4' : ''}>{children}</div>
    </section>
  )
}

// ---------------------------------------------------------------
export function Chip({
  faixa,
  children,
}: {
  faixa?: FaixaRisco | 'neutro' | 'marca'
  children: ReactNode
}) {
  const classe =
    faixa === 'neutro'
      ? 'chip chip-neutro'
      : faixa === 'marca'
        ? 'chip chip-marca'
        : faixa
          ? CLASSE_CHIP[faixa]
          : 'chip chip-neutro'
  return <span className={classe}>{children}</span>
}

// ---------------------------------------------------------------
/** Scorecard: o número em destaque no topo do painel. */
export function Scorecard({
  rotulo,
  valor,
  sufixo,
  apoio,
  faixa,
  destaque,
}: {
  rotulo: string
  valor: ReactNode
  sufixo?: string
  apoio?: ReactNode
  faixa?: FaixaRisco
  destaque?: ReactNode
}) {
  return (
    <div className="cartao px-4 py-3">
      <p className="text-xs font-medium text-tinta-3">{rotulo}</p>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-[2.125rem] font-[650] leading-[1.05] tracking-[-0.03em] text-tinta">
          {valor}
        </span>
        {sufixo && <span className="text-base font-medium text-tinta-3">{sufixo}</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {faixa && <Chip faixa={faixa}>{FAIXA_CURTA[faixa]}</Chip>}
        {destaque}
      </div>
      {apoio && <p className="mt-1.5 text-xs leading-4 text-tinta-3">{apoio}</p>}
    </div>
  )
}

const FAIXA_CURTA: Record<FaixaRisco, string> = {
  baixo: 'Baixo',
  moderado: 'Moderado',
  alto: 'Alto',
  critico: 'Crítico',
}

// ---------------------------------------------------------------
const ESTILO_BOTAO: Record<string, string> = {
  primario: 'botao-gradiente disabled:bg-borda-forte disabled:bg-none',
  secundario:
    'bg-white text-tinta border border-borda-forte shadow-[0_1px_2px_rgba(26,23,20,0.04)] hover:bg-superficie-2 hover:border-[#c4bdb2]',
  fantasma: 'text-tinta-2 hover:bg-superficie-2',
  perigo: 'bg-critico text-white hover:bg-[#a72c2f]',
}

const BASE_BOTAO =
  'inline-flex items-center justify-center gap-1.5 text-sm font-semibold tracking-[-0.008em] transition-all disabled:cursor-not-allowed disabled:opacity-60'

/** Tamanho "grande" é a chamada principal das telas do colaborador. */
const TAMANHO_BOTAO: Record<string, string> = {
  normal: 'rounded-lg px-4 py-2.5',
  grande: 'rounded-full px-5 py-3 text-[0.9375rem]',
}

export function Botao({
  variante = 'primario',
  tamanho = 'normal',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario' | 'fantasma' | 'perigo'
  tamanho?: 'normal' | 'grande'
}) {
  return (
    <button
      {...props}
      className={`${BASE_BOTAO} ${TAMANHO_BOTAO[tamanho]} ${ESTILO_BOTAO[variante]} ${className}`}
    />
  )
}

export function BotaoLink({
  href,
  variante = 'primario',
  tamanho = 'normal',
  className = '',
  children,
  ...props
}: {
  href: string
  variante?: 'primario' | 'secundario' | 'fantasma' | 'perigo'
  tamanho?: 'normal' | 'grande'
  className?: string
  children: ReactNode
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link
      href={href}
      className={`${BASE_BOTAO} ${TAMANHO_BOTAO[tamanho]} ${ESTILO_BOTAO[variante]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  )
}

// ---------------------------------------------------------------
export function Campo({
  rotulo,
  ajuda,
  obrigatorio,
  children,
  erro,
}: {
  rotulo: string
  ajuda?: string
  obrigatorio?: boolean
  children: ReactNode
  erro?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-tinta">
        {rotulo}
        {obrigatorio && <span className="ml-0.5 text-critico">*</span>}
      </span>
      {ajuda && <span className="mt-0.5 block text-xs text-tinta-3">{ajuda}</span>}
      <div className="mt-1.5">{children}</div>
      {erro && <span className="mt-1 block text-xs font-medium text-critico">{erro}</span>}
    </label>
  )
}

export const ENTRADA =
  'block w-full rounded-lg border border-borda-forte bg-white px-3.5 py-2.5 text-sm text-tinta transition-colors placeholder:text-tinta-3 hover:border-[#c4bdb2] focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca'

// ---------------------------------------------------------------
export function Vazio({
  titulo,
  descricao,
  acao,
}: {
  titulo: string
  descricao?: string
  acao?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-borda-forte bg-white/60 px-6 py-14 text-center">
      <p className="text-[0.9375rem] font-semibold tracking-[-0.012em] text-tinta">{titulo}</p>
      {descricao && (
        <p className="mt-1.5 max-w-md text-[0.8125rem] leading-relaxed text-tinta-3">{descricao}</p>
      )}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}

// ---------------------------------------------------------------
/** Cabeçalho padrão das páginas internas do admin. */
export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
  voltar,
}: {
  titulo: string
  descricao?: ReactNode
  acoes?: ReactNode
  voltar?: { href: string; rotulo: string }
}) {
  return (
    <header className="border-b border-borda bg-white px-4 py-4 sm:px-6">
      {voltar && (
        <Link
          href={voltar.href}
          className="sem-impressao mb-1 inline-block text-xs font-medium text-tinta-3 hover:text-marca"
        >
          ← {voltar.rotulo}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="titulo-secao text-[1.375rem] text-tinta">{titulo}</h1>
          {descricao && <div className="mt-1 text-sm text-tinta-2">{descricao}</div>}
        </div>
        {acoes && <div className="sem-impressao flex flex-wrap gap-2">{acoes}</div>}
      </div>
    </header>
  )
}

// ---------------------------------------------------------------
export function Aviso({
  tom = 'info',
  titulo,
  children,
}: {
  tom?: 'info' | 'alerta' | 'erro' | 'sucesso'
  titulo?: string
  children: ReactNode
}) {
  const estilos = {
    info: 'border-[#bcd9f7] bg-marca-clara text-[#14498a]',
    alerta: 'border-[#f2dfae] bg-[#fdf7e7] text-[#6b4a00]',
    erro: 'border-[#f0c2c2] bg-[#fdeaea] text-[#8a1f1f]',
    sucesso: 'border-[#bfe3bf] bg-[#eff8ef] text-[#0b5d0b]',
  }[tom]

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${estilos}`}>
      {titulo && <p className="font-semibold">{titulo}</p>}
      <div className={titulo ? 'mt-0.5 leading-5' : 'leading-5'}>{children}</div>
    </div>
  )
}
