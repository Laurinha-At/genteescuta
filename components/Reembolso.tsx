'use client'

// =============================================================
// Solicitação de Reembolso — experiência por papel.
//  - Solicitar: formulário guiado com trilha de progresso.
//  - Minhas solicitações: as do próprio usuário (cartões).
//  - Fila de Trabalho (aprovador): o que aguarda a MINHA decisão (tabela).
//  - Central das Solicitações (aprovador): tudo no meu escopo (tabela +
//    KPIs + filtros + busca + exportação).
// Segurança reforçada nas Regras do Firestore.
// =============================================================
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Receipt, Plus, ClipboardList, CheckSquare, LayoutList, Paperclip,
  CheckCircle2, XCircle, Download, Printer, FileText, Image as ImageIcon, Search,
  X, PersonStanding, ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react'
import {
  CENTROS_CUSTO, CATEGORIAS, STATUS_LABEL, STATUS_FAIXA, PAPEL_LABEL,
  formatBRL, formatData, podeAprovar, statusEfetivo, ehEtapaFinanceiro, estaPendente,
  type StatusReembolso,
} from '@/lib/reembolso'
import {
  criarReembolso, prepararAnexo, listarMinhas, listarParaGestao,
  aprovarReembolso, recusarReembolso, registrarPagamento, getAnexo,
  type Reembolso, type Anexo,
} from '@/lib/fb/reembolso'
import type { Perfil } from '@/lib/fb/funcionarios'
import { Campo, ENTRADA, Botao, Aviso, Chip } from '@/components/ui'

type Aba = 'solicitar' | 'minhas' | 'fila' | 'central'

