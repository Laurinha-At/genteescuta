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
  Receipt, Plus, ClipboardList, CheckSquare, LayoutList, Paperclip,
  CheckCircle2, XCircle, Download, Printer, FileText, Image as ImageIcon, Search,
  X, ChevronUp, ChevronDown, ChevronsUpDown, Check, Lock, User, Building2, CalendarDays, AlertCircle,
  ArrowLeft, ArrowRight,
} from 'lucide-react'
import {
  CATEGORIAS, STATUS_LABEL, STATUS_FAIXA, PAPEL_LABEL,
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
import { BotaoVoltar } from '@/components/BotaoVoltar'

type Aba = 'solicitar' | 'minhas' | 'fila' | 'central'

/** Normaliza para busca: sem acento, minúsculas. */
function normalizar(s: unknown): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function ReembolsoApp({ perfil }: { perfil: Perfil }) {
  const ehMaster = perfil.papeis.includes('master')
  const ehFinanceiro = perfil.papeis.includes('financeiro')
  const ehGestor = perfil.papeis.includes('gestor')
  const ehAprovador = ehMaster || ehFinanceiro || ehGestor
  // Rótulo da fila conforme o papel: Gestor = "Solicitações"; Financeiro/Master = "Fila de Solicitações".
  const filaLabel = (ehFinanceiro || ehMaster) ? 'Fila de Solicitações' : 'Solicitações'

  // Master (gentecultura) só controla: não solicita.
  const [aba, setAba] = useState<Aba>(ehMaster ? 'fila' : 'solicitar')
  const [minhas, setMinhas] = useState<Reembolso[]>([])
  const [gestao, setGestao] = useState<Reembolso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

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
    ...(!ehMaster ? [
      { id: 'solicitar' as Aba, rotulo: 'Solicitar', Icone: Plus },
      { id: 'minhas' as Aba, rotulo: 'Minhas solicitações', Icone: ClipboardList },
    ] : []),
    ...(ehAprovador ? [
      { id: 'fila' as Aba, rotulo: filaLabel, Icone: CheckSquare, badge: pendentes.length },
      { id: 'central' as Aba, rotulo: 'Central das Solicitações', Icone: LayoutList },
    ] : []),
  ]

  return (
    <>
      <BotaoVoltar />

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
          <FormReembolso perfil={perfil} aoEnviar={() => { setErro(null); recarregar(); setAba('minhas'); setSucesso(true) }} setAviso={setAviso} setErro={setErro} />
        )}
        {aba === 'minhas' && <ListaMinhas carregando={carregando} itens={minhas} />}
        {aba === 'fila' && (
          <Fila perfil={perfil} carregando={carregando} pendentes={pendentes} aoDecidir={recarregar} />
        )}
        {aba === 'central' && (
          <Central perfil={perfil} carregando={carregando} registros={gestao} />
        )}
      </div>

      {sucesso && <ModalSucesso onFechar={() => setSucesso(false)} />}
    </>
  )
}

