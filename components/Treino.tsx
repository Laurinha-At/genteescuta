'use client'

// =============================================================
// App de Treinamento e Desenvolvimento — hub de trilhas + player.
// Conteúdo estático (lib/treinamentos.ts); progresso por usuário no
// Firestore. Identidade Soulan (azul/verde). O funcionário Comum vê
// e faz; correção de quiz/caça-palavras acontece no cliente (interno).
// =============================================================
import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  GraduationCap, Clock, Lock, CheckCircle2, ArrowLeft, ArrowRight,
  Trophy, Star, BookOpen, HelpCircle, Grid2x2, PartyPopper, LogIn, ExternalLink, Video,
} from 'lucide-react'
import { pontosPossiveis, type Trilha, type Etapa } from '@/lib/treinamentos'
import { aplicarConclusaoEtapa, salvarProgresso, type ProgressoTreino } from '@/lib/fb/treino'
import type { Perfil } from '@/lib/fb/funcionarios'
import { BotaoVoltar } from '@/components/BotaoVoltar'

type Filtro = 'todas' | 'obrigatorio' | 'sugerido' | 'concluidas'

export function TrilhasApp({
  perfil,
  progInicial,
  trilhas,
}: {
  perfil: Perfil | null
  progInicial: ProgressoTreino
  trilhas: Trilha[]
}) {
  const [prog, setProg] = useState<ProgressoTreino>(progInicial)
  const [aberta, setAberta] = useState<Trilha | null>(null)
  const logado = !!perfil && (perfil.tipo === 'admin' || perfil.tipo === 'funcionario')

  // Persiste no Firestore quando logado; sempre atualiza a tela.
  async function registrar(novo: ProgressoTreino) {
    setProg(novo)
    if (logado) await salvarProgresso(novo).catch(() => {})
  }

  if (aberta) {
    return (
      <PlayerTrilha
        trilha={aberta}
        prog={prog}
        logado={logado}
        aoVoltar={() => setAberta(null)}
        aoConcluirEtapa={(e) => {
          const novo = aplicarConclusaoEtapa(prog, e.id, e.pts, aberta.id, aberta.acts.map((a) => a.id))
          return registrar(novo)
        }}
      />
    )
  }

  return <Hub perfil={perfil} logado={logado} prog={prog} aoAbrir={setAberta} trilhas={trilhas} />
}

// -------------------------------------------------------------
// HUB — lista de trilhas
// -------------------------------------------------------------
function pctTrilha(t: Trilha, prog: ProgressoTreino): number {
  const total = t.acts.length || 1
  const feitas = t.acts.filter((a) => prog.etapas[a.id]).length
  return Math.round((feitas / total) * 100)
}

