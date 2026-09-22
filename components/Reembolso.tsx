'use client'

// =============================================================
// Solicitação de Reembolso — app adaptado aos papéis do usuário.
// Abas: Solicitar · Minhas solicitações · Aprovações (para quem
// aprova). Identidade Soulan (azul/verde). Segurança reforçada nas
// Regras do Firestore; aqui a interface já esconde o que não compete.
// =============================================================
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Receipt, Plus, ClipboardList, CheckSquare, Paperclip,
  CheckCircle2, XCircle, Download, Printer, FileText, Image as ImageIcon,
} from 'lucide-react'
import {
  CENTROS_CUSTO, CATEGORIAS, STATUS_LABEL, STATUS_FAIXA, PAPEL_LABEL,
  formatBRL, formatData, podeAprovar, statusEfetivo, ehEtapaFinanceiro,
  type StatusReembolso,
} from '@/lib/reembolso'
import {
  criarReembolso, prepararAnexo, listarMinhas, listarParaGestao,
  aprovarReembolso, recusarReembolso, registrarPagamento, getAnexo,
  type Reembolso, type Anexo,
} from '@/lib/fb/reembolso'
import type { Perfil } from '@/lib/fb/funcionarios'
import { Campo, ENTRADA, Botao, Aviso, Chip } from '@/components/ui'

type Aba = 'solicitar' | 'minhas' | 'aprovacoes'