// -------------------------------------------------------------
// Mensagem de sucesso após enviar a solicitação
// -------------------------------------------------------------
function ModalSucesso({ onFechar }: { onFechar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl sm:p-7" onClick={(e) => e.stopPropagation()}>
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef7e3] text-verde-escuro">
          <CheckCircle2 size={34} aria-hidden />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-tinta">Solicitação realizada com sucesso!</h3>
        <div className="mt-3 space-y-2 text-sm leading-6 text-tinta-2">
          <p>
            Agora, aguarde as próximas etapas do processo. A solicitação será encaminhada para aprovação da sua
            gestão e, após a aprovação, seguirá para o Financeiro para realização do pagamento.
          </p>
          <p>Acompanhe o andamento da solicitação e aguarde a conclusão das etapas.</p>
        </div>
        <Botao type="button" onClick={onFechar} className="mt-6 w-full justify-center">
          Acompanhar minhas solicitações
        </Botao>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// Fluxo do reembolso (4 etapas) — SÓ na tela de acompanhamento do
// pedido já enviado, destacando a etapa atual conforme o status.
// -------------------------------------------------------------
const ETAPAS_FLUXO = [
  { t: 'Solicitação', d: 'Pedido enviado com o comprovante.' },
  { t: 'Aprovação do gestor', d: 'O gestor da área aprova ou recusa.' },
  { t: 'Pagamento (Financeiro)', d: 'O Financeiro registra o pagamento.' },
  { t: 'Pago', d: 'Reembolso concluído.' },
]
/** Etapa "corrente" (1..4) a partir do status; 5 = concluído (pago). */
function etapaDoStatus(status: StatusReembolso): number {
  if (status === 'pendente_gestor' || status === 'pendente_master') return 2
  if (status === 'pendente_financeiro') return 3
  if (status === 'agendado') return 4
  if (status === 'pago' || status === 'aprovado') return 5
  return 2
}
function FluxoReembolso({ status, dataPagamento }: { status: StatusReembolso; dataPagamento?: string | null }) {
  const efetivo = statusEfetivo(status, dataPagamento)
  const recusado = efetivo === 'recusado'
  const atual = etapaDoStatus(efetivo)
  return (
    <div className="rounded-xl border border-borda bg-superficie-2 p-4">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-tinta-3">Fluxo do reembolso</p>
      <ol className="mt-3">
        {ETAPAS_FLUXO.map((p, i) => {
          const n = i + 1
          let estado: 'feito' | 'ativo' | 'pendente' | 'recusa'
          if (recusado) estado = n === 1 ? 'feito' : n === 2 ? 'recusa' : 'pendente'
          else if (n < atual) estado = 'feito'
          else if (n === atual) estado = 'ativo'
          else estado = 'pendente'
          const bolha =
            estado === 'feito' ? 'bg-verde-escuro text-white'
              : estado === 'ativo' ? 'bg-marca text-white ring-4 ring-marca-clara'
                : estado === 'recusa' ? 'bg-critico text-white'
                  : 'border border-borda-forte bg-white text-tinta-3'
          const titulo = estado === 'recusa' ? 'Recusado' : p.t
          return (
            <li key={n} className="relative flex gap-3 pb-3.5 last:pb-0">
              {n < ETAPAS_FLUXO.length && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-borda-forte" aria-hidden />}
              <span className={`relative z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold ${bolha}`}>
                {estado === 'feito' ? <Check size={14} aria-hidden /> : estado === 'recusa' ? <X size={14} aria-hidden /> : n}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={`text-[0.8125rem] font-semibold ${estado === 'ativo' ? 'text-marca-escura' : estado === 'recusa' ? 'text-critico' : 'text-tinta'}`}>{titulo}</p>
                <p className="text-[0.6875rem] leading-4 text-tinta-3">{estado === 'recusa' ? 'A solicitação foi recusada.' : p.t === 'Pago' && estado === 'ativo' ? 'Pagamento agendado.' : p.d}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// -------------------------------------------------------------
// Barra dos 5 passos do wizard — SÓ enquanto preenche a solicitação.
// -------------------------------------------------------------
const PASSOS_WIZARD = ['Identificação', 'Despesa', 'Motivo', 'Comprovante', 'Conclusão']
function BarraPassos({ atual, maximo, aoIr }: { atual: number; maximo: number; aoIr: (n: number) => void }) {
  return (
    <ol className="flex items-start gap-1 overflow-x-auto pb-1">
      {PASSOS_WIZARD.map((rot, i) => {
        const n = i + 1
        const feito = n < atual
        const ativo = n === atual
        const alcancavel = n <= maximo
        return (
          <li key={n} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" style={{ minWidth: '3.4rem' }}>
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${n === 1 ? 'opacity-0' : feito || ativo ? 'bg-marca' : 'bg-borda-forte'}`} aria-hidden />
              <button
                type="button"
                disabled={!alcancavel}
                onClick={() => alcancavel && aoIr(n)}
                aria-current={ativo ? 'step' : undefined}
                className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold transition-colors ${ativo ? 'bg-marca text-white ring-4 ring-marca-clara' : feito ? 'bg-verde-escuro text-white' : 'border border-borda-forte bg-white text-tinta-3'} ${alcancavel && !ativo ? 'cursor-pointer' : ''} disabled:cursor-default`}
              >
                {feito ? <Check size={14} aria-hidden /> : n}
              </button>
              <span className={`h-0.5 flex-1 ${n === PASSOS_WIZARD.length ? 'opacity-0' : feito ? 'bg-marca' : 'bg-borda-forte'}`} aria-hidden />
            </div>
            <span className={`text-center text-[0.625rem] font-semibold leading-tight ${ativo ? 'text-marca-escura' : feito ? 'text-tinta-2' : 'text-tinta-3'}`}>{rot}</span>
          </li>
        )
      })}
    </ol>
  )
}

// -------------------------------------------------------------
// Campos auxiliares do formulário (fora do componente para não
// remontar os inputs a cada tecla — evita o "erro ao digitar").
// -------------------------------------------------------------
function CampoLeitura({ Icone, rotulo, valor }: { Icone: typeof User; rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-tinta-3">{rotulo}</p>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-borda bg-superficie-2 px-3 py-2 text-sm text-tinta">
        <Icone size={14} className="flex-none text-tinta-3" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{valor}</span>
        <span title="Preenchido automaticamente" className="flex-none"><Lock size={12} className="text-tinta-3" aria-hidden /></span>
      </div>
    </div>
  )
}
function ErroCampo({ msg }: { msg: string }) {
  if (!msg) return null
  return <p className="mt-1 flex items-center gap-1 text-xs font-medium text-critico"><AlertCircle size={12} aria-hidden /> {msg}</p>
}
const fmtDataBR = (iso: string) => { const p = iso.slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso }

// -------------------------------------------------------------
// Formulário de solicitação
// -------------------------------------------------------------
function FormReembolso({ perfil, aoEnviar, setAviso, setErro }: {
  perfil: Perfil; aoEnviar: () => void; setAviso: (s: string | null) => void; setErro: (s: string | null) => void
}) {
  const hoje = new Date().toISOString().slice(0, 10)
  const centro = perfil.centro_custo || ''
  const semCentro = !centro

  const [passo, setPasso] = useState(1)          // 1..5
  const [maximo, setMaximo] = useState(1)         // passo mais avançado já alcançado
  const [tentou, setTentou] = useState(false)     // mostra erros do passo atual
  const [data, setData] = useState('')            // data da compra/gasto
  const [categoria, setCategoria] = useState('')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [pendente, setPendente] = useState(false)

  const valorNum = Number(String(valor).replace(/\./g, '').replace(',', '.'))
  const erros = {
    data: !data ? 'Informe a data da compra/gasto.' : '',
    categoria: !categoria ? 'Escolha a categoria da despesa.' : '',
    valor: !(valorNum > 0) ? 'Informe um valor maior que zero.' : '',
    descricao: descricao.trim().length < 3 ? 'Descreva o motivo (mínimo 3 letras).' : '',
    arquivo: !arquivo ? 'Anexe o comprovante (imagem ou PDF).' : '',
  }
  const destino = perfil.papeis.includes('gestor') ? 'Master' : perfil.papeis.includes('master') ? 'Financeiro' : 'gestor da sua área'
  const borda = (e: string) => `${ENTRADA}${tentou && e ? ' border-critico focus:border-critico' : ''}`

  function passoValido(n: number): boolean {
    if (n === 1) return !semCentro
    if (n === 2) return !erros.data && !erros.categoria && !erros.valor
    if (n === 3) return !erros.descricao
    if (n === 4) return !erros.arquivo
    return !semCentro && !Object.values(erros).some(Boolean)
  }
  function avancar() {
    if (!passoValido(passo)) { setTentou(true); return }
    const n = Math.min(PASSOS_WIZARD.length, passo + 1)
    setPasso(n); setMaximo((m) => Math.max(m, n)); setTentou(false)
  }
  function voltar() { setPasso((p) => Math.max(1, p - 1)); setTentou(false) }
  function irPara(n: number) { if (n <= maximo) { setPasso(n); setTentou(false) } }

  async function enviar() {
    setErro(null); setAviso(null)
    if (!passoValido(5)) {
      setTentou(true)
      const primeiro = [1, 2, 3, 4].find((n) => !passoValido(n)) ?? 1
      setPasso(primeiro)
      setErro('Preencha todos os campos obrigatórios antes de enviar.')
      return
    }
    setPendente(true)
    try {
      const anexo: Anexo = await prepararAnexo(arquivo!)
      await criarReembolso({ centro_custo: centro, data_despesa: data, categoria, descricao, valor: valorNum }, anexo, perfil)
      aoEnviar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui enviar a solicitação.')
    }
    setPendente(false)
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); passo < 5 ? avancar() : enviar() }} className="space-y-4" noValidate>
      <div className="cartao-g p-5">
        <BarraPassos atual={passo} maximo={maximo} aoIr={irPara} />
      </div>

      <div className="cartao-g space-y-4 p-5 sm:p-6">
        {/* Passo 1 — Identificação */}
        {passo === 1 && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-tinta">Identificação</p>
              <p className="mt-1 text-xs text-tinta-3">Preenchido automaticamente do seu cadastro — confira e siga.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <CampoLeitura Icone={User} rotulo="Solicitante" valor={perfil.nome || perfil.email || '—'} />
              <CampoLeitura Icone={Building2} rotulo="Centro de custo" valor={centro || 'Não definido'} />
              <CampoLeitura Icone={CalendarDays} rotulo="Data da solicitação" valor={fmtDataBR(hoje)} />
            </div>
            {semCentro && (
              <p className="flex items-start gap-2 rounded-lg border border-[#f0c2c2] bg-[#fdeaea] px-3 py-2 text-xs leading-5 text-[#8a1f1f]">
                <AlertCircle size={14} className="mt-0.5 flex-none" aria-hidden />
                Seu centro de custo ainda não foi definido no cadastro. Peça à equipe de Gente &amp; Cultura para configurar antes de solicitar.
              </p>
            )}
          </div>
        )}

        {/* Passo 2 — Despesa */}
        {passo === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-tinta">Despesa</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-tinta">Data da compra / gasto <span className="text-critico">*</span></label>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={borda(erros.data)} max={hoje} />
                {tentou && <ErroCampo msg={erros.data} />}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-tinta">Categoria <span className="text-critico">*</span></label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={borda(erros.categoria)}>
                  <option value="">Escolha…</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {tentou && <ErroCampo msg={erros.categoria} />}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-tinta">Valor (R$) <span className="text-critico">*</span></label>
              <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex.: 150,00" className={borda(erros.valor)} />
              {tentou && <ErroCampo msg={erros.valor} />}
            </div>
          </div>
        )}

        {/* Passo 3 — Motivo */}
        {passo === 3 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-tinta">Motivo</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-tinta">Descrição <span className="text-critico">*</span></label>
              <textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} className={borda(erros.descricao)} placeholder="Ex.: almoço com cliente, corrida de app até o evento…" />
              {tentou && <ErroCampo msg={erros.descricao} />}
            </div>
          </div>
        )}

        {/* Passo 4 — Comprovante */}
        {passo === 4 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-tinta">Comprovante</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-tinta">Anexo <span className="text-critico">*</span></label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-lg border border-dashed bg-white px-4 py-3 text-sm text-tinta-2 transition-colors hover:border-marca ${tentou && erros.arquivo ? 'border-critico' : 'border-borda-forte'}`}>
                <Paperclip size={16} className="text-marca" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{arquivo ? arquivo.name : 'Escolher foto ou PDF…'}</span>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
              </label>
              <p className="mt-1 text-xs text-tinta-3">Aceita imagem (foto) ou PDF.</p>
              {tentou && <ErroCampo msg={erros.arquivo} />}
            </div>
          </div>
        )}

        {/* Passo 5 — Conclusão */}
        {passo === 5 && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-tinta">Conclusão</p>
              <p className="mt-1 text-xs text-tinta-3">Confira os dados e envie. Depois vai direto para <strong className="font-semibold text-tinta-2">{destino}</strong>.</p>
            </div>
            <dl className="grid gap-x-4 gap-y-2.5 rounded-xl border border-borda bg-superficie-2 p-4 sm:grid-cols-2">
              <Resumo rotulo="Solicitante" valor={perfil.nome || perfil.email || '—'} />
              <Resumo rotulo="Centro de custo" valor={centro || '—'} />
              <Resumo rotulo="Data da compra" valor={data ? fmtDataBR(data) : '—'} />
              <Resumo rotulo="Categoria" valor={categoria || '—'} />
              <Resumo rotulo="Valor" valor={valorNum > 0 ? formatBRL(valorNum) : '—'} />
              <Resumo rotulo="Comprovante" valor={arquivo ? arquivo.name : '—'} />
              <div className="sm:col-span-2"><Resumo rotulo="Descrição" valor={descricao.trim() || '—'} /></div>
            </dl>
          </div>
        )}

        {/* Navegação do wizard */}
        <div className="flex items-center justify-between gap-3 border-t border-borda pt-4">
          <button
            type="button"
            onClick={voltar}
            disabled={passo === 1 || pendente}
            className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3.5 py-2 text-sm font-medium text-tinta-2 transition-colors hover:border-marca disabled:opacity-40"
          >
            <ArrowLeft size={15} aria-hidden /> Voltar
          </button>
          {passo < PASSOS_WIZARD.length ? (
            <Botao type="submit" disabled={semCentro}>
              Continuar <ArrowRight size={15} aria-hidden />
            </Botao>
          ) : (
            <Botao type="submit" disabled={pendente || semCentro}>
              <Receipt size={15} aria-hidden /> {pendente ? 'Enviando…' : 'Enviar solicitação'}
            </Botao>
          )}
        </div>
      </div>
    </form>
  )
}
function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-tinta-3">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-sm text-tinta">{valor}</dd>
    </div>
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
          <div className="mt-3"><FluxoReembolso status={r.status} dataPagamento={r.data_pagamento} /></div>
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
type Coluna = { key: string; label: string; texto: (r: Reembolso) => string; ord: (r: Reembolso) => string | number; right?: boolean; chip?: boolean; trunc?: boolean }

const COLS_BASE: Coluna[] = [
  { key: 'data', label: 'Data', texto: (r) => formatData(r.data_despesa), ord: (r) => r.data_despesa ?? '' },
  { key: 'solicitante', label: 'Solicitante', texto: (r) => r.solicitante_nome, ord: (r) => normalizar(r.solicitante_nome), trunc: true },
  { key: 'centro', label: 'Centro de custo', texto: (r) => r.centro_custo, ord: (r) => normalizar(r.centro_custo) },
  { key: 'categoria', label: 'Categoria', texto: (r) => r.categoria, ord: (r) => normalizar(r.categoria) },
  { key: 'valor', label: 'Valor', texto: (r) => formatBRL(r.valor), ord: (r) => r.valor ?? 0, right: true },
  { key: 'status', label: 'Status', texto: (r) => STATUS_LABEL[statusEfetivo(r.status, r.data_pagamento)], ord: (r) => r.status, chip: true },
]
const COLS_CENTRAL: Coluna[] = [
  ...COLS_BASE,
  { key: 'pagamento', label: 'Pagamento', texto: (r) => (r.data_pagamento ? formatData(r.data_pagamento) : '—'), ord: (r) => r.data_pagamento ?? '' },
]

function TabelaSolicitacoes({ registros, colunas, aoAbrir, acoes }: {
  registros: Reembolso[]; colunas: Coluna[]; aoAbrir: (r: Reembolso) => void; acoes?: (r: Reembolso) => React.ReactNode
}) {
  const [busca, setBusca] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fCentro, setFCentro] = useState('')
  const [fCategoria, setFCategoria] = useState('')
  const [ordKey, setOrdKey] = useState('data')
  const [ordDir, setOrdDir] = useState<1 | -1>(-1)

  const centros = useMemo(() => Array.from(new Set(registros.map((r) => r.centro_custo).filter(Boolean))).sort(), [registros])
  const categorias = useMemo(() => Array.from(new Set(registros.map((r) => r.categoria).filter(Boolean))).sort(), [registros])
  // Só mostra o filtro de centro quando há mais de uma área no escopo (oculta
  // para colaborador e para gestor de uma área só).
  const mostrarCentro = centros.length > 1
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
        {mostrarCentro && (
          <select value={fCentro} onChange={(e) => setFCentro(e.target.value)} className={ENTRADA}>
            <option value="">Todos os centros</option>
            {centros.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
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
          <table className="w-full min-w-[44rem] text-sm">
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
                {acoes && <th className="px-4 py-2.5 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {filtrados.map((r) => (
                <tr key={r.id} onClick={() => aoAbrir(r)} className="cursor-pointer hover:bg-superficie-2">
                  {colunas.map((c) => (
                    <td key={c.key} className={`px-4 py-2.5 ${c.trunc ? '' : 'whitespace-nowrap'} ${c.right ? 'text-right font-medium text-tinta' : 'text-tinta-2'}`}>
                      {c.chip ? (
                        <StatusChip status={r.status} dataPagamento={r.data_pagamento} />
                      ) : c.trunc ? (
                        <span className="block max-w-[12rem] truncate" title={c.texto(r)}>{c.texto(r)}</span>
                      ) : (
                        c.texto(r)
                      )}
                    </td>
                  ))}
                  {acoes && <td className="whitespace-nowrap px-4 py-2.5 text-right">{acoes(r)}</td>}
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
type ResultadoAcao = { tipo: 'sucesso' | 'reprovado'; titulo: string; mensagem: string }

function Fila({ perfil, carregando, pendentes, aoDecidir }: {
  perfil: Perfil; carregando: boolean; pendentes: Reembolso[]; aoDecidir: () => void
}) {
  const [aberto, setAberto] = useState<{ r: Reembolso; modo: 'ver' | 'recusar' } | null>(null)
  const [resultado, setResultado] = useState<ResultadoAcao | null>(null)
  if (carregando) return <p className="text-sm text-tinta-3">Carregando…</p>

  const icones = (r: Reembolso) => (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <button type="button" title={ehEtapaFinanceiro(r.status) ? 'Registrar pagamento' : 'Aprovar'} onClick={() => setAberto({ r, modo: 'ver' })} className="rounded-md p-1.5 text-verde-escuro transition-colors hover:bg-[#eef7e3]">
        <CheckCircle2 size={18} aria-hidden />
      </button>
      <button type="button" title="Recusar" onClick={() => setAberto({ r, modo: 'recusar' })} className="rounded-md p-1.5 text-critico transition-colors hover:bg-[#fdeaea]">
        <XCircle size={18} aria-hidden />
      </button>
    </div>
  )

  return (
    <>
      <p className="text-sm text-tinta-2">Solicitações aguardando <strong>a sua decisão</strong> ({pendentes.length}).</p>
      {pendentes.length === 0 ? (
        <div className="cartao-g p-6 text-center text-sm text-tinta-3">Nada aguardando você agora. 🎉</div>
      ) : (
        <TabelaSolicitacoes registros={pendentes} colunas={COLS_BASE} aoAbrir={(r) => setAberto({ r, modo: 'ver' })} acoes={icones} />
      )}
      {aberto && (
        <ModalDecisao
          r={aberto.r}
          perfil={perfil}
          modoInicial={aberto.modo}
          onFechar={() => setAberto(null)}
          aoConcluir={(res) => { setAberto(null); setResultado(res) }}
        />
      )}
      {resultado && <ModalResultado {...resultado} onFechar={() => { setResultado(null); aoDecidir() }} />}
    </>
  )
}

function ModalResultado({ tipo, titulo, mensagem, onFechar }: ResultadoAcao & { onFechar: () => void }) {
  const sucesso = tipo === 'sucesso'
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4" onClick={onFechar}>
      <div className="anim-fade-up w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl sm:p-7" onClick={(e) => e.stopPropagation()}>
        <span className={`anim-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full ${sucesso ? 'bg-[#eef7e3] text-verde-escuro' : 'bg-[#fdeaea] text-critico'}`}>
          {sucesso ? <CheckCircle2 size={34} aria-hidden /> : <XCircle size={34} aria-hidden />}
        </span>
        <h3 className="mt-4 text-lg font-semibold text-tinta">{titulo}</h3>
        <p className="mt-3 text-sm leading-6 text-tinta-2">{mensagem}</p>
        <Botao type="button" onClick={onFechar} className="mt-6 w-full justify-center">Entendi</Botao>
      </div>
    </div>
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

function ModalDecisao({ r, perfil, modoInicial, onFechar, aoConcluir }: {
  r: Reembolso; perfil: Perfil; modoInicial: 'ver' | 'recusar'; onFechar: () => void; aoConcluir: (res: ResultadoAcao) => void
}) {
  const [pendente, setPendente] = useState(false)
  const [recusando, setRecusando] = useState(modoInicial === 'recusar')
  const [motivo, setMotivo] = useState('')
  const [dataPag, setDataPag] = useState(new Date().toISOString().slice(0, 10))
  const [erro, setErro] = useState<string | null>(null)
  const financeiro = ehEtapaFinanceiro(r.status)

  async function aprovar() {
    setPendente(true); setErro(null)
    try {
      await aprovarReembolso(r.id, perfil)
      aoConcluir({ tipo: 'sucesso', titulo: 'Solicitação aprovada!', mensagem: 'Encaminhada ao Financeiro para o pagamento. Acompanhe o andamento nas próximas etapas.' })
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não consegui aprovar.'); setPendente(false) }
  }
  async function pagar() {
    setPendente(true); setErro(null)
    try {
      const { status } = await registrarPagamento(r.id, perfil, dataPag)
      aoConcluir(status === 'agendado'
        ? { tipo: 'sucesso', titulo: 'Pagamento agendado!', mensagem: 'O pagamento foi agendado para a data informada. O solicitante acompanha o status.' }
        : { tipo: 'sucesso', titulo: 'Pagamento concluído!', mensagem: 'O reembolso foi marcado como pago. Processo finalizado. ✅' })
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não consegui registrar o pagamento.'); setPendente(false) }
  }
  async function recusar() {
    setPendente(true); setErro(null)
    try {
      await recusarReembolso(r.id, perfil, motivo)
      aoConcluir({ tipo: 'reprovado', titulo: 'Solicitação reprovada', mensagem: 'O solicitante será informado com o motivo que você registrou.' })
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não consegui recusar.'); setPendente(false) }
  }

  return (
    <Envelope r={r} onFechar={onFechar}>
      <div className="mt-4 border-t border-borda pt-4">
        {erro && <div className="mb-3"><Aviso tom="erro">{erro}</Aviso></div>}
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
