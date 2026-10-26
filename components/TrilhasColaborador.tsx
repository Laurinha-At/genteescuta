'use client'

// =============================================================
// Tela do colaborador: trilhas ativas com progresso, tabuleiro de
// casinhas (progressão sequencial), atividade e saldo de pontos.
// =============================================================
import { useEffect, useMemo, useState } from 'react'
import Link from '@/components/LinkSemPrefetch'
import { Trophy, Lock, Check, X, Play, ArrowLeft, Star, Loader2, PartyPopper, Medal, Link2, FileText, Users, Award } from 'lucide-react'
import { observarLogin } from '@/lib/fb/auth'
import { perfilAtual, type Perfil } from '@/lib/fb/funcionarios'
import { listarPessoasDiretorio, type PessoaDiretorio } from '@/lib/fb/aniversarios'
import { normalizarSetor } from '@/lib/humor'
import { urlParaEmbed } from '@/lib/embed'
import {
  listarTrilhasDevAtivas, listarAtividades, getProgressoUsuario, concluirAtividade,
  listarConquistas,
  type TrilhaDev, type Atividade, type ProgressoUsuario, type Conquista,
} from '@/lib/fb/trilhasDev'

export function TrilhasColaborador() {
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined)
  const [trilhas, setTrilhas] = useState<TrilhaDev[] | null>(null)
  const [progresso, setProgresso] = useState<ProgressoUsuario>({ trilhas: {}, pontos_total: 0 })
  const [conquistas, setConquistas] = useState<Conquista[]>([])
  const [diretorio, setDiretorio] = useState<PessoaDiretorio[]>([])
  const [aberta, setAberta] = useState<TrilhaDev | null>(null)

  useEffect(() => {
    const off = observarLogin(async (u) => {
      if (!u) { setPerfil(null); return }
      const p = await perfilAtual().catch(() => null)
      setPerfil(p)
      const [ts, pr, cq, dir] = await Promise.all([
        listarTrilhasDevAtivas().catch(() => []),
        p ? getProgressoUsuario(p.uid).catch(() => ({ trilhas: {}, pontos_total: 0 })) : Promise.resolve({ trilhas: {}, pontos_total: 0 }),
        listarConquistas().catch(() => []),
        listarPessoasDiretorio().catch(() => []),
      ])
      setTrilhas(ts)
      setProgresso(pr)
      setConquistas(cq)
      setDiretorio(dir)
    })
    return off
  }, [])

  async function recarregarProgresso() {
    if (!perfil) return
    const [pr, cq] = await Promise.all([
      getProgressoUsuario(perfil.uid).catch(() => progresso),
      listarConquistas().catch(() => conquistas),
    ])
    setProgresso(pr)
    setConquistas(cq)
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
          setor={perfil.centro_custo}
          progresso={progresso}
          aoVoltar={() => setAberta(null)}
          aoProgredir={recarregarProgresso}
        />
      ) : (
        <>
          <ListaTrilhas trilhas={trilhas} progresso={progresso} aoAbrir={setAberta} />
          <MuralConquistas conquistas={conquistas} diretorio={diretorio} meuUid={perfil.uid} />
        </>
      )}
    </div>
  )
}

/** Tempo relativo em português: "hoje", "ontem", "há 2 dias", "há 3 semanas". */
function tempoRelativo(ts: number): string {
  const dia = 86400000
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const d = new Date(ts); d.setHours(0, 0, 0, 0)
  const dias = Math.round((hoje.getTime() - d.getTime()) / dia)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 7) return `há ${dias} dias`
  const semanas = Math.floor(dias / 7)
  if (semanas < 5) return semanas === 1 ? 'há 1 semana' : `há ${semanas} semanas`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return meses === 1 ? 'há 1 mês' : `há ${meses} meses`
  const anos = Math.floor(dias / 365)
  return anos === 1 ? 'há 1 ano' : `há ${anos} anos`
}

type ItemMural =
  | { tipo: 'pessoa'; chave: string; nome: string; trilhaTitulo: string; ts: number }
  | { tipo: 'equipe'; chave: string; setor: string; trilhaTitulo: string; ts: number }