export function ReembolsoApp({ perfil }: { perfil: Perfil }) {
  const ehAprovador =
    perfil.papeis.includes('master') ||
    perfil.papeis.includes('financeiro') ||
    perfil.papeis.includes('gestor')

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
      setMinhas(m)
      setGestao(g)
    } catch {
      /* silencioso — a tela mostra vazio */
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => {
    recarregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pendentesAprovar = useMemo(
    () =>
      gestao.filter(
        (r) =>
          r.solicitante_uid !== perfil.uid &&
          podeAprovar(r.status, perfil.papeis, perfil.centro_custo, r.centro_custo),
      ),
    [gestao, perfil],
  )

  const ABAS: { id: Aba; rotulo: string; Icone: typeof Plus; badge?: number }[] = [
    { id: 'solicitar', rotulo: 'Solicitar', Icone: Plus },
    { id: 'minhas', rotulo: 'Minhas solicitações', Icone: ClipboardList },
    ...(ehAprovador
      ? [{ id: 'aprovacoes' as Aba, rotulo: 'Aprovações', Icone: CheckSquare, badge: pendentesAprovar.length }]
      : []),
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
          <h1 className="titulo-hero text-[1.875rem] text-tinta">Solicitação de Reembolso</h1>
          <p className="mt-2 max-w-xl text-[0.9688rem] leading-7 text-tinta-2">
            Peça o reembolso de despesas, anexe o comprovante e acompanhe a aprovação.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {perfil.papeis.map((p) => (
              <span key={p} className="rounded-full bg-superficie-2 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-tinta-2">
                {PAPEL_LABEL[p as keyof typeof PAPEL_LABEL] ?? p}
              </span>
            ))}
            {perfil.centro_custo && (
              <span className="rounded-full bg-marca-clara px-2.5 py-0.5 text-[0.6875rem] font-semibold text-marca-texto">
                {perfil.centro_custo}
              </span>
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
              <span className={`rounded-full px-1.5 text-[11px] font-semibold leading-5 ${aba === id ? 'bg-white/25 text-white' : 'bg-critico text-white'}`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {aviso && <Aviso tom="sucesso">{aviso}</Aviso>}
        {erro && <Aviso tom="erro">{erro}</Aviso>}

        {aba === 'solicitar' && (
          <FormReembolso
            perfil={perfil}
            aoEnviar={() => { setErro(null); recarregar(); setAba('minhas') }}
            setAviso={setAviso}
            setErro={setErro}
          />
        )}

        {aba === 'minhas' && (
          <ListaMinhas carregando={carregando} itens={minhas} />
        )}

        {aba === 'aprovacoes' && (
          <Aprovacoes
            perfil={perfil}
            carregando={carregando}
            todas={gestao}
            pendentes={pendentesAprovar}
            aoDecidir={recarregar}
            setAviso={setAviso}
            setErro={setErro}
          />
        )}
      </div>
    </>
  )
}

// -------------------------------------------------------------
// Formulário de solicitação
// -------------------------------------------------------------
function FormReembolso({
  perfil, aoEnviar, setAviso, setErro,
}: {
  perfil: Perfil
  aoEnviar: () => void
  setAviso: (s: string | null) => void
  setErro: (s: string | null) => void
}) {
  const [centro, setCentro] = useState(perfil.centro_custo || '')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [pendente, setPendente] = useState(false)

  const destino = perfil.papeis.includes('gestor')
    ? 'Master Administrador'
    : perfil.papeis.includes('master')
      ? 'Financeiro'
      : 'gestor da sua área'

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null); setAviso(null)
    const f = new FormData(e.currentTarget)
    const valorTxt = String(f.get('valor') ?? '').replace(/\./g, '').replace(',', '.')
    const valor = Number(valorTxt)
    if (!arquivo) { setErro('Anexe o comprovante (foto ou PDF).'); return }
    setPendente(true)
    try {
      const anexo: Anexo = await prepararAnexo(arquivo)
      await criarReembolso(
        {
          centro_custo: centro,
          data_despesa: String(f.get('data') ?? ''),
          categoria: String(f.get('categoria') ?? ''),
          descricao: String(f.get('descricao') ?? ''),
          valor,
        },
        anexo,
        perfil,
      )
      ;(e.target as HTMLFormElement).reset()
      setArquivo(null)
      setCentro(perfil.centro_custo || '')
      setAviso('Solicitação enviada! Acompanhe o status em "Minhas solicitações".')
      aoEnviar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui enviar a solicitação.')
    }
    setPendente(false)
  }

  return (
    <form onSubmit={enviar} className="cartao-g space-y-4 p-5 sm:p-6">
      <Campo rotulo="Solicitante">
        <input value={`${perfil.nome || perfil.email}`} readOnly className={`${ENTRADA} bg-superficie-2 text-tinta-2`} />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Centro de custo (área)" obrigatorio>
          <select required value={centro} onChange={(e) => setCentro(e.target.value)} className={ENTRADA}>
            <option value="">Selecione…</option>
            {CENTROS_CUSTO.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Data da despesa" obrigatorio>
          <input name="data" type="date" required className={ENTRADA} max={new Date().toISOString().slice(0, 10)} />
        </Campo>
        <Campo rotulo="Tipo / categoria da despesa" obrigatorio>
          <select name="categoria" required className={ENTRADA} defaultValue="">
            <option value="">Selecione…</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Valor (R$)" obrigatorio>
          <input name="valor" required inputMode="decimal" placeholder="Ex.: 150,00" className={ENTRADA} />
        </Campo>
      </div>

      <Campo rotulo="Descrição / motivo" obrigatorio>
        <textarea name="descricao" required rows={3} minLength={3} className={ENTRADA} placeholder="Explique a despesa (ex.: almoço com cliente, corrida de app até o evento…)." />
      </Campo>

      <Campo rotulo="Comprovante (foto ou PDF)" obrigatorio ajuda="Imagens são compactadas automaticamente. PDF até ~700 KB.">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-borda-forte bg-white px-4 py-3 text-sm text-tinta-2 transition-colors hover:border-marca">
          <Paperclip size={16} className="text-marca" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{arquivo ? arquivo.name : 'Escolher arquivo…'}</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </label>
      </Campo>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Botao type="submit" disabled={pendente}>
          <Receipt size={15} aria-hidden /> {pendente ? 'Enviando…' : 'Enviar solicitação'}
        </Botao>
        <p className="text-xs text-tinta-3">Ao enviar, o pedido vai para <strong className="font-semibold text-tinta-2">{destino}</strong>.</p>
      </div>
    </form>
  )
}

// -------------------------------------------------------------
// Minhas solicitações
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
  return (
    <div className="space-y-3">
      {itens.map((r) => <CardReembolso key={r.id} r={r} />)}
    </div>
  )
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
          <div className="mt-3">
            <BotaoAnexo id={r.id} tipo={r.anexo_tipo} nome={r.anexo_nome} />
          </div>
        </div>
      )}
    </div>
  )
}

