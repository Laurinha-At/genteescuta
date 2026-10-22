'use client'

// =============================================================
// Tela do colaborador: trilhas ativas com progresso, tabuleiro de
// casinhas (progressão sequencial), atividade e saldo de pontos.
// =============================================================
import { useEffect, useState } from 'react'
import Link from '@/components/LinkSemPrefetch'
import { Trophy, Lock, Check, X, Play, ArrowLeft, Star, Loader2, PartyPopper, Medal } from 'lucide-react'
import { observarLogin } from '@/lib/fb/auth'
import { perfilAtual, type Perfil } from '@/lib/fb/funcionarios'
import {
  listarTrilhasDevAtivas, listarAtividades, getProgressoUsuario, concluirAtividade,
  listarRankingTrilhas,
  type TrilhaDev, type Atividade, type ProgressoUsuario, type RankingItem,
} from '@/lib/fb/trilhasDev'

export function TrilhasColaborador() {
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined)
  const [trilhas, setTrilhas] = useState<TrilhaDev[] | null>(null)
  const [progresso, setProgresso] = useState<ProgressoUsuario>({ trilhas: {}, pontos_total: 0 })
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [aberta, setAberta] = useState<TrilhaDev | null>(null)

  useEffect(() => {
    const off = observarLogin(async (u) => {
      if (!u) { setPerfil(null); return }
      const p = await perfilAtual().catch(() => null)
      setPerfil(p)
      const [ts, pr, rk] = await Promise.all([
        listarTrilhasDevAtivas().catch(() => []),
        p ? getProgressoUsuario(p.uid).catch(() => ({ trilhas: {}, pontos_total: 0 })) : Promise.resolve({ trilhas: {}, pontos_total: 0 }),
        listarRankingTrilhas().catch(() => []),
      ])
      setTrilhas(ts)
      setProgresso(pr)
      setRanking(rk)
    })
    return off
  }, [])

  async function recarregarProgresso() {
    if (!perfil) return
    const [pr, rk] = await Promise.all([
      getProgressoUsuario(perfil.uid).catch(() => progresso),
      listarRankingTrilhas().catch(() => ranking),
    ])
    setProgresso(pr)
    setRanking(rk)
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
          nome={perfil.nome}
          progresso={progresso}
          aoVoltar={() => setAberta(null)}
          aoProgredir={recarregarProgresso}
        />
      ) : (
        <>
          <ListaTrilhas trilhas={trilhas} progresso={progresso} aoAbrir={setAberta} />
          <Ranking itens={ranking} meuUid={perfil.uid} />
        </>
      )}
    </div>
  )
}

