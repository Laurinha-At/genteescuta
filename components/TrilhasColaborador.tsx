'use client'

// =============================================================
// Tela do colaborador: trilhas ativas com progresso, tabuleiro de
// casinhas (progressão sequencial), atividade e saldo de pontos.
// =============================================================
import { useEffect, useState } from 'react'
import Link from '@/components/LinkSemPrefetch'
import { Trophy, Lock, Check, Play, ArrowLeft, Star, Loader2, PartyPopper } from 'lucide-react'
import { observarLogin } from '@/lib/fb/auth'
import { perfilAtual, type Perfil } from '@/lib/fb/funcionarios'
import {
  listarTrilhasDevAtivas, listarAtividades, getProgressoUsuario, concluirAtividade,
  type TrilhaDev, type Atividade, type ProgressoUsuario,
} from '@/lib/fb/trilhasDev'

export function TrilhasColaborador() {
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined)
  const [trilhas, setTrilhas] = useState<TrilhaDev[] | null>(null)
  const [progresso, setProgresso] = useState<ProgressoUsuario>({ trilhas: {}, pontos_total: 0 })
  const [aberta, setAberta] = useState<TrilhaDev | null>(null)

  useEffect(() => {
    const off = observarLogin(async (u) => {
      if (!u) { setPerfil(null); return }
      const p = await perfilAtual().catch(() => null)
      setPerfil(p)
      const [ts, pr] = await Promise.all([listarTrilhasDevAtivas().catch(() => []), p ? getProgressoUsuario(p.uid).catch(() => ({ trilhas: {}, pontos_total: 0 })) : Promise.resolve({ trilhas: {}, pontos_total: 0 })])
      setTrilhas(ts)
      setProgresso(pr)
    })
    return off
  }, [])

  async function recarregarProgresso() {
    if (perfil) setProgresso(await getProgressoUsuario(perfil.uid).catch(() => progresso))
  }

  if (perfil === undefined) return <p className="text-sm text-tinta-3">Carregando…</p>
  if (!perfil) {
    return (
      <div className="cartao-g p-6 text-center">
        <p className="text-sm text-tinta-2">Entre com o seu acesso para ver as trilhas e acompanhar os seus pontos.</p>
        <Link href="/entrar" className="botao-gradiente mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold">Acessar</Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Saldo de pontos */}
      <div className="flex items-center gap-3 rounded-2xl border border-borda bg-white p-4 shadow-[0_1px_3px_rgba(26,23,20,0.04),0_4px_12px_rgba(26,23,20,0.06)]">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-marca-clara text-marca"><Trophy size={22} aria-hidden /></span>
        <div>
          <p className="text-xs font-medium text-tinta-3">Seus pontos</p>
          <p className="text-2xl font-bold leading-tight text-tinta tabular">{progresso.pontos_total}</p>
        </div>
      </div>

      {aberta ? (
        <Tabuleiro
          trilha={aberta}
          uid={perfil.uid}
          progresso={progresso}
          aoVoltar={() => setAberta(null)}
          aoProgredir={recarregarProgresso}
        />
      ) : (
        <ListaTrilhas trilhas={trilhas} progresso={progresso} aoAbrir={setAberta} />
      )}
    </div>
  )
}