/**
 * Conquistas de EQUIPE: quando 100% das pessoas ATIVAS de um setor concluíram a
 * mesma trilha. Usa os nomes de setor canônicos e só celebra (nunca mostra quem
 * falta). Calculado no cliente a partir do diretório + conquistas.
 */
function conquistasDeEquipe(conquistas: Conquista[], diretorio: PessoaDiretorio[]): ItemMural[] {
  // Headcount ativo por setor canônico.
  const totalPorSetor = new Map<string, number>()
  for (const p of diretorio) {
    const setor = normalizarSetor(p.setor)
    if (setor === 'Outros' || setor === 'Não informado') continue
    totalPorSetor.set(setor, (totalPorSetor.get(setor) ?? 0) + 1)
  }
  // Conclusões por (setor canônico, trilha): uids distintos + título + data mais recente.
  const grupos = new Map<string, { setor: string; trilhaTitulo: string; uids: Set<string>; ts: number }>()
  for (const c of conquistas) {
    const setor = normalizarSetor(c.setor)
    if (setor === 'Outros' || setor === 'Não informado') continue
    const chave = `${setor}__${c.trilhaId}`
    const g = grupos.get(chave) ?? { setor, trilhaTitulo: c.trilhaTitulo, uids: new Set<string>(), ts: 0 }
    g.uids.add(c.uid); g.ts = Math.max(g.ts, c.ts); g.trilhaTitulo = c.trilhaTitulo
    grupos.set(chave, g)
  }
  const out: ItemMural[] = []
  for (const [chave, g] of grupos) {
    const total = totalPorSetor.get(g.setor) ?? 0
    if (total > 0 && g.uids.size >= total) {
      out.push({ tipo: 'equipe', chave: `eq_${chave}`, setor: g.setor, trilhaTitulo: g.trilhaTitulo, ts: g.ts })
    }
  }
  return out
}