// Ranking: top por pontos, destaque do usuário logado e medalha no top 3.
function Ranking({ itens, meuUid }: { itens: RankingItem[]; meuUid: string }) {
  if (itens.length === 0) return null
  const CORES = ['#d4af37', '#9aa3ad', '#b87333'] // ouro, prata, bronze
  return (
    <div className="cartao-g p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-tinta"><Trophy size={18} className="text-marca" aria-hidden /> Ranking</h2>
      <p className="mt-0.5 text-xs text-tinta-3">Soma dos pontos de todas as trilhas concluídas.</p>
      <ol className="mt-3 space-y-1.5">
        {itens.map((r, i) => {
          const eu = r.uid === meuUid
          return (
            <li key={r.uid} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${eu ? 'bg-marca-clara' : 'bg-superficie-2'}`}>
              <span className="flex h-6 w-6 flex-none items-center justify-center">
                {i < 3
                  ? <Medal size={18} aria-hidden style={{ color: CORES[i] }} />
                  : <span className="text-xs font-semibold text-tinta-3 tabular">{i + 1}</span>}
              </span>
              <span className={`min-w-0 flex-1 truncate text-sm ${eu ? 'font-semibold text-tinta' : 'text-tinta-2'}`}>{r.nome}{eu ? ' (você)' : ''}</span>
              <span className="inline-flex flex-none items-center gap-1 text-sm font-semibold text-marca-texto tabular"><Star size={12} className="fill-current" aria-hidden /> {r.pontos}</span>
            </li>
          )
        })}
      </ol>
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

function Tabuleiro({ trilha, uid, nome, progresso, aoVoltar, aoProgredir }: { trilha: TrilhaDev; uid: string; nome: string; progresso: ProgressoUsuario; aoVoltar: () => void; aoProgredir: () => Promise<void> }) {
  const [atividades, setAtividades] = useState<Atividade[] | null>(null)
  const [jogando, setJogando] = useState<Atividade | null>(null)
  const [festa, setFesta] = useState<number | null>(null)

  useEffect(() => { listarAtividades(trilha.id).then(setAtividades).catch(() => setAtividades([])) }, [trilha.id])

  const pr = progresso.trilhas[trilha.id]
  const feitas = pr?.concluidas ?? []
  const atual = feitas.length // índice da próxima atividade a fazer

  async function concluir(a: Atividade, resposta: unknown) {
    const total = atividades?.length ?? 0
    const r = await concluirAtividade(uid, { id: trilha.id, pontos: trilha.pontos }, a.id, total, resposta, { nome })
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
  if (atividade.tipo === 'quiz') return <QuizModal atividade={atividade} aoFechar={aoFechar} aoConcluir={aoConcluir} />

  return <RespostaModal atividade={atividade} aoFechar={aoFechar} aoConcluir={aoConcluir} />
}

// Quiz: responde, corrige, mostra explicação e só conclui se atingir a nota mínima.
function QuizModal({ atividade, aoFechar, aoConcluir }: { atividade: Atividade; aoFechar: () => void; aoConcluir: (a: Atividade, resposta: unknown) => Promise<void> }) {
  const perguntas = atividade.perguntas ?? []
  const [sel, setSel] = useState<number[]>(perguntas.map(() => -1))
  const [verificado, setVerificado] = useState(false)
  const [pendente, setPendente] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const minimo = atividade.notaMinima > 0 ? Math.min(atividade.notaMinima, perguntas.length) : perguntas.length
  const acertos = sel.reduce((n, s, i) => n + (s === perguntas[i]?.correta ? 1 : 0), 0)
  const passou = acertos >= minimo
  const respondeuTudo = sel.every((s) => s >= 0)

  function escolher(qi: number, oi: number) {
    if (verificado) return
    setSel((s) => s.map((x, j) => (j === qi ? oi : x)))
  }

  function verificar() {
    if (!respondeuTudo) { setErro('Responda todas as perguntas.'); return }
    setErro(null); setVerificado(true)
  }
  function tentarDeNovo() { setVerificado(false); setErro(null) }

  async function concluir() {
    setPendente(true); setErro(null)
    try { await aoConcluir(atividade, { quiz: sel, acertos, total: perguntas.length }) }
    catch { setErro('Não consegui registrar. Tente de novo.'); setPendente(false) }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={aoFechar}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold text-tinta">{atividade.titulo}</p>
        {atividade.enunciado && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-tinta-2">{atividade.enunciado}</p>}
        <p className="mt-1 text-xs text-tinta-3">{perguntas.length} pergunta(s) · nota mínima {minimo} de {perguntas.length}</p>

        <div className="mt-4 space-y-4">
          {perguntas.map((p, qi) => (
            <div key={qi}>
              <p className="text-sm font-medium text-tinta">{qi + 1}. {p.texto}</p>
              {p.imagem && <img src={p.imagem} alt="" className="mt-2 max-h-48 w-full rounded-lg object-cover" />}
              <div className="mt-2 space-y-1.5">
                {p.opcoes.map((o, oi) => {
                  const escolhida = sel[qi] === oi
                  const correta = p.correta === oi
                  let cls = escolhida ? 'border-marca bg-marca-clara' : 'border-borda-forte bg-white hover:border-marca'
                  if (verificado) {
                    if (correta) cls = 'border-[#16A34A] bg-[#eff8ef]'
                    else if (escolhida) cls = 'border-critico bg-[#fdeaea]'
                    else cls = 'border-borda-forte bg-white'
                  }
                  return (
                    <label key={oi} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${verificado ? 'cursor-default' : 'cursor-pointer'} ${cls}`}>
                      <input type="radio" name={`q${qi}`} checked={escolhida} onChange={() => escolher(qi, oi)} disabled={verificado} className="h-4 w-4 accent-[var(--color-marca)]" />
                      <span className="flex-1 text-tinta">{o}</span>
                      {verificado && correta && <Check size={15} className="text-[#16A34A]" aria-hidden />}
                      {verificado && escolhida && !correta && <X size={15} className="text-critico" aria-hidden />}
                    </label>
                  )
                })}
              </div>
              {verificado && p.explicacao && (
                <p className="mt-1.5 rounded-lg bg-superficie-2 px-3 py-2 text-xs leading-5 text-tinta-2">{p.explicacao}</p>
              )}
            </div>
          ))}
        </div>

        {verificado && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm font-semibold ${passou ? 'bg-[#eff8ef] text-[#0b5d0b]' : 'bg-[#fdeaea] text-[#8a1f1f]'}`}>
            {passou ? `Você acertou ${acertos} de ${perguntas.length}. Aprovado!` : `Você acertou ${acertos} de ${perguntas.length}. Precisa de ${minimo}. Revise e tente de novo.`}
          </div>
        )}
        {erro && <p className="mt-3 text-sm text-critico">{erro}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={aoFechar} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-superficie-2">Cancelar</button>
          {!verificado ? (
            <button type="button" onClick={verificar} className="botao-gradiente inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold"><Check size={15} aria-hidden /> Verificar respostas</button>
          ) : passou ? (
            <button type="button" onClick={concluir} disabled={pendente} className="botao-gradiente inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
              {pendente ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Registrando…</> : <><Check size={15} aria-hidden /> Concluir atividade</>}
            </button>
          ) : (
            <button type="button" onClick={tentarDeNovo} className="botao-gradiente inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold">Tentar de novo</button>
          )}
        </div>
      </div>
    </div>
  )
}

// Atividades sem correção (assinalar, responder, listar): só registra a resposta.
function RespostaModal({ atividade, aoFechar, aoConcluir }: { atividade: Atividade; aoFechar: () => void; aoConcluir: (a: Atividade, resposta: unknown) => Promise<void> }) {
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