function Hub({
  perfil, logado, prog, aoAbrir, trilhas: todasTrilhas,
}: {
  perfil: Perfil | null
  logado: boolean
  prog: ProgressoTreino
  aoAbrir: (t: Trilha) => void
  trilhas: Trilha[]
}) {
  const [filtro, setFiltro] = useState<Filtro>('todas')

  const trilhas = useMemo(() => {
    return todasTrilhas.filter((t) => {
      if (filtro === 'todas') return true
      if (filtro === 'concluidas') return !!prog.trilhas[t.id]
      return t.tag === filtro
    })
  }, [filtro, prog, todasTrilhas])

  const concluidas = todasTrilhas.filter((t) => prog.trilhas[t.id]).length

  const FILTROS: { id: Filtro; rotulo: string }[] = [
    { id: 'todas', rotulo: 'Todas' },
    { id: 'obrigatorio', rotulo: 'Obrigatórias' },
    { id: 'sugerido', rotulo: 'Sugeridas' },
    { id: 'concluidas', rotulo: 'Concluídas' },
  ]

  return (
    <>
      <BotaoVoltar />

      <div className="mt-6 flex items-start gap-3">
        <span className="mt-1 flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-marca-clara text-marca">
          <GraduationCap size={22} aria-hidden />
        </span>
        <div>
          <h1 className="titulo-hero text-[1.875rem] text-tinta">Treinamento e Desenvolvimento</h1>
          <p className="mt-2 max-w-xl text-[0.9688rem] leading-7 text-tinta-2">
            Trilhas de aprendizagem do time Soulan. Leia, responda os desafios e conquiste cada trilha
            no seu ritmo — o seu progresso fica salvo.
          </p>
        </div>
      </div>

      {/* Faixa de progresso pessoal (logado) ou convite a entrar */}
      {logado ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <ResumoCard icone={<Trophy size={18} aria-hidden />} valor={`${concluidas}/${todasTrilhas.length}`} rotulo="Trilhas concluídas" />
          <ResumoCard icone={<Star size={18} aria-hidden />} valor={String(prog.pontos)} rotulo="Pontos conquistados" />
          <ResumoCard icone={<BookOpen size={18} aria-hidden />} valor={String(Object.values(prog.etapas).filter(Boolean).length)} rotulo="Etapas feitas" />
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#cfe0e8] bg-marca-clara px-4 py-3">
          <p className="text-sm text-marca-escura">
            <strong className="font-semibold">Entre como funcionário</strong> para registrar seu progresso e conquistar as trilhas.
          </p>
          <Link href="/entrar" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-marca-escura ring-1 ring-inset ring-[#cfe0e8] transition-colors hover:ring-marca">
            <LogIn size={15} aria-hidden /> Entrar
          </Link>
        </div>
      )}

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filtro === f.id
                ? 'bg-marca text-white'
                : 'border border-borda-forte bg-white text-tinta-2 hover:border-marca hover:text-marca-texto'
            }`}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      {/* Grade de trilhas */}
      {trilhas.length === 0 ? (
        <p className="mt-8 text-sm text-tinta-3">Nenhuma trilha nesse filtro por enquanto.</p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {trilhas.map((t) => (
            <CardTrilha key={t.id} trilha={t} prog={prog} aoAbrir={() => aoAbrir(t)} />
          ))}
        </div>
      )}
    </>
  )
}

function ResumoCard({ icone, valor, rotulo }: { icone: React.ReactNode; valor: string; rotulo: string }) {
  return (
    <div className="cartao-g flex items-center gap-3 px-4 py-3">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-marca-clara text-marca">{icone}</span>
      <span className="leading-tight">
        <span className="block text-xl font-semibold text-tinta">{valor}</span>
        <span className="block text-xs text-tinta-3">{rotulo}</span>
      </span>
    </div>
  )
}

function CardTrilha({ trilha, prog, aoAbrir }: { trilha: Trilha; prog: ProgressoTreino; aoAbrir: () => void }) {
  const pct = pctTrilha(trilha, prog)
  const concluida = !!prog.trilhas[trilha.id]
  const iniciada = pct > 0
  const obrig = trilha.tag === 'obrigatorio'

  return (
    <button
      type="button"
      onClick={aoAbrir}
      className="cartao-g group overflow-hidden p-0 text-left transition-shadow hover:shadow-[0_6px_24px_-12px_rgba(31,92,115,0.35)]"
    >
      {/* Capa: imagem enviada ou faixa com o ícone no degradê da marca */}
      <div className="relative h-28 w-full overflow-hidden">
        {trilha.capa ? (
          <img src={trilha.capa} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="banner-trilha grid h-full w-full place-items-center text-4xl" aria-hidden>{trilha.icon}</div>
        )}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${
          obrig ? 'bg-white/95 text-critico' : 'bg-white/95 text-marca-texto'
        }`}>
          {obrig ? 'Obrigatória' : 'Sugerida'}
        </span>
        {concluida && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-verde-marca px-2.5 py-1 text-[0.6875rem] font-semibold text-verde-escuro">
            <CheckCircle2 size={12} aria-hidden /> Concluída
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start gap-2">
          <span className="text-xl leading-none" aria-hidden>{trilha.icon}</span>
          <h3 className="text-[1.0625rem] font-[620] leading-snug text-tinta">{trilha.title}</h3>
        </div>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-tinta-2">{trilha.desc}</p>

        <div className="mt-3 flex items-center gap-3 text-xs text-tinta-3">
          <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden /> {trilha.mins} min</span>
          <span className="inline-flex items-center gap-1"><BookOpen size={13} aria-hidden /> {trilha.acts.length} etapas</span>
          <span className="inline-flex items-center gap-1"><Star size={13} aria-hidden /> {pontosPossiveis(trilha)} pts</span>
        </div>

        {/* Barra de progresso */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-superficie-2">
          <div className="h-full rounded-full bg-verde-marca transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-marca-texto">
          {concluida ? 'Revisar' : iniciada ? 'Continuar' : 'Começar'}
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>
      </div>
    </button>
  )
}