/** Normaliza para busca: sem acento, minúsculas. */
function normalizar(s: unknown): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function ReembolsoApp({ perfil }: { perfil: Perfil }) {
  const ehAprovador =
    perfil.papeis.includes('master') || perfil.papeis.includes('financeiro') || perfil.papeis.includes('gestor')

  const [aba, setAba] = useState<Aba>('solicitar')
  const [minhas, setMinhas] = useState<Reembolso[]>([])
  const [gestao, setGestao] = useState<Reembolso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function recarregar() {
    setCarregando(true)
    try {
      const [m, g] = await Promise.all([
        listarMinhas(),
        ehAprovador ? listarParaGestao(perfil) : Promise.resolve([] as Reembolso[]),
      ])
      setMinhas(m); setGestao(g)
    } catch { /* silencioso */ } finally { setCarregando(false) }
  }
  useEffect(() => { recarregar() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  const pendentes = useMemo(
    () => gestao.filter((r) => r.solicitante_uid !== perfil.uid && podeAprovar(r.status, perfil.papeis, perfil.centro_custo, r.centro_custo)),
    [gestao, perfil],
  )

  const ABAS: { id: Aba; rotulo: string; Icone: typeof Plus; badge?: number }[] = [
    { id: 'solicitar', rotulo: 'Solicitar', Icone: Plus },
    { id: 'minhas', rotulo: 'Minhas solicitações', Icone: ClipboardList },
    ...(ehAprovador ? [
      { id: 'fila' as Aba, rotulo: 'Fila de Trabalho', Icone: CheckSquare, badge: pendentes.length },
      { id: 'central' as Aba, rotulo: 'Central das Solicitações', Icone: LayoutList },
    ] : []),
  ]

  return (
    <>
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-3 transition-colors hover:text-marca">
        <ArrowLeft size={15} aria-hidden /> Início
      </Link>

      <div className="mt-6 flex items-start gap-3">
        <span className="mt-1 flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-marca-clara text-marca">
          <Receipt size={22} aria-hidden />
        </span>
        <div>
          <h1 className="titulo-hero text-[1.875rem] text-tinta">Reembolso</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {perfil.papeis.map((p) => (
              <span key={p} className="rounded-full bg-superficie-2 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-tinta-2">
                {PAPEL_LABEL[p as keyof typeof PAPEL_LABEL] ?? p}
              </span>
            ))}
            {perfil.centro_custo && (
              <span className="rounded-full bg-marca-clara px-2.5 py-0.5 text-[0.6875rem] font-semibold text-marca-texto">{perfil.centro_custo}</span>
            )}
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="mt-6 flex flex-wrap gap-2">
        {ABAS.map(({ id, rotulo, Icone, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              aba === id ? 'bg-marca text-white' : 'border border-borda-forte bg-white text-tinta-2 hover:border-marca hover:text-marca-texto'
            }`}
          >
            <Icone size={15} aria-hidden /> {rotulo}
            {typeof badge === 'number' && badge > 0 && (
              <span className={`rounded-full px-1.5 text-[11px] font-semibold leading-5 ${aba === id ? 'bg-white/25 text-white' : 'bg-critico text-white'}`}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {aviso && <Aviso tom="sucesso">{aviso}</Aviso>}
        {erro && <Aviso tom="erro">{erro}</Aviso>}

        {aba === 'solicitar' && (
          <FormReembolso perfil={perfil} aoEnviar={() => { setErro(null); recarregar(); setAba('minhas') }} setAviso={setAviso} setErro={setErro} />
        )}
        {aba === 'minhas' && <ListaMinhas carregando={carregando} itens={minhas} />}
        {aba === 'fila' && (
          <Fila perfil={perfil} carregando={carregando} pendentes={pendentes} aoDecidir={recarregar} setAviso={setAviso} setErro={setErro} />
        )}
        {aba === 'central' && (
          <Central perfil={perfil} carregando={carregando} registros={gestao} />
        )}
      </div>
    </>
  )
}

// -------------------------------------------------------------
// Trilha de progresso (perfumaria): pessoa caminhando na trilha
// -------------------------------------------------------------
function TrilhaProgresso({ passos, total }: { passos: number; total: number }) {
  const pct = Math.round((Math.min(passos, total) / total) * 100)
  const completo = passos >= total
  return (
    <div className="rounded-2xl bg-superficie-2 p-4">
      <div className="flex items-center justify-between text-xs font-semibold text-tinta-2">
        <span>{completo ? 'Tudo pronto — é só enviar! 🎉' : 'Vamos preencher juntos'}</span>
        <span className="text-marca-texto">{pct}%</span>
      </div>
      <div className="relative mt-3 h-3 rounded-full bg-white shadow-inner">
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: 'var(--gradiente)' }} />
        {/* marcos */}
        {Array.from({ length: total + 1 }).map((_, i) => (
          <span key={i} className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" style={{ left: `${(i / total) * 100}%` }} aria-hidden />
        ))}
        {/* pessoa caminhando */}
        <span
          className="absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-marca text-white shadow transition-[left] duration-500"
          style={{ left: `${pct}%` }}
        >
          <PersonStanding size={16} aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-[0.6875rem] text-tinta-3">{passos} de {total} passos concluídos</p>
    </div>
  )
}

// -------------------------------------------------------------
// Formulário de solicitação (guiado)
// -------------------------------------------------------------
function FormReembolso({ perfil, aoEnviar, setAviso, setErro }: {
  perfil: Perfil; aoEnviar: () => void; setAviso: (s: string | null) => void; setErro: (s: string | null) => void
}) {
  const [centro, setCentro] = useState(perfil.centro_custo || '')
  const [data, setData] = useState('')
  const [categoria, setCategoria] = useState('')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [pendente, setPendente] = useState(false)

  const passos = [centro, data, categoria, valor, descricao.trim().length >= 3 ? 'x' : '', arquivo ? 'x' : ''].filter(Boolean).length
  const destino = perfil.papeis.includes('gestor') ? 'Master' : perfil.papeis.includes('master') ? 'Financeiro' : 'gestor da sua área'

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro(null); setAviso(null)
    const v = Number(valor.replace(/\./g, '').replace(',', '.'))
    if (!arquivo) { setErro('Anexe o comprovante (foto ou PDF).'); return }
    setPendente(true)
    try {
      const anexo: Anexo = await prepararAnexo(arquivo)
      await criarReembolso({ centro_custo: centro, data_despesa: data, categoria, descricao, valor: v }, anexo, perfil)
      setCentro(perfil.centro_custo || ''); setData(''); setCategoria(''); setValor(''); setDescricao(''); setArquivo(null)
      setAviso('Solicitação enviada! Acompanhe em "Minhas solicitações".')
      aoEnviar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui enviar a solicitação.')
    }
    setPendente(false)
  }

  const Passo = ({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) => (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-marca-clara text-xs font-bold text-marca">{n}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-tinta">{titulo}<span className="ml-0.5 text-critico" title="Obrigatório">*</span></p>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  )

  return (
    <form onSubmit={enviar} className="space-y-5">
      <TrilhaProgresso passos={passos} total={6} />

      <div className="cartao-g space-y-5 p-5 sm:p-6">
        <Passo n={1} titulo="Qual é a área e a data da despesa?">
          <div className="grid gap-3 sm:grid-cols-2">
            <select required value={centro} onChange={(e) => setCentro(e.target.value)} className={ENTRADA}>
              <option value="">Centro de custo…</option>
              {CENTROS_CUSTO.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" required value={data} onChange={(e) => setData(e.target.value)} className={ENTRADA} max={new Date().toISOString().slice(0, 10)} />
          </div>
        </Passo>

        <Passo n={2} titulo="O que você gastou?">
          <div className="grid gap-3 sm:grid-cols-2">
            <select required value={categoria} onChange={(e) => setCategoria(e.target.value)} className={ENTRADA}>
              <option value="">Categoria…</option>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor (ex.: 150,00)" className={ENTRADA} />
          </div>
        </Passo>

        <Passo n={3} titulo="Conte rapidamente o motivo">
          <textarea required rows={3} minLength={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} className={ENTRADA} placeholder="Ex.: almoço com cliente, corrida de app até o evento…" />
        </Passo>

        <Passo n={4} titulo="Anexe o comprovante">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-borda-forte bg-white px-4 py-3 text-sm text-tinta-2 transition-colors hover:border-marca">
            <Paperclip size={16} className="text-marca" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{arquivo ? arquivo.name : 'Escolher foto ou PDF…'}</span>
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </label>
        </Passo>

        <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
          <Botao type="submit" disabled={pendente || passos < 6}>
            <Receipt size={15} aria-hidden /> {pendente ? 'Enviando…' : 'Enviar solicitação'}
          </Botao>
          <p className="text-xs text-tinta-3">
            {passos < 6
              ? 'Preencha todos os campos obrigatórios (marcados com *) para enviar.'
              : <>Vai direto para <strong className="font-semibold text-tinta-2">{destino}</strong>.</>}
          </p>
        </div>
      </div>
    </form>
  )
}

// -------------------------------------------------------------
// Minhas solicitações (cartões)
// -------------------------------------------------------------
function ListaMinhas({ carregando, itens }: { carregando: boolean; itens: Reembolso[] }) {
  if (carregando) return <p className="text-sm text-tinta-3">Carregando…</p>
  if (itens.length === 0)
    return (
      <div className="cartao-g p-8 text-center">
        <p className="text-sm font-medium text-tinta">Você ainda não fez nenhuma solicitação.</p>
        <p className="mt-1 text-sm text-tinta-3">Use a aba "Solicitar" para pedir seu primeiro reembolso.</p>
      </div>
    )
  return <div className="grid gap-3 sm:grid-cols-2">{itens.map((r) => <CardReembolso key={r.id} r={r} />)}</div>
}

function StatusChip({ status, dataPagamento }: { status: StatusReembolso; dataPagamento?: string | null }) {
  const s = statusEfetivo(status, dataPagamento)
  return <Chip faixa={STATUS_FAIXA[s]}>{STATUS_LABEL[s]}</Chip>
}

function CardReembolso({ r }: { r: Reembolso }) {
  const [aberto, setAberto] = useState(false)
  const recusa = [...(r.historico ?? [])].reverse().find((h) => h.status_novo === 'recusado')
  return (
    <div className="cartao-g overflow-hidden">
      <button type="button" onClick={() => setAberto((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-[620] text-tinta">{formatBRL(r.valor)}</span>
            <span className="text-sm text-tinta-3">· {r.categoria}</span>
          </span>
          <span className="mt-0.5 block text-xs text-tinta-3">{formatData(r.data_despesa)} · {r.centro_custo}</span>
        </span>
        <StatusChip status={r.status} dataPagamento={r.data_pagamento} />
      </button>
      {aberto && (
        <div className="border-t border-borda px-4 py-4">
          <p className="text-sm leading-6 text-tinta-2">{r.descricao}</p>
          {recusa?.motivo && (
            <p className="mt-3 rounded-lg border border-[#f0c2c2] bg-[#fdeaea] px-3 py-2 text-sm text-[#8a1f1f]">
              <strong className="font-semibold">Motivo da recusa:</strong> {recusa.motivo}
            </p>
          )}
          <Timeline r={r} />
          <div className="mt-3"><BotaoAnexo id={r.id} tipo={r.anexo_tipo} /></div>
        </div>
      )}
    </div>
  )
}

function Timeline({ r }: { r: Reembolso }) {
  return (
    <ol className="mt-4 space-y-2">
      {(r.historico ?? []).map((h, i) => {
        const recusado = h.status_novo === 'recusado'
        return (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full ${recusado ? 'bg-[#fdeaea] text-critico' : 'bg-[#eef7e3] text-verde-escuro'}`}>
              {recusado ? <XCircle size={13} aria-hidden /> : <CheckCircle2 size={13} aria-hidden />}
            </span>
            <span className="text-tinta-2">
              <strong className="font-semibold text-tinta">{STATUS_LABEL[h.status_novo]}</strong>
              {h.papel !== 'solicitante' && <> · por {h.por_nome || '—'}</>}
              <span className="text-tinta-3"> · {formatData(h.em)}</span>
              {h.data_pagamento && <span className="text-tinta-3"> · pagamento em {formatData(h.data_pagamento)}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function BotaoAnexo({ id, tipo }: { id: string; tipo: 'image' | 'pdf' | null }) {
  const [carregando, setCarregando] = useState(false)
  async function abrir() {
    setCarregando(true)
    try {
      const a = await getAnexo(id)
      if (!a) return
      const blob = await (await fetch(a.dados)).blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } finally { setCarregando(false) }
  }
  return (
    <button type="button" onClick={abrir} disabled={carregando} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-1.5 text-sm font-medium text-tinta-2 transition-colors hover:border-marca hover:text-marca-texto disabled:opacity-60">
      {tipo === 'pdf' ? <FileText size={15} aria-hidden /> : <ImageIcon size={15} aria-hidden />}
      {carregando ? 'Abrindo…' : 'Ver comprovante'}
    </button>
  )
}

// -------------------------------------------------------------
// Tabela de solicitações (busca + filtros + ordenação)
// -------------------------------------------------------------
type Coluna = { key: string; label: string; texto: (r: Reembolso) => string; ord: (r: Reembolso) => string | number; right?: boolean; chip?: boolean }

const COLS_BASE: Coluna[] = [
  { key: 'data', label: 'Data', texto: (r) => formatData(r.data_despesa), ord: (r) => r.data_despesa ?? '' },
  { key: 'solicitante', label: 'Solicitante', texto: (r) => r.solicitante_nome, ord: (r) => normalizar(r.solicitante_nome) },
  { key: 'centro', label: 'Centro de custo', texto: (r) => r.centro_custo, ord: (r) => normalizar(r.centro_custo) },
  { key: 'categoria', label: 'Categoria', texto: (r) => r.categoria, ord: (r) => normalizar(r.categoria) },
  { key: 'valor', label: 'Valor', texto: (r) => formatBRL(r.valor), ord: (r) => r.valor ?? 0, right: true },
  { key: 'status', label: 'Status', texto: (r) => STATUS_LABEL[statusEfetivo(r.status, r.data_pagamento)], ord: (r) => r.status, chip: true },
]
const COLS_CENTRAL: Coluna[] = [
  ...COLS_BASE,
  { key: 'pagamento', label: 'Pagamento', texto: (r) => (r.data_pagamento ? formatData(r.data_pagamento) : '—'), ord: (r) => r.data_pagamento ?? '' },
]

function TabelaSolicitacoes({ registros, colunas, aoAbrir }: { registros: Reembolso[]; colunas: Coluna[]; aoAbrir: (r: Reembolso) => void }) {
  const [busca, setBusca] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fCentro, setFCentro] = useState('')
  const [fCategoria, setFCategoria] = useState('')
  const [ordKey, setOrdKey] = useState('data')
  const [ordDir, setOrdDir] = useState<1 | -1>(-1)

  const centros = useMemo(() => Array.from(new Set(registros.map((r) => r.centro_custo).filter(Boolean))).sort(), [registros])
  const categorias = useMemo(() => Array.from(new Set(registros.map((r) => r.categoria).filter(Boolean))).sort(), [registros])
  const statuses = useMemo(() => Array.from(new Set(registros.map((r) => statusEfetivo(r.status, r.data_pagamento)))), [registros])

  const filtrados = useMemo(() => {
    const q = normalizar(busca)
    const arr = registros.filter((r) => {
      if (fStatus && statusEfetivo(r.status, r.data_pagamento) !== fStatus) return false
      if (fCentro && r.centro_custo !== fCentro) return false
      if (fCategoria && r.categoria !== fCategoria) return false
      if (q) {
        const blob = normalizar(colunas.map((c) => c.texto(r)).join(' ') + ' ' + (r.descricao ?? ''))
        if (!blob.includes(q)) return false
      }
      return true
    })
    const col = colunas.find((c) => c.key === ordKey)
    if (col) arr.sort((a, b) => { const va = col.ord(a), vb = col.ord(b); return (va < vb ? -1 : va > vb ? 1 : 0) * ordDir })
    return arr
  }, [registros, busca, fStatus, fCentro, fCategoria, ordKey, ordDir, colunas])

  function ordenar(key: string) {
    if (key === ordKey) setOrdDir((d) => (d === 1 ? -1 : 1))
    else { setOrdKey(key); setOrdDir(1) }
  }

  const limpar = busca || fStatus || fCentro || fCategoria

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-3" aria-hidden />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} className={`${ENTRADA} pl-9`} placeholder="Buscar em tudo (nome, valor, status…)" />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={ENTRADA}>
          <option value="">Todos os status</option>
          {statuses.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select value={fCentro} onChange={(e) => setFCentro(e.target.value)} className={ENTRADA}>
          <option value="">Todos os centros</option>
          {centros.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fCategoria} onChange={(e) => setFCategoria(e.target.value)} className={ENTRADA}>
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-between text-xs text-tinta-3">
        <span>{filtrados.length} de {registros.length} solicitação(ões)</span>
        {limpar && (
          <button type="button" onClick={() => { setBusca(''); setFStatus(''); setFCentro(''); setFCategoria('') }} className="inline-flex items-center gap-1 font-medium hover:text-critico">
            <X size={12} aria-hidden /> Limpar filtros
          </button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="cartao-g p-6 text-center text-sm text-tinta-3">Nada encontrado com esses filtros.</div>
      ) : (
        <div className="cartao-g overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-borda text-left text-xs font-semibold text-tinta-3">
                {colunas.map((c) => (
                  <th key={c.key} className={`px-4 py-2.5 ${c.right ? 'text-right' : ''}`}>
                    <button type="button" onClick={() => ordenar(c.key)} className={`inline-flex items-center gap-1 hover:text-marca ${c.right ? 'flex-row-reverse' : ''}`}>
                      {c.label}
                      {ordKey === c.key ? (ordDir === 1 ? <ChevronUp size={13} aria-hidden /> : <ChevronDown size={13} aria-hidden />) : <ChevronsUpDown size={13} className="opacity-40" aria-hidden />}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {filtrados.map((r) => (
                <tr key={r.id} onClick={() => aoAbrir(r)} className="cursor-pointer hover:bg-superficie-2">
                  {colunas.map((c) => (
                    <td key={c.key} className={`whitespace-nowrap px-4 py-2.5 ${c.right ? 'text-right font-medium text-tinta' : 'text-tinta-2'}`}>
                      {c.chip ? <StatusChip status={r.status} dataPagamento={r.data_pagamento} /> : c.texto(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------
// Fila de Trabalho (aprovador) — tabela + modal de decisão
// -------------------------------------------------------------
function Fila({ perfil, carregando, pendentes, aoDecidir, setAviso, setErro }: {
  perfil: Perfil; carregando: boolean; pendentes: Reembolso[]; aoDecidir: () => void; setAviso: (s: string | null) => void; setErro: (s: string | null) => void
}) {
  const [aberto, setAberto] = useState<Reembolso | null>(null)
  if (carregando) return <p className="text-sm text-tinta-3">Carregando…</p>
  return (
    <>
      <p className="text-sm text-tinta-2">Solicitações aguardando <strong>a sua decisão</strong> ({pendentes.length}).</p>
      {pendentes.length === 0 ? (
        <div className="cartao-g p-6 text-center text-sm text-tinta-3">Nada aguardando você agora. 🎉</div>
      ) : (
        <TabelaSolicitacoes registros={pendentes} colunas={COLS_BASE} aoAbrir={setAberto} />
      )}
      {aberto && (
        <ModalDecisao r={aberto} perfil={perfil} onFechar={() => setAberto(null)} aoDecidir={() => { setAberto(null); aoDecidir() }} setAviso={setAviso} setErro={setErro} />
      )}
    </>
  )
}

// -------------------------------------------------------------
// Central das Solicitações (aprovador) — KPIs + tabela + exportar
// -------------------------------------------------------------
function Central({ perfil, carregando, registros }: { perfil: Perfil; carregando: boolean; registros: Reembolso[] }) {
  const [aberto, setAberto] = useState<Reembolso | null>(null)
  const kpis = useMemo(() => {
    let pend = 0, pagos = 0, recus = 0
    for (const r of registros) {
      const s = statusEfetivo(r.status, r.data_pagamento)
      if (estaPendente(r.status)) pend++
      else if (s === 'pago' || s === 'agendado' || s === 'aprovado') pagos++
      else if (s === 'recusado') recus++
    }
    return { total: registros.length, pend, pagos, recus }
  }, [registros])
  const escopo = perfil.papeis.includes('gestor') && !perfil.papeis.includes('master') && !perfil.papeis.includes('financeiro')
    ? `centro ${perfil.centro_custo || '—'}` : 'todos os centros de custo'

  if (carregando) return <p className="text-sm text-tinta-3">Carregando…</p>

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi rotulo="Total" valor={kpis.total} />
        <Kpi rotulo="Pendentes" valor={kpis.pend} faixa="moderado" />
        <Kpi rotulo="Pagos / agendados" valor={kpis.pagos} faixa="baixo" />
        <Kpi rotulo="Recusados" valor={kpis.recus} faixa="critico" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-tinta-3">Você enxerga {escopo}.</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => baixarCSV(registros)} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-1.5 text-sm font-medium text-tinta-2 hover:border-marca hover:text-marca-texto"><Download size={15} aria-hidden /> CSV</button>
          <button type="button" onClick={() => imprimirPDF(registros, escopo)} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-1.5 text-sm font-medium text-tinta-2 hover:border-marca hover:text-marca-texto"><Printer size={15} aria-hidden /> PDF</button>
        </div>
      </div>

      <TabelaSolicitacoes registros={registros} colunas={COLS_CENTRAL} aoAbrir={setAberto} />

      {aberto && <ModalDetalhe r={aberto} onFechar={() => setAberto(null)} />}
    </div>
  )
}

function Kpi({ rotulo, valor, faixa }: { rotulo: string; valor: number; faixa?: 'moderado' | 'baixo' | 'critico' }) {
  const cor = faixa === 'baixo' ? 'text-verde-escuro' : faixa === 'critico' ? 'text-critico' : faixa === 'moderado' ? 'text-[#8a6d00]' : 'text-tinta'
  return (
    <div className="cartao-g px-4 py-3">
      <p className="text-xs font-medium text-tinta-3">{rotulo}</p>
      <p className={`mt-1 text-[2rem] font-[650] leading-none tracking-tight ${cor}`}>{valor}</p>
    </div>
  )
}

// -------------------------------------------------------------
// Modais
// -------------------------------------------------------------
function Envelope({ r, children, onFechar }: { r: Reembolso; children: React.ReactNode; onFechar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onFechar}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-[680] text-tinta">{formatBRL(r.valor)}</span>
              <span className="text-sm text-tinta-3">· {r.categoria}</span>
              <StatusChip status={r.status} dataPagamento={r.data_pagamento} />
            </p>
            <p className="mt-0.5 text-xs text-tinta-3">{r.solicitante_nome} · {r.centro_custo} · {formatData(r.data_despesa)}</p>
          </div>
          <button type="button" onClick={onFechar} className="rounded-lg p-1.5 text-tinta-3 hover:bg-superficie-2" aria-label="Fechar"><X size={18} aria-hidden /></button>
        </div>
        <p className="mt-3 text-sm leading-6 text-tinta-2">{r.descricao}</p>
        <div className="mt-3"><BotaoAnexo id={r.id} tipo={r.anexo_tipo} /></div>
        {children}
        <Timeline r={r} />
      </div>
    </div>
  )
}

function ModalDetalhe({ r, onFechar }: { r: Reembolso; onFechar: () => void }) {
  const recusa = [...(r.historico ?? [])].reverse().find((h) => h.status_novo === 'recusado')
  return (
    <Envelope r={r} onFechar={onFechar}>
      {recusa?.motivo && (
        <p className="mt-3 rounded-lg border border-[#f0c2c2] bg-[#fdeaea] px-3 py-2 text-sm text-[#8a1f1f]"><strong className="font-semibold">Motivo da recusa:</strong> {recusa.motivo}</p>
      )}
    </Envelope>
  )
}

function ModalDecisao({ r, perfil, onFechar, aoDecidir, setAviso, setErro }: {
  r: Reembolso; perfil: Perfil; onFechar: () => void; aoDecidir: () => void; setAviso: (s: string | null) => void; setErro: (s: string | null) => void
}) {
  const [pendente, setPendente] = useState(false)
  const [recusando, setRecusando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [dataPag, setDataPag] = useState(new Date().toISOString().slice(0, 10))
  const financeiro = ehEtapaFinanceiro(r.status)

  async function aprovar() {
    setPendente(true); setErro(null); setAviso(null)
    try { await aprovarReembolso(r.id, perfil); setAviso('Aprovado e encaminhado ao Financeiro.'); aoDecidir() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não consegui aprovar.'); setPendente(false) }
  }
  async function pagar() {
    setPendente(true); setErro(null); setAviso(null)
    try { const { status } = await registrarPagamento(r.id, perfil, dataPag); setAviso(status === 'agendado' ? 'Pagamento agendado.' : 'Pagamento registrado!'); aoDecidir() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não consegui registrar o pagamento.'); setPendente(false) }
  }
  async function recusar() {
    setPendente(true); setErro(null); setAviso(null)
    try { await recusarReembolso(r.id, perfil, motivo); setAviso('Solicitação recusada. O solicitante verá o motivo.'); aoDecidir() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não consegui recusar.'); setPendente(false) }
  }

  return (
    <Envelope r={r} onFechar={onFechar}>
      <div className="mt-4 border-t border-borda pt-4">
        {!recusando ? (
          financeiro ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-medium text-tinta-2">
                Data do pagamento
                <span className="mt-0.5 block text-[11px] font-normal text-tinta-3">Futura = Agendado; hoje/passada = Pago.</span>
                <input type="date" value={dataPag} onChange={(e) => setDataPag(e.target.value)} className={`${ENTRADA} mt-1`} />
              </label>
              <Botao type="button" disabled={pendente || !dataPag} onClick={pagar}><CheckCircle2 size={15} aria-hidden /> {pendente ? '…' : 'Registrar pagamento'}</Botao>
              <Botao type="button" variante="secundario" disabled={pendente} onClick={() => setRecusando(true)}><XCircle size={15} aria-hidden /> Recusar</Botao>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Botao type="button" disabled={pendente} onClick={aprovar}><CheckCircle2 size={15} aria-hidden /> {pendente ? '…' : 'Aprovar'}</Botao>
              <Botao type="button" variante="secundario" disabled={pendente} onClick={() => setRecusando(true)}><XCircle size={15} aria-hidden /> Recusar</Botao>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} placeholder="Motivo da recusa (o solicitante vê isso)…" className={ENTRADA} />
            <div className="flex flex-wrap gap-2">
              <Botao type="button" variante="perigo" disabled={pendente || motivo.trim().length < 3} onClick={recusar}>Confirmar recusa</Botao>
              <Botao type="button" variante="fantasma" disabled={pendente} onClick={() => { setRecusando(false); setMotivo('') }}>Cancelar</Botao>
            </div>
          </div>
        )}
      </div>
    </Envelope>
  )
}

// -------------------------------------------------------------
// Exportações
// -------------------------------------------------------------
function linhasExport(itens: Reembolso[]) {
  return itens.map((r) => ({
    Data: formatData(r.data_despesa), Solicitante: r.solicitante_nome, 'Centro de custo': r.centro_custo,
    Categoria: r.categoria, Descrição: r.descricao, Valor: formatBRL(r.valor),
    Status: STATUS_LABEL[statusEfetivo(r.status, r.data_pagamento)], Pagamento: r.data_pagamento ? formatData(r.data_pagamento) : '—',
  }))
}
function baixarCSV(itens: Reembolso[]) {
  const linhas = linhasExport(itens); if (linhas.length === 0) return
  const cab = Object.keys(linhas[0]); const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [cab.join(';'), ...linhas.map((l) => cab.map((c) => esc((l as any)[c])).join(';'))].join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = `reembolsos-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
function imprimirPDF(itens: Reembolso[], escopo: string) {
  const linhas = linhasExport(itens); const cab = linhas.length ? Object.keys(linhas[0]) : []
  const total = itens.reduce((s, r) => s + (Number(r.valor) || 0), 0)
  const w = window.open('', '_blank'); if (!w) return
  const body = linhas.map((l) => `<tr>${cab.map((c) => `<td>${String((l as any)[c] ?? '')}</td>`).join('')}</tr>`).join('')
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Reembolsos</title>
    <style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#1a1714;margin:32px}h1{font-size:18px;margin:0 0 4px}p{color:#57514a;margin:0 0 16px;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #d6d0c7;padding:6px 8px;text-align:left;vertical-align:top}th{background:#eaf3f7;color:#1f5c73}tfoot td{font-weight:bold;background:#f7f5f2}</style></head><body>
    <h1>Central das Solicitações — Soulan</h1><p>Escopo: ${escopo} · ${new Date().toLocaleString('pt-BR')} · ${itens.length} registro(s)</p>
    <table><thead><tr>${cab.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body}</tbody>
    <tfoot><tr><td colspan="${Math.max(1, cab.length - 3)}">Total</td><td>${formatBRL(total)}</td><td></td><td></td></tr></tfoot></table>
    <script>window.onload=function(){window.print()}</script></body></html>`)
  w.document.close()
}