// Mural de conquistas: celebra conclusões (pessoas e equipes). Sem ranking.
function MuralConquistas({ conquistas, diretorio, meuUid }: { conquistas: Conquista[]; diretorio: PessoaDiretorio[]; meuUid: string }) {
  const itens = useMemo<ItemMural[]>(() => {
    const pessoas: ItemMural[] = conquistas.map((c) => ({ tipo: 'pessoa', chave: c.id, nome: c.nome, trilhaTitulo: c.trilhaTitulo, ts: c.ts }))
    const equipes = conquistasDeEquipe(conquistas, diretorio)
    return [...pessoas, ...equipes].sort((a, b) => b.ts - a.ts).slice(0, 60)
  }, [conquistas, diretorio])

  const meuNome = useMemo(() => conquistas.find((c) => c.uid === meuUid)?.nome ?? '', [conquistas, meuUid])

  return (
    <div className="cartao-g p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-tinta"><Trophy size={18} className="text-marca" aria-hidden /> Mural de conquistas</h2>
      <p className="mt-0.5 text-xs text-tinta-3">Cada trilha concluída vira uma conquista. As mais recentes aparecem primeiro.</p>

      {itens.length === 0 ? (
        <div className="mt-4 rounded-xl bg-superficie-2 px-4 py-6 text-center">
          <Award size={28} className="mx-auto text-marca" aria-hidden />
          <p className="mt-2 text-sm text-tinta-2">Ainda não há conquistas. Conclua uma trilha e comece a celebração!</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {itens.map((it) => {
            const ehEquipe = it.tipo === 'equipe'
            const eu = it.tipo === 'pessoa' && !!meuNome && it.nome === meuNome
            return (
              <li key={it.chave} className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${ehEquipe ? 'border-[#e7cf98] bg-[#fdf6e6]' : eu ? 'border-marca/40 bg-marca-clara' : 'border-borda bg-white'}`}>
                <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${ehEquipe ? 'bg-[#f3e4bb] text-[#8a6d1f]' : 'bg-marca-clara text-marca'}`}>
                  {ehEquipe ? <Users size={18} aria-hidden /> : <Medal size={18} aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  {ehEquipe ? (
                    <p className="text-sm leading-5 text-tinta">
                      <strong className="font-semibold">Equipe {it.setor}</strong> concluiu 100% da trilha <strong className="font-semibold">{it.trilhaTitulo}</strong>. Parabéns!
                    </p>
                  ) : (
                    <p className="text-sm leading-5 text-tinta">
                      <strong className="font-semibold">{it.nome}{eu ? ' (você)' : ''}</strong> concluiu a trilha <strong className="font-semibold">{it.trilhaTitulo}</strong>.
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-tinta-3">{tempoRelativo(it.ts)}</p>
                </div>
                <PartyPopper size={16} className="mt-0.5 flex-none text-marca" aria-hidden />
              </li>
            )
          })}
        </ul>
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

function Tabuleiro({ trilha, uid, nome, setor, progresso, aoVoltar, aoProgredir }: { trilha: TrilhaDev; uid: string; nome: string; setor?: string; progresso: ProgressoUsuario; aoVoltar: () => void; aoProgredir: () => Promise<void> }) {
  const [atividades, setAtividades] = useState<Atividade[] | null>(null)
  const [jogando, setJogando] = useState<Atividade | null>(null)
  const [festa, setFesta] = useState<number | null>(null)

  useEffect(() => { listarAtividades(trilha.id).then(setAtividades).catch(() => setAtividades([])) }, [trilha.id])

  const pr = progresso.trilhas[trilha.id]
  const feitas = pr?.concluidas ?? []
  const atual = feitas.length // índice da próxima atividade a fazer

  async function concluir(a: Atividade, resposta: unknown) {
    const total = atividades?.length ?? 0
    const r = await concluirAtividade(uid, { id: trilha.id, pontos: trilha.pontos, titulo: trilha.titulo }, a.id, total, resposta, { nome, setor })
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
  if (atividade.tipo === 'caca') return <CacaModal atividade={atividade} aoFechar={aoFechar} aoConcluir={aoConcluir} />

  return <RespostaModal atividade={atividade} aoFechar={aoFechar} aoConcluir={aoConcluir} />
}

// Caça-palavras: clicar na primeira e na última letra; conclui quando acha todas.
function CacaModal({ atividade, aoFechar, aoConcluir }: { atividade: Atividade; aoFechar: () => void; aoConcluir: (a: Atividade, resposta: unknown) => Promise<void> }) {
  const cols = atividade.cacaCols || (atividade.cacaGrade[0]?.length ?? 0)
  const grid = useMemo(() => atividade.cacaGrade.map((r) => r.split('')), [atividade])
  const palavras = atividade.cacaPalavras
  const posicoes = atividade.cacaPos || {}
  const [inicio, setInicio] = useState<[number, number] | null>(null)
  const [achadas, setAchadas] = useState<Set<string>>(new Set())
  const [pendente, setPendente] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const destaque = useMemo(() => {
    const s = new Set<number>()
    for (const w of achadas) (posicoes[w] || []).forEach((idx) => s.add(idx))
    return s
  }, [achadas, posicoes])

  function linhaEntre(a: [number, number], b: [number, number]): number[] | null {
    const [r0, c0] = a, [r1, c1] = b
    const dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0)
    const compR = Math.abs(r1 - r0), compC = Math.abs(c1 - c0)
    if (!(r0 === r1 || c0 === c1 || compR === compC)) return null
    const n = Math.max(compR, compC) + 1
    const out: number[] = []
    for (let k = 0; k < n; k++) out.push((r0 + dr * k) * cols + (c0 + dc * k))
    return out
  }

  async function finalizar(nova: Set<string>) {
    setPendente(true); setErro(null)
    try { await aoConcluir(atividade, { caca: true, achadas: Array.from(nova) }) }
    catch { setErro('Não consegui registrar. Tente de novo.'); setPendente(false) }
  }

  function clicar(r: number, c: number) {
    if (pendente) return
    if (!inicio) { setInicio([r, c]); return }
    const linha = linhaEntre(inicio, [r, c]); setInicio(null)
    if (!linha) return
    const alvo = new Set(linha)
    for (const w of palavras) {
      if (achadas.has(w)) continue
      const cel = posicoes[w] || []
      if (cel.length === alvo.size && cel.every((x) => alvo.has(x))) {
        const nova = new Set(achadas); nova.add(w); setAchadas(nova)
        if (nova.size === palavras.length) finalizar(nova)
        return
      }
    }
  }

  const semTabuleiro = grid.length === 0 || cols === 0 || palavras.length === 0

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={aoFechar}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold text-tinta">{atividade.titulo}</p>
        {atividade.enunciado && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-tinta-2">{atividade.enunciado}</p>}
        <div className="mt-3"><MateriaisApoio a={atividade} /></div>

        {semTabuleiro ? (
          <p className="mt-4 rounded-lg bg-superficie-2 px-3 py-2 text-sm text-tinta-3">Este caça-palavras ainda não foi configurado.</p>
        ) : (
          <>
            <p className="mb-2 mt-4 text-xs text-tinta-3">Clique na <strong className="font-semibold text-tinta-2">primeira</strong> e depois na <strong className="font-semibold text-tinta-2">última</strong> letra de cada palavra.</p>
            <div className="overflow-x-auto">
              <div className="mx-auto grid w-max select-none gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {grid.flatMap((linha, r) => linha.map((letra, c) => {
                  const idx = r * cols + c
                  const marcada = destaque.has(idx)
                  const ini = inicio && inicio[0] === r && inicio[1] === c
                  return (
                    <button key={idx} type="button" onClick={() => clicar(r, c)}
                      className={`flex h-7 w-7 items-center justify-center rounded text-[0.7rem] font-semibold transition-colors sm:h-8 sm:w-8 sm:text-xs ${
                        marcada ? 'bg-[#16A34A] text-white' : ini ? 'bg-marca text-white' : 'bg-superficie-2 text-tinta-2 hover:bg-marca-clara'
                      }`}>
                      {letra}
                    </button>
                  )
                }))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {palavras.map((w) => {
                const ok = achadas.has(w)
                return <span key={w} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ok ? 'bg-[#eff8ef] text-[#0b5d0b] line-through' : 'bg-superficie-2 text-tinta-2'}`}>{ok && '✓ '}{w}</span>
              })}
            </div>
            <p className="mt-3 text-sm text-tinta-3">{achadas.size} de {palavras.length} encontradas.</p>
          </>
        )}

        {erro && <p className="mt-3 text-sm text-critico">{erro}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={aoFechar} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-superficie-2">Fechar</button>
        </div>
      </div>
    </div>
  )
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
        <div className="mt-3"><MateriaisApoio a={atividade} /></div>

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

// Materiais de apoio (valem para qualquer atividade): imagem, vídeo, link, documento.
function MateriaisApoio({ a }: { a: Atividade }) {
  const embed = urlParaEmbed(a.video)
  if (!a.imagem && !a.video && !a.link && !a.arquivo) return null
  const botao = 'flex items-center gap-2 rounded-lg border border-borda-forte bg-white px-3.5 py-2.5 text-sm font-medium text-marca-texto transition-colors hover:border-marca hover:bg-marca-clara'
  return (
    <div className="space-y-2">
      {a.imagem && <img src={a.imagem} alt="" className="max-h-56 w-full rounded-lg object-cover" />}
      {a.video && (embed
        ? <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: '16 / 9' }}>
            <iframe src={embed} title="Vídeo de apoio" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0 h-full w-full" />
          </div>
        : <a href={a.video} target="_blank" rel="noopener noreferrer" className={botao}><Play size={16} aria-hidden /> Abrir o vídeo</a>)}
      {a.link && <a href={a.link} target="_blank" rel="noopener noreferrer" className={botao}><Link2 size={16} aria-hidden /> Abrir o link</a>}
      {a.arquivo && <a href={a.arquivo} download={a.arquivoNome || 'material'} target="_blank" rel="noopener noreferrer" className={botao}><FileText size={16} aria-hidden /> {a.arquivoNome || 'Abrir o documento'}</a>}
    </div>
  )
}

// Atividades que só coletam a resposta (sem correção) ou só mostram material.
function RespostaModal({ atividade, aoFechar, aoConcluir }: { atividade: Atividade; aoFechar: () => void; aoConcluir: (a: Atividade, resposta: unknown) => Promise<void> }) {
  const [uma, setUma] = useState(-1) // múltipla escolha / lista suspensa
  const [sel, setSel] = useState<number[]>([]) // caixas / assinalar (legado)
  const [texto, setTexto] = useState('')
  const [campos, setCampos] = useState<string[]>(atividade.campos.map(() => ''))
  const [pendente, setPendente] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const t = atividade.tipo
  function toggleSel(i: number) { setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i])) }

  function valido(): boolean {
    if (t === 'multipla_uma' || t === 'suspensa') return uma >= 0
    if (t === 'caixas' || t === 'assinalar') return sel.length > 0
    if (t === 'curta' || t === 'paragrafo' || t === 'responder') return texto.trim().length > 0
    if (t === 'listar') return campos.some((c) => c.trim().length > 0)
    return true // material
  }

  async function enviar() {
    if (!valido()) { setErro('Responda antes de concluir.'); return }
    setPendente(true); setErro(null)
    const resposta =
      t === 'multipla_uma' || t === 'suspensa' ? { opcao: uma }
        : t === 'caixas' || t === 'assinalar' ? { opcoes: sel }
          : t === 'curta' || t === 'paragrafo' || t === 'responder' ? { texto: texto.trim() }
            : t === 'listar' ? { campos: atividade.campos.map((rot, i) => ({ rotulo: rot, valor: campos[i] ?? '' })) }
              : { lido: true }
    try { await aoConcluir(atividade, resposta) }
    catch { setErro('Não consegui registrar. Tente de novo.'); setPendente(false) }
  }

  const inputTexto = 'block w-full rounded-lg border border-borda-forte bg-white px-3.5 py-2.5 text-sm text-tinta placeholder:text-tinta-3 focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={aoFechar}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold text-tinta">{atividade.titulo}</p>
        {atividade.enunciado && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-tinta-2">{atividade.enunciado}</p>}
        <div className="mt-3"><MateriaisApoio a={atividade} /></div>

        <div className="mt-4 space-y-2">
          {(t === 'multipla_uma') && atividade.opcoes.map((o, i) => (
            <label key={i} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${uma === i ? 'border-marca bg-marca-clara' : 'border-borda-forte bg-white hover:border-marca'}`}>
              <input type="radio" name="opcao" checked={uma === i} onChange={() => setUma(i)} className="h-4 w-4 accent-[var(--color-marca)]" />
              <span className="text-tinta">{o}</span>
            </label>
          ))}
          {t === 'suspensa' && (
            <select value={uma} onChange={(e) => setUma(Number(e.target.value))} className={inputTexto}>
              <option value={-1} disabled>Selecione…</option>
              {atividade.opcoes.map((o, i) => <option key={i} value={i}>{o}</option>)}
            </select>
          )}
          {(t === 'caixas' || t === 'assinalar') && atividade.opcoes.map((o, i) => (
            <label key={i} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${sel.includes(i) ? 'border-marca bg-marca-clara' : 'border-borda-forte bg-white hover:border-marca'}`}>
              <input type="checkbox" checked={sel.includes(i)} onChange={() => toggleSel(i)} className="h-4 w-4 accent-[var(--color-marca)]" />
              <span className="text-tinta">{o}</span>
            </label>
          ))}
          {t === 'curta' && <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Sua resposta…" className={inputTexto} />}
          {(t === 'paragrafo' || t === 'responder') && <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} placeholder="Escreva a sua resposta…" className={inputTexto} />}
          {t === 'listar' && atividade.campos.map((rot, i) => (
            <label key={i} className="block">
              <span className="mb-1 block text-xs font-medium text-tinta-2">{rot}</span>
              <input value={campos[i] ?? ''} onChange={(e) => setCampos((cs) => cs.map((c, j) => (j === i ? e.target.value : c)))} className={inputTexto} />
            </label>
          ))}
          {t === 'material' && !atividade.imagem && !atividade.video && !atividade.link && !atividade.arquivo && (
            <p className="rounded-lg bg-superficie-2 px-3 py-2 text-sm text-tinta-3">Leia o conteúdo acima e marque como lido.</p>
          )}
        </div>

        {erro && <p className="mt-3 text-sm text-critico">{erro}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={aoFechar} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-superficie-2">Cancelar</button>
          <button type="button" onClick={enviar} disabled={pendente} className="botao-gradiente inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
            {pendente ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Registrando…</> : <><Check size={15} aria-hidden /> {t === 'material' ? 'Marcar como lido' : 'Concluir atividade'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