function ListaTrilhas({ trilhas, progresso, aoAbrir }: { trilhas: TrilhaDev[] | null; progresso: ProgressoUsuario; aoAbrir: (t: TrilhaDev) => void }) {
  if (!trilhas) return <p className="text-sm text-tinta-3">Carregando trilhas…</p>
  if (trilhas.length === 0) return <div className="cartao-g p-6 text-center text-sm text-tinta-3">Nenhuma trilha disponível por enquanto.</div>
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {trilhas.map((t) => {
        const pr = progresso.trilhas[t.id]
        const feitas = pr?.concluidas.length ?? 0
        return (
          <button key={t.id} type="button" onClick={() => aoAbrir(t)} className="group overflow-hidden rounded-2xl border border-borda bg-white text-left shadow-[0_1px_3px_rgba(26,23,20,0.04),0_4px_12px_rgba(26,23,20,0.06)] transition-transform hover:-translate-y-0.5">
            <div className="relative h-28 w-full overflow-hidden bg-superficie-2">
              {t.capa ? <img src={t.capa} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center" style={{ background: 'var(--gradiente)' }}><Star size={28} className="text-white/80" aria-hidden /></span>}
              {pr?.concluida && <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[0.6875rem] font-bold text-marca-escura shadow-sm"><Check size={12} aria-hidden /> Concluída</span>}
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold text-tinta">{t.titulo}</p>
              {t.descricao && <p className="mt-1 line-clamp-2 text-xs leading-5 text-tinta-3">{t.descricao}</p>}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-marca-texto"><Star size={12} className="fill-current" aria-hidden /> {t.pontos} pts</span>
                <span className="text-tinta-3">{feitas > 0 ? `${feitas} atividade(s) feita(s)` : 'Comece agora'}</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function Tabuleiro({ trilha, uid, progresso, aoVoltar, aoProgredir }: { trilha: TrilhaDev; uid: string; progresso: ProgressoUsuario; aoVoltar: () => void; aoProgredir: () => Promise<void> }) {
  const [atividades, setAtividades] = useState<Atividade[] | null>(null)
  const [jogando, setJogando] = useState<Atividade | null>(null)
  const [festa, setFesta] = useState<number | null>(null)

  useEffect(() => { listarAtividades(trilha.id).then(setAtividades).catch(() => setAtividades([])) }, [trilha.id])

  const pr = progresso.trilhas[trilha.id]
  const feitas = pr?.concluidas ?? []
  const atual = feitas.length // índice da próxima atividade a fazer

  async function concluir(a: Atividade, resposta: unknown) {
    const total = atividades?.length ?? 0
    const r = await concluirAtividade(uid, { id: trilha.id, pontos: trilha.pontos }, a.id, total, resposta)
    setJogando(null)
    await aoProgredir()
    if (r.creditou) setFesta(trilha.pontos)
  }

  return (
    <div>
      <button type="button" onClick={aoVoltar} className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-2 hover:text-marca-texto"><ArrowLeft size={15} aria-hidden /> Todas as trilhas</button>

      <div className="mt-3 cartao-g p-5 sm:p-6">
        <h2 className="titulo-secao text-tinta">{trilha.titulo}</h2>
        {trilha.descricao && <p className="mt-1 text-sm leading-6 text-tinta-2">{trilha.descricao}</p>}

        {!atividades ? (
          <p className="mt-4 text-sm text-tinta-3">Carregando atividades…</p>
        ) : atividades.length === 0 ? (
          <p className="mt-4 text-sm text-tinta-3">Esta trilha ainda não tem atividades.</p>
        ) : (
          <>
            {festa !== null && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-marca-clara px-4 py-3 text-sm font-semibold text-marca-escura">
                <PartyPopper size={18} aria-hidden /> Trilha concluída! Você ganhou {festa} pontos.
              </div>
            )}
            {/* Tabuleiro de casinhas */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {atividades.map((a, i) => {
                const feito = feitas.includes(a.id) || i < atual
                const ehAtual = i === atual
                const bloqueado = i > atual
                return (
                  <button
                    key={a.id}
                    type="button"
                    disabled={!ehAtual}
                    onClick={() => ehAtual && setJogando(a)}
                    title={bloqueado ? 'Conclua a anterior para liberar' : a.titulo}
                    aria-label={`Atividade ${i + 1}: ${a.titulo}`}
                    className={`relative flex h-14 w-14 flex-none items-center justify-center rounded-2xl border-2 text-sm font-bold transition-transform ${
                      feito ? 'border-transparent bg-[#16A34A] text-white'
                        : ehAtual ? 'border-marca bg-marca-clara text-marca-escura ring-4 ring-marca/15 hover:-translate-y-0.5'
                          : 'border-borda bg-superficie-2 text-tinta-3'
                    }`}
                  >
                    {feito ? <Check size={20} aria-hidden /> : bloqueado ? <Lock size={16} aria-hidden /> : <Play size={18} aria-hidden />}
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[0.625rem] font-medium text-tinta-3">{i + 1}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-8 text-xs text-tinta-3">
              {atual >= atividades.length
                ? 'Você concluiu todas as atividades desta trilha.'
                : 'Clique na casinha em destaque para fazer a atividade. As seguintes liberam ao concluir a anterior.'}
            </p>
          </>
        )}
      </div>

      {jogando && <AtividadeModal atividade={jogando} aoFechar={() => setJogando(null)} aoConcluir={concluir} />}
    </div>
  )
}

function AtividadeModal({ atividade, aoFechar, aoConcluir }: { atividade: Atividade; aoFechar: () => void; aoConcluir: (a: Atividade, resposta: unknown) => Promise<void> }) {
  const [sel, setSel] = useState<number[]>([])
  const [texto, setTexto] = useState('')
  const [campos, setCampos] = useState<string[]>(atividade.campos.map(() => ''))
  const [pendente, setPendente] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function toggleSel(i: number) { setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i])) }

  function valido(): boolean {
    if (atividade.tipo === 'assinalar') return sel.length > 0
    if (atividade.tipo === 'responder') return texto.trim().length > 0
    if (atividade.tipo === 'listar') return campos.some((c) => c.trim().length > 0)
    return true
  }

  async function enviar() {
    if (!valido()) { setErro('Responda antes de concluir.'); return }
    setPendente(true); setErro(null)
    const resposta =
      atividade.tipo === 'assinalar' ? { opcoes: sel }
        : atividade.tipo === 'responder' ? { texto: texto.trim() }
          : { campos: atividade.campos.map((rot, i) => ({ rotulo: rot, valor: campos[i] ?? '' })) }
    try { await aoConcluir(atividade, resposta) }
    catch { setErro('Não consegui registrar. Tente de novo.'); setPendente(false) }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={aoFechar}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold text-tinta">{atividade.titulo}</p>
        {atividade.enunciado && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-tinta-2">{atividade.enunciado}</p>}
        {atividade.imagem && <img src={atividade.imagem} alt="" className="mt-3 max-h-56 w-full rounded-lg object-cover" />}

        <div className="mt-4 space-y-2">
          {atividade.tipo === 'assinalar' && atividade.opcoes.map((o, i) => (
            <label key={i} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${sel.includes(i) ? 'border-marca bg-marca-clara' : 'border-borda-forte bg-white hover:border-marca'}`}>
              <input type="checkbox" checked={sel.includes(i)} onChange={() => toggleSel(i)} className="h-4 w-4 accent-[var(--color-marca)]" />
              <span className="text-tinta">{o}</span>
            </label>
          ))}
          {atividade.tipo === 'responder' && (
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} placeholder="Escreva a sua resposta…" className="block w-full rounded-lg border border-borda-forte bg-white px-3.5 py-2.5 text-sm text-tinta placeholder:text-tinta-3 focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca" />
          )}
          {atividade.tipo === 'listar' && atividade.campos.map((rot, i) => (
            <label key={i} className="block">
              <span className="mb-1 block text-xs font-medium text-tinta-2">{rot}</span>
              <input value={campos[i] ?? ''} onChange={(e) => setCampos((cs) => cs.map((c, j) => (j === i ? e.target.value : c)))} className="block w-full rounded-lg border border-borda-forte bg-white px-3.5 py-2.5 text-sm text-tinta focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca" />
            </label>
          ))}
        </div>

        {erro && <p className="mt-3 text-sm text-critico">{erro}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={aoFechar} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-superficie-2">Cancelar</button>
          <button type="button" onClick={enviar} disabled={pendente} className="botao-gradiente inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
            {pendente ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Registrando…</> : <><Check size={15} aria-hidden /> Concluir atividade</>}
          </button>
        </div>
      </div>
    </div>
  )
}