function Timeline({ r }: { r: Reembolso }) {
  const passos = r.historico ?? []
  return (
    <ol className="mt-4 space-y-2">
      {passos.map((h, i) => {
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

function BotaoAnexo({ id, tipo, nome }: { id: string; tipo: 'image' | 'pdf' | null; nome: string | null }) {
  const [carregando, setCarregando] = useState(false)
  async function abrir() {
    setCarregando(true)
    try {
      const a = await getAnexo(id)
      if (!a) return
      const resp = await fetch(a.dados)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } finally {
      setCarregando(false)
    }
  }
  return (
    <button type="button" onClick={abrir} disabled={carregando} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-1.5 text-sm font-medium text-tinta-2 transition-colors hover:border-marca hover:text-marca-texto disabled:opacity-60">
      {tipo === 'pdf' ? <FileText size={15} aria-hidden /> : <ImageIcon size={15} aria-hidden />}
      {carregando ? 'Abrindo…' : 'Ver comprovante'}
    </button>
  )
}

// -------------------------------------------------------------
// Aprovações (gestor / financeiro / master)
// -------------------------------------------------------------
function Aprovacoes({
  perfil, carregando, todas, pendentes, aoDecidir, setAviso, setErro,
}: {
  perfil: Perfil
  carregando: boolean
  todas: Reembolso[]
  pendentes: Reembolso[]
  aoDecidir: () => void
  setAviso: (s: string | null) => void
  setErro: (s: string | null) => void
}) {
  if (carregando) return <p className="text-sm text-tinta-3">Carregando…</p>

  const escopo = perfil.papeis.includes('gestor') && !perfil.papeis.includes('master') && !perfil.papeis.includes('financeiro')
    ? `centro de custo ${perfil.centro_custo || '—'}`
    : 'todos os centros de custo'

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-[0.9375rem] font-[620] text-tinta">
          Pendentes de você <span className="text-tinta-3">({pendentes.length})</span>
        </h2>
        {pendentes.length === 0 ? (
          <div className="cartao-g p-6 text-center text-sm text-tinta-3">Nada aguardando sua decisão agora. 🎉</div>
        ) : (
          <div className="space-y-3">
            {pendentes.map((r) => (
              <CardAprovacao key={r.id} r={r} perfil={perfil} aoDecidir={aoDecidir} setAviso={setAviso} setErro={setErro} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[0.9375rem] font-[620] text-tinta">
            Todas as solicitações <span className="text-tinta-3">({todas.length})</span>
          </h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => baixarCSV(todas)} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-1.5 text-sm font-medium text-tinta-2 hover:border-marca hover:text-marca-texto">
              <Download size={15} aria-hidden /> CSV
            </button>
            <button type="button" onClick={() => imprimirPDF(todas, escopo)} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-1.5 text-sm font-medium text-tinta-2 hover:border-marca hover:text-marca-texto">
              <Printer size={15} aria-hidden /> PDF
            </button>
          </div>
        </div>
        <p className="mb-3 text-xs text-tinta-3">Você enxerga {escopo}.</p>
        {todas.length === 0 ? (
          <div className="cartao-g p-6 text-center text-sm text-tinta-3">Nenhuma solicitação no seu escopo ainda.</div>
        ) : (
          <div className="cartao-g overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-borda text-left text-xs font-semibold text-tinta-3">
                  <th className="px-4 py-2.5">Data</th>
                  <th className="px-4 py-2.5">Solicitante</th>
                  <th className="px-4 py-2.5">Centro de custo</th>
                  <th className="px-4 py-2.5">Categoria</th>
                  <th className="px-4 py-2.5 text-right">Valor</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {todas.map((r) => (
                  <tr key={r.id} className="hover:bg-superficie-2">
                    <td className="whitespace-nowrap px-4 py-2.5 text-tinta-2">{formatData(r.data_despesa)}</td>
                    <td className="px-4 py-2.5 text-tinta">{r.solicitante_nome}</td>
                    <td className="px-4 py-2.5 text-tinta-2">{r.centro_custo}</td>
                    <td className="px-4 py-2.5 text-tinta-2">{r.categoria}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-tinta">{formatBRL(r.valor)}</td>
                    <td className="px-4 py-2.5"><StatusChip status={r.status} dataPagamento={r.data_pagamento} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function CardAprovacao({
  r, perfil, aoDecidir, setAviso, setErro,
}: {
  r: Reembolso
  perfil: Perfil
  aoDecidir: () => void
  setAviso: (s: string | null) => void
  setErro: (s: string | null) => void
}) {
  const [pendente, setPendente] = useState(false)
  const [recusando, setRecusando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [dataPag, setDataPag] = useState(new Date().toISOString().slice(0, 10))

  const etapaFinanceiro = ehEtapaFinanceiro(r.status)

  async function aprovar() {
    setPendente(true); setErro(null); setAviso(null)
    try {
      await aprovarReembolso(r.id, perfil)
      setAviso('Aprovado e encaminhado ao Financeiro.')
      aoDecidir()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui aprovar.')
    }
    setPendente(false)
  }
  async function pagar() {
    setPendente(true); setErro(null); setAviso(null)
    try {
      const { status } = await registrarPagamento(r.id, perfil, dataPag)
      setAviso(status === 'agendado' ? 'Pagamento agendado para a data informada.' : 'Pagamento registrado!')
      aoDecidir()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui registrar o pagamento.')
    }
    setPendente(false)
  }
  async function recusar() {
    setPendente(true); setErro(null); setAviso(null)
    try {
      await recusarReembolso(r.id, perfil, motivo)
      setAviso('Solicitação recusada. O solicitante verá o motivo.')
      aoDecidir()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui recusar.')
    }
    setPendente(false)
  }

  return (
    <div className="cartao-g p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-[620] text-tinta">{formatBRL(r.valor)}</span>
            <span className="text-sm text-tinta-3">· {r.categoria}</span>
            <StatusChip status={r.status} dataPagamento={r.data_pagamento} />
          </p>
          <p className="mt-0.5 text-xs text-tinta-3">
            {r.solicitante_nome} · {r.centro_custo} · {formatData(r.data_despesa)}
          </p>
        </div>
        <BotaoAnexo id={r.id} tipo={r.anexo_tipo} nome={r.anexo_nome} />
      </div>
      <p className="mt-2 text-sm leading-6 text-tinta-2">{r.descricao}</p>

      {!recusando ? (
        etapaFinanceiro ? (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-medium text-tinta-2">
                Data do pagamento
                <span className="mt-0.5 block text-[11px] font-normal text-tinta-3">Data futura fica “Agendado”; hoje/passada, “Pago”.</span>
                <input
                  type="date"
                  value={dataPag}
                  onChange={(e) => setDataPag(e.target.value)}
                  className={`${ENTRADA} mt-1`}
                />
              </label>
            </div>
            <Botao type="button" disabled={pendente || !dataPag} onClick={pagar}>
              <CheckCircle2 size={15} aria-hidden /> {pendente ? '…' : 'Registrar pagamento'}
            </Botao>
            <Botao type="button" variante="secundario" disabled={pendente} onClick={() => setRecusando(true)}>
              <XCircle size={15} aria-hidden /> Recusar
            </Botao>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <Botao type="button" disabled={pendente} onClick={aprovar}>
              <CheckCircle2 size={15} aria-hidden /> {pendente ? '…' : 'Aprovar'}
            </Botao>
            <Botao type="button" variante="secundario" disabled={pendente} onClick={() => setRecusando(true)}>
              <XCircle size={15} aria-hidden /> Recusar
            </Botao>
          </div>
        )
      ) : (
        <div className="mt-3 space-y-2">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            placeholder="Motivo da recusa (o solicitante vê isso)…"
            className={ENTRADA}
          />
          <div className="flex flex-wrap gap-2">
            <Botao type="button" variante="perigo" disabled={pendente || motivo.trim().length < 3} onClick={recusar}>
              Confirmar recusa
            </Botao>
            <Botao type="button" variante="fantasma" disabled={pendente} onClick={() => { setRecusando(false); setMotivo('') }}>
              Cancelar
            </Botao>
          </div>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------
// Exportações (sem dados sensíveis além do necessário à aprovação)
// -------------------------------------------------------------
function linhasExport(itens: Reembolso[]) {
  return itens.map((r) => ({
    Data: formatData(r.data_despesa),
    Solicitante: r.solicitante_nome,
    'Centro de custo': r.centro_custo,
    Categoria: r.categoria,
    Descrição: r.descricao,
    Valor: formatBRL(r.valor),
    Status: STATUS_LABEL[statusEfetivo(r.status, r.data_pagamento)],
    Pagamento: r.data_pagamento ? formatData(r.data_pagamento) : '—',
  }))
}

function baixarCSV(itens: Reembolso[]) {
  const linhas = linhasExport(itens)
  if (linhas.length === 0) return
  const cabec = Object.keys(linhas[0])
  const escapar = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [
    cabec.join(';'),
    ...linhas.map((l) => cabec.map((c) => escapar((l as any)[c])).join(';')),
  ].join('\r\n')
  // BOM para o Excel abrir os acentos corretamente.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reembolsos-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function imprimirPDF(itens: Reembolso[], escopo: string) {
  const linhas = linhasExport(itens)
  const cab = linhas.length ? Object.keys(linhas[0]) : []
  const total = itens.reduce((s, r) => s + (Number(r.valor) || 0), 0)
  const w = window.open('', '_blank')
  if (!w) return
  const linhasHtml = linhas
    .map((l) => `<tr>${cab.map((c) => `<td>${String((l as any)[c] ?? '')}</td>`).join('')}</tr>`)
    .join('')
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Reembolsos</title>
    <style>
      body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#1a1714;margin:32px}
      h1{font-size:18px;margin:0 0 4px} p{color:#57514a;margin:0 0 16px;font-size:12px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #d6d0c7;padding:6px 8px;text-align:left;vertical-align:top}
      th{background:#eaf3f7;color:#1f5c73}
      tfoot td{font-weight:bold;background:#f7f5f2}
    </style></head><body>
      <h1>Solicitações de Reembolso — Soulan</h1>
      <p>Escopo: ${escopo} · Gerado em ${new Date().toLocaleString('pt-BR')} · ${itens.length} registro(s)</p>
      <table><thead><tr>${cab.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${linhasHtml}</tbody>
      <tfoot><tr><td colspan="${Math.max(1, cab.length - 2)}">Total</td><td>${formatBRL(total)}</td><td></td></tr></tfoot>
      </table>
      <script>window.onload=function(){window.print()}</script>
    </body></html>`)
  w.document.close()
}