// -------------------------------------------------------------
// PLAYER — trilha aberta, etapas em sequência
// -------------------------------------------------------------
function PlayerTrilha({
  trilha, prog, logado, aoVoltar, aoConcluirEtapa,
}: {
  trilha: Trilha
  prog: ProgressoTreino
  logado: boolean
  aoVoltar: () => void
  aoConcluirEtapa: (e: Etapa) => Promise<void> | void
}) {
  // Primeira etapa ainda não concluída fica "ativa"; anteriores liberadas.
  const primeiraPendente = trilha.acts.findIndex((a) => !prog.etapas[a.id])
  const [ativa, setAtiva] = useState<number>(primeiraPendente === -1 ? trilha.acts.length - 1 : primeiraPendente)

  const feitas = trilha.acts.filter((a) => prog.etapas[a.id]).length
  const pct = Math.round((feitas / (trilha.acts.length || 1)) * 100)
  const concluida = !!prog.trilhas[trilha.id]

  function desbloqueada(i: number) {
    if (i === 0) return true
    return trilha.acts.slice(0, i).every((a) => prog.etapas[a.id])
  }

  return (
    <>
      <button type="button" onClick={aoVoltar} className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-3 transition-colors hover:text-marca">
        <ArrowLeft size={15} aria-hidden /> Todas as trilhas
      </button>

      {/* Cabeçalho da trilha */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-borda">
        <div className="banner-trilha flex items-center gap-3 px-5 py-5 text-white">
          <span className="text-3xl" aria-hidden>{trilha.icon}</span>
          <div>
            <h1 className="text-xl font-[680] leading-tight">{trilha.title}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/90">{trilha.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white px-5 py-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-superficie-2">
            <div className="h-full rounded-full bg-verde-marca transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-semibold text-tinta-2">{feitas}/{trilha.acts.length}</span>
        </div>
      </div>

      {concluida && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#cbe6a8] bg-[#f2f9e8] px-4 py-3 text-sm text-verde-escuro">
          <PartyPopper size={18} aria-hidden />
          <span><strong className="font-semibold">Trilha concluída!</strong> Você conquistou o troféu desta trilha. 🏆</span>
        </div>
      )}

      {/* Etapas */}
      <ol className="mt-5 space-y-2.5">
        {trilha.acts.map((etapa, i) => {
          const feita = !!prog.etapas[etapa.id]
          const livre = desbloqueada(i)
          const aberta = ativa === i && livre

          return (
            <li key={etapa.id} className={`cartao-g overflow-hidden ${!livre ? 'opacity-60' : ''}`}>
              <button
                type="button"
                disabled={!livre}
                onClick={() => setAtiva(aberta ? -1 : i)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-not-allowed"
              >
                <StatusEtapa feita={feita} livre={livre} tipo={etapa.type} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-[600] text-tinta">{etapa.title}</span>
                  <span className="block text-xs text-tinta-3">{rotuloTipo(etapa.type)} · {etapa.pts} pontos</span>
                </span>
                {!livre && <Lock size={15} className="text-tinta-3" aria-hidden />}
                {feita && livre && <CheckCircle2 size={18} className="text-bom" aria-hidden />}
              </button>

              {aberta && (
                <div className="border-t border-borda px-4 py-4 sm:px-5">
                  <CorpoEtapa
                    etapa={etapa}
                    feita={feita}
                    logado={logado}
                    aoConcluir={async () => {
                      await aoConcluirEtapa(etapa)
                      // avança para a próxima etapa (se houver)
                      if (i < trilha.acts.length - 1) setAtiva(i + 1)
                    }}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </>
  )
}

function StatusEtapa({ feita, livre, tipo }: { feita: boolean; livre: boolean; tipo: Etapa['type'] }) {
  const Icone = tipo === 'quiz' ? HelpCircle : tipo === 'caca' ? Grid2x2 : tipo === 'material' ? Video : BookOpen
  return (
    <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${
      feita ? 'bg-[#eef7e3] text-verde-escuro' : livre ? 'bg-marca-clara text-marca' : 'bg-superficie-2 text-tinta-3'
    }`}>
      <Icone size={17} aria-hidden />
    </span>
  )
}

function rotuloTipo(t: Etapa['type']) {
  return t === 'quiz' ? 'Quiz' : t === 'caca' ? 'Caça-palavras' : t === 'material' ? 'Material' : 'Leitura'
}

// -------------------------------------------------------------
// Corpo de cada tipo de etapa
// -------------------------------------------------------------
function CorpoEtapa({
  etapa, feita, logado, aoConcluir,
}: {
  etapa: Etapa
  feita: boolean
  logado: boolean
  aoConcluir: () => Promise<void> | void
}) {
  if (etapa.type === 'texto') return <EtapaTextoView etapa={etapa} feita={feita} logado={logado} aoConcluir={aoConcluir} />
  if (etapa.type === 'quiz') return <EtapaQuizView etapa={etapa} feita={feita} logado={logado} aoConcluir={aoConcluir} />
  if (etapa.type === 'material') return <EtapaMaterialView etapa={etapa} feita={feita} logado={logado} aoConcluir={aoConcluir} />
  return <EtapaCacaView etapa={etapa} feita={feita} logado={logado} aoConcluir={aoConcluir} />
}

/** Converte link de YouTube/Drive em URL de embed. */
function urlEmbed(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) { const v = u.searchParams.get('v'); if (v) return `https://www.youtube.com/embed/${v}` }
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`
    if (u.hostname.includes('drive.google.com')) { const m = u.pathname.match(/\/file\/d\/([^/]+)/); if (m) return `https://drive.google.com/file/d/${m[1]}/preview` }
    return url
  } catch { return url }
}
const ehEmbed = (url: string) => /youtube\.com|youtu\.be|drive\.google\.com/.test(url)

function EtapaMaterialView({ etapa, feita, logado, aoConcluir }: any) {
  const video = etapa.midia === 'video'
  return (
    <div>
      {etapa.content && <Paragrafos texto={etapa.content} />}
      {etapa.url && (
        video && ehEmbed(etapa.url) ? (
          <div className="mt-3 aspect-video overflow-hidden rounded-xl border border-borda bg-black">
            <iframe src={urlEmbed(etapa.url)} title={etapa.title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        ) : (
          <a href={etapa.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3.5 py-2 text-sm font-semibold text-marca-texto transition-colors hover:border-marca">
            {video ? <Video size={15} aria-hidden /> : <ExternalLink size={15} aria-hidden />} {video ? 'Abrir vídeo' : 'Abrir material'}
          </a>
        )
      )}
      <BotaoConcluir feita={feita} logado={logado} rotulo="Concluir e avançar" onClick={aoConcluir} />
    </div>
  )
}

/** Renderiza texto com parágrafos (\n\n) e quebras simples (\n). */
function Paragrafos({ texto }: { texto: string }) {
  const blocos = texto.split(/\n\n+/)
  return (
    <div className="space-y-3 text-[0.9375rem] leading-7 text-tinta-2">
      {blocos.map((b, i) => (
        <p key={i} className="whitespace-pre-line">{b}</p>
      ))}
    </div>
  )
}

function AvisoLogin() {
  return (
    <p className="mt-3 text-xs text-tinta-3">
      <Link href="/entrar" className="font-semibold text-marca-texto hover:underline">Entre como funcionário</Link> para
      salvar seu progresso.
    </p>
  )
}

function BotaoConcluir({ feita, logado, rotulo, onClick, disabled }: {
  feita: boolean; logado: boolean; rotulo: string; onClick: () => void; disabled?: boolean
}) {
  const [enviando, setEnviando] = useState(false)
  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={disabled || enviando}
        onClick={async () => { setEnviando(true); try { await onClick() } finally { setEnviando(false) } }}
        className="botao-gradiente inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {feita ? <><CheckCircle2 size={15} aria-hidden /> Concluído</> : rotulo}
      </button>
      {!logado && !feita && <AvisoLogin />}
    </div>
  )
}

function EtapaTextoView({ etapa, feita, logado, aoConcluir }: any) {
  return (
    <div>
      <Paragrafos texto={etapa.content} />
      <BotaoConcluir feita={feita} logado={logado} rotulo="Concluir e avançar" onClick={aoConcluir} />
    </div>
  )
}

function EtapaQuizView({ etapa, feita, logado, aoConcluir }: any) {
  const [escolha, setEscolha] = useState<number | null>(null)
  const [resultado, setResultado] = useState<'certo' | 'errado' | null>(feita ? 'certo' : null)

  function verificar() {
    if (escolha === null) return
    if (escolha === etapa.ans) {
      setResultado('certo')
      aoConcluir()
    } else {
      setResultado('errado')
    }
  }

  return (
    <div>
      <p className="text-[0.9688rem] font-[600] leading-7 text-tinta">{etapa.q}</p>
      <div className="mt-3 space-y-2">
        {etapa.opts.map((op: string, i: number) => {
          const marcada = escolha === i
          const acerto = feita && i === etapa.ans
          return (
            <label
              key={i}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                acerto ? 'border-bom bg-[#f1f9ee]'
                : marcada ? 'border-marca bg-marca-clara'
                : 'border-borda-forte bg-white hover:border-marca'
              }`}
            >
              <input
                type="radio"
                name={`quiz-${etapa.id}`}
                checked={marcada}
                disabled={feita}
                onChange={() => { setEscolha(i); setResultado(null) }}
                className="mt-0.5 accent-[var(--color-marca)]"
              />
              <span className="text-tinta">{op}</span>
            </label>
          )
        })}
      </div>

      {resultado === 'certo' && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-bom">
          <CheckCircle2 size={16} aria-hidden /> Resposta correta! +{etapa.pts} pontos
        </p>
      )}
      {resultado === 'errado' && (
        <p className="mt-3 text-sm font-medium text-serio">Ainda não é essa. Revise e tente de novo. 💡</p>
      )}

      {!feita && (
        <BotaoConcluir
          feita={false}
          logado={logado}
          rotulo="Responder"
          disabled={escolha === null}
          onClick={verificar}
        />
      )}
    </div>
  )
}

function EtapaCacaView({ etapa, feita, logado, aoConcluir }: any) {
  const grid: string[][] = etapa.grid
  const palavras: string[] = etapa.palavras
  const posicoes: Record<string, [number, number][]> = etapa.posicoes

  const [inicio, setInicio] = useState<[number, number] | null>(null)
  const [achadas, setAchadas] = useState<Set<string>>(() => (feita ? new Set(palavras) : new Set()))

  // Células destacadas (das palavras já achadas).
  const destaque = useMemo(() => {
    const s = new Set<string>()
    for (const p of achadas) (posicoes[p] || []).forEach(([r, c]) => s.add(`${r},${c}`))
    return s
  }, [achadas, posicoes])

  function chave(r: number, c: number) { return `${r},${c}` }

  function linhaEntre(a: [number, number], b: [number, number]): string[] | null {
    const [r0, c0] = a, [r1, c1] = b
    const dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0)
    const compR = Math.abs(r1 - r0), compC = Math.abs(c1 - c0)
    const reta = r0 === r1 || c0 === c1 || compR === compC
    if (!reta) return null
    const n = Math.max(compR, compC) + 1
    const cels: string[] = []
    for (let k = 0; k < n; k++) cels.push(chave(r0 + dr * k, c0 + dc * k))
    return cels
  }

  function clicar(r: number, c: number) {
    if (feita) return
    if (!inicio) { setInicio([r, c]); return }
    const linha = linhaEntre(inicio, [r, c])
    setInicio(null)
    if (!linha) return
    const alvo = new Set(linha)
    for (const w of palavras) {
      if (achadas.has(w)) continue
      const cel = (posicoes[w] || []).map(([rr, cc]) => chave(rr, cc))
      if (cel.length === alvo.size && cel.every((x) => alvo.has(x))) {
        const nova = new Set(achadas); nova.add(w)
        setAchadas(nova)
        if (nova.size === palavras.length) aoConcluir()
        return
      }
    }
  }

  const cols = grid[0]?.length ?? 0

  return (
    <div>
      {etapa.intro && <div className="mb-4"><Paragrafos texto={etapa.intro} /></div>}

      <p className="mb-2 text-xs text-tinta-3">
        Clique na <strong className="font-semibold text-tinta-2">primeira</strong> e depois na{' '}
        <strong className="font-semibold text-tinta-2">última</strong> letra de cada palavra.
      </p>

      <div className="overflow-x-auto">
        <div
          className="mx-auto grid w-max select-none gap-0.5"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {grid.map((linha, r) =>
            linha.map((letra, c) => {
              const marcada = destaque.has(chave(r, c))
              const ini = inicio && inicio[0] === r && inicio[1] === c
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => clicar(r, c)}
                  disabled={feita}
                  className={`flex h-7 w-7 items-center justify-center rounded text-[0.7rem] font-semibold transition-colors sm:h-8 sm:w-8 sm:text-xs ${
                    marcada ? 'bg-verde-marca text-verde-escuro'
                    : ini ? 'bg-marca text-white'
                    : 'bg-superficie-2 text-tinta-2 hover:bg-marca-clara'
                  }`}
                >
                  {letra}
                </button>
              )
            }),
          )}
        </div>
      </div>

      {/* Lista de palavras */}
      <div className="mt-4 flex flex-wrap gap-2">
        {palavras.map((w) => {
          const ok = achadas.has(w)
          return (
            <span
              key={w}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                ok ? 'bg-[#eef7e3] text-verde-escuro line-through' : 'bg-superficie-2 text-tinta-2'
              }`}
            >
              {ok && '✓ '}{w}
            </span>
          )
        })}
      </div>

      {feita ? (
        <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-bom">
          <CheckCircle2 size={16} aria-hidden /> Todas as palavras encontradas! +{etapa.pts} pontos
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-tinta-3">{achadas.size} de {palavras.length} encontradas.</p>
          {!logado && <AvisoLogin />}
        </>
      )}
    </div>
  )
}
