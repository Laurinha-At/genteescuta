'use client'

// =============================================================
// Informações Administrativas — tópicos (cards) com vários itens.
//
// Colaboradores logados VEEM. Quem é admin (Master) ganha os controles
// de adicionar/editar/reordenar/remover tópicos e itens. A trava real de
// escrita está nas Regras do Firestore e do Storage.
// =============================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, Pencil, Trash2, X, ExternalLink, ArrowUp, ArrowDown, Upload, Link2, Loader2,
  ClipboardList, Clock, Bus, CreditCard, Wallet, Laptop, FileText, BookOpen, HeartPulse,
  Wrench, Building2, Gift, GraduationCap, Info, Video, Image as ImageIcon, Search, Table2, CalendarDays,
  Lock, Users,
} from 'lucide-react'
import {
  listarTopicos, criarTopico, atualizarTopico, excluirTopico, trocarOrdemTopicos,
  adicionarItem, atualizarItem, removerItem, moverItem, subirArquivo,
  ITEM_TIPOS, ITEM_TIPO_LABEL, ICONES_TOPICO, ICONE_TOPICO_LABEL, CORES_TOPICO,
  type InfoTopico, type InfoItem, type ItemTipo, type Visibilidade,
} from '@/lib/fb/infoAdmin'
import type { Perfil } from '@/lib/fb/funcionarios'
import { Aviso, Botao, Campo, ENTRADA, Vazio } from '@/components/ui'
import { RichTextEditor, RichHtml, type RichHandle } from '@/components/RichText'

// -------- Ícones --------
const ICONES: Record<string, typeof Info> = {
  ClipboardList, Clock, CalendarDays, Bus, CreditCard, Wallet, Laptop, FileText, BookOpen,
  HeartPulse, Wrench, Building2, Gift, GraduationCap, Info,
}
const ICONE_ITEM: Record<ItemTipo, typeof Info> = {
  link: Link2, video: Video, foto: ImageIcon, arquivo: Table2, texto: FileText, embed: CalendarDays,
}
function IconeTopico({ nome, size = 20 }: { nome: string; size?: number }) {
  const C = ICONES[nome] ?? Info
  return <C size={size} aria-hidden />
}

// -------- Cores dos cards (gradientes dentro da paleta Soulan) --------
const CORES: Record<string, { label: string; grad: string }> = {
  azul:     { label: 'Azul',     grad: 'linear-gradient(135deg, #2f8bb4 0%, #1f5c73 100%)' },
  verde:    { label: 'Verde',    grad: 'linear-gradient(135deg, #7bbf3b 0%, #557d26 100%)' },
  petroleo: { label: 'Petróleo', grad: 'linear-gradient(135deg, #2f83a4 0%, #154556 100%)' },
  ceu:      { label: 'Céu',      grad: 'linear-gradient(135deg, #7fbdd4 0%, #2f83a4 100%)' },
  ambar:    { label: 'Âmbar',    grad: 'linear-gradient(135deg, #f4b64a 0%, #d98a1f 100%)' },
  coral:    { label: 'Coral',    grad: 'linear-gradient(135deg, #f0956a 0%, #d75f38 100%)' },
  uva:      { label: 'Uva',      grad: 'linear-gradient(135deg, #8f77c2 0%, #5f4894 100%)' },
  grafite:  { label: 'Grafite',  grad: 'linear-gradient(135deg, #5c6b73 0%, #33414a 100%)' },
}
/** Cor efetiva do tópico: a escolhida, ou uma automática pela posição. */
function corDe(t: InfoTopico, idx: number): string {
  const nome = t.cor && CORES[t.cor] ? t.cor : CORES_TOPICO[idx % CORES_TOPICO.length]
  return CORES[nome].grad
}

// -------- Chips de tipo de item (prévia do conteúdo) --------
const CHIP_ITEM: Record<ItemTipo, { label: string; Icone: typeof Info }> = {
  link:    { label: 'Link',       Icone: Link2 },
  video:   { label: 'Vídeo',      Icone: Video },
  foto:    { label: 'Foto',       Icone: ImageIcon },
  arquivo: { label: 'Planilha',   Icone: Table2 },
  texto:   { label: 'Texto',      Icone: FileText },
  embed:   { label: 'Calendário', Icone: CalendarDays },
}
/** Tipos presentes no tópico, na ordem canônica. */
function tiposPresentes(t: InfoTopico): ItemTipo[] {
  return ITEM_TIPOS.filter((tp) => t.itens.some((i) => i.tipo === tp))
}
/** Texto puro (sem HTML) para busca. */
const semHtml = (s: string) => (s || '').replace(/<[^>]*>/g, ' ')

/** Converte link de YouTube/Drive/Canva na URL de embed. */
function urlEmbed(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
    }
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`
    if (u.hostname.includes('drive.google.com')) {
      const m = u.pathname.match(/\/file\/d\/([^/]+)/)
      if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
    }
    if (u.hostname.includes('canva.com')) {
      // .../design/{id}/{token}/(edit|view)… → sempre /view?embed
      const m = u.pathname.match(/\/design\/([^/]+)\/([^/]+)/)
      if (m) return `https://www.canva.com/design/${m[1]}/${m[2]}/view?embed`
    }
    return url
  } catch { return url }
}
const ehEmbed = (url: string) => /youtube\.com|youtu\.be|drive\.google\.com|canva\.com\/design\//.test(url)

/** URL para abrir em nova aba (sem o modo embed). */
function urlAbrir(url: string): string {
  const emb = urlEmbed(url)
  return emb.replace(/\/view\?embed$/, '/view').replace(/\?embed$/, '')
}

/** Aceita um link OU um código de incorporação (<iframe …>) e devolve a URL. */
function extrairUrlEmbed(entrada: string): string {
  const s = (entrada || '').trim()
  const m = s.match(/src\s*=\s*["']([^"']+)["']/i)
  return (m ? m[1] : s).trim()
}

type EdTopico = InfoTopico | 'novo' | null

export function InfoAdminApp({ perfil }: { perfil: Perfil }) {
  const ehAdmin = perfil.tipo === 'admin' && perfil.ativo
  const [topicos, setTopicos] = useState<InfoTopico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [edTopico, setEdTopico] = useState<EdTopico>(null)
  const [abertoId, setAbertoId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  function recarregar() {
    setCarregando(true)
    listarTopicos().then(setTopicos).catch(() => {}).finally(() => setCarregando(false))
  }
  useEffect(() => {
    listarTopicos().then(setTopicos).catch(() => {}).finally(() => setCarregando(false))
  }, [])

  async function acao(fn: () => Promise<unknown>, msg?: string) {
    setErro(null); setAviso(null)
    try { await fn(); if (msg) setAviso(msg); recarregar() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não consegui concluir a ação.') }
  }

  const termo = busca.trim().toLowerCase()
  // Colaborador não vê os assuntos marcados como "apenas administradores".
  const base = useMemo(
    () => (ehAdmin ? topicos : topicos.filter((t) => (t.visivel ?? 'todos') !== 'admin')),
    [topicos, ehAdmin],
  )
  const filtrados = useMemo(() => {
    if (!termo) return base
    return base.filter((t) =>
      `${semHtml(t.titulo)} ${semHtml(t.descricao)}`.toLowerCase().includes(termo),
    )
  }, [base, termo])

  // Índice de cor de cada tópico segue a posição real (estável ao filtrar).
  const idxCor = useMemo(() => new Map(topicos.map((t, i) => [t.id, i])), [topicos])
  const aberto = abertoId ? topicos.find((t) => t.id === abertoId) ?? null : null

  return (
    <div className="space-y-4">
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {aviso && !erro && <Aviso tom="sucesso">{aviso}</Aviso>}

      {/* Busca + ação de admin */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-3" aria-hidden />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar assunto (ex.: ponto, holerite, transporte)…"
            className={`${ENTRADA} pl-10`}
            type="search"
          />
        </div>
        {ehAdmin && (
          <Botao type="button" onClick={() => { setErro(null); setAviso(null); setEdTopico('novo') }}>
            <Plus size={15} aria-hidden /> Adicionar assunto
          </Botao>
        )}
      </div>

      {carregando ? (
        <p className="text-sm text-tinta-3">Carregando…</p>
      ) : base.length === 0 ? (
        <Vazio
          titulo="Nenhum assunto ainda"
          descricao={ehAdmin ? 'Use “Adicionar assunto” para criar o primeiro card (ex.: Registro de Ponto, Vale-Transporte).' : 'Em breve a equipe de Gente & Cultura vai publicar os conteúdos aqui.'}
        />
      ) : filtrados.length === 0 ? (
        <Vazio titulo="Nada encontrado" descricao={`Nenhum assunto combina com “${busca.trim()}”. Tente outra palavra.`} />
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 17rem), 1fr))' }}
        >
          {filtrados.map((t) => {
            const idx = idxCor.get(t.id) ?? 0
            return (
              <CartaoPreview
                key={t.id}
                topico={t}
                grad={corDe(t, idx)}
                ehAdmin={ehAdmin}
                primeiro={idx === 0}
                ultimo={idx === topicos.length - 1}
                onAbrir={() => setAbertoId(t.id)}
                onEditar={() => { setErro(null); setAviso(null); setEdTopico(t) }}
                onExcluir={() => { if (confirm('Remover este assunto e todos os seus itens?')) acao(() => excluirTopico(t.id), 'Assunto removido.') }}
                onMover={(dir) => { const outro = topicos[idx + dir]; if (outro) acao(() => trocarOrdemTopicos(t, outro)) }}
              />
            )
          })}
        </div>
      )}

      {aberto && (
        <DetalheTopico
          topico={aberto}
          grad={corDe(aberto, idxCor.get(aberto.id) ?? 0)}
          ehAdmin={ehAdmin}
          onFechar={() => setAbertoId(null)}
          aoMudar={recarregar}
          setErro={setErro}
        />
      )}

      {edTopico && (
        <EditorTopico
          topico={edTopico === 'novo' ? null : edTopico}
          onFechar={() => setEdTopico(null)}
          onSalvo={(msg) => { setEdTopico(null); setAviso(msg); recarregar() }}
          setErro={setErro}
        />
      )}
    </div>
  )
}

// -------------------------------------------------------------
// Card de prévia (grade). Clicar abre o detalhe.
// -------------------------------------------------------------
function CartaoPreview({
  topico, grad, ehAdmin, primeiro, ultimo, onAbrir, onEditar, onExcluir, onMover,
}: {
  topico: InfoTopico
  grad: string
  ehAdmin: boolean
  primeiro: boolean
  ultimo: boolean
  onAbrir: () => void
  onEditar: () => void
  onExcluir: () => void
  onMover: (dir: -1 | 1) => void
}) {
  const tipos = tiposPresentes(topico)
  const n = topico.itens.length
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir() } }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-borda bg-white text-left shadow-[0_1px_3px_rgba(26,23,20,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-borda-forte hover:shadow-[0_10px_28px_rgba(26,23,20,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-marca focus-visible:ring-offset-2"
    >
      {/* Faixa de cor + ícone grande */}
      <div className="relative flex h-20 items-center gap-3 px-5" style={{ background: grad }}>
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-white/25 text-white ring-1 ring-inset ring-white/30 backdrop-blur-sm">
          <IconeTopico nome={topico.icone} size={26} />
        </span>
        <RichHtml
          html={topico.titulo}
          className="line-clamp-2 min-w-0 flex-1 text-[1.0625rem] font-bold leading-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.25)]"
        />
        {ehAdmin && (
          <div className="absolute right-2 top-2 flex gap-0.5" onClick={stop}>
            <button type="button" title="Mover para cima" disabled={primeiro} onClick={() => onMover(-1)} className="rounded-md p-1 text-white/80 hover:bg-white/25 hover:text-white disabled:opacity-30"><ArrowUp size={14} aria-hidden /></button>
            <button type="button" title="Mover para baixo" disabled={ultimo} onClick={() => onMover(1)} className="rounded-md p-1 text-white/80 hover:bg-white/25 hover:text-white disabled:opacity-30"><ArrowDown size={14} aria-hidden /></button>
            <button type="button" title="Editar assunto" onClick={onEditar} className="rounded-md p-1 text-white/80 hover:bg-white/25 hover:text-white"><Pencil size={14} aria-hidden /></button>
            <button type="button" title="Remover assunto" onClick={onExcluir} className="rounded-md p-1 text-white/80 hover:bg-white/25 hover:text-white"><Trash2 size={14} aria-hidden /></button>
          </div>
        )}
      </div>

      {/* Corpo: descrição curta + prévia (chips de tipos) */}
      <div className="flex flex-1 flex-col p-4">
        {topico.descricao ? (
          <RichHtml html={topico.descricao} className="line-clamp-2 text-[0.8125rem] leading-6 text-tinta-2" />
        ) : (
          <p className="text-[0.8125rem] leading-6 text-tinta-3">Toque para ver os conteúdos deste assunto.</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          {topico.visivel === 'admin' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-marca-clara px-2 py-0.5 text-[0.6875rem] font-semibold text-marca-escura">
              <Lock size={11} aria-hidden /> Só admin
            </span>
          )}
          {tipos.map((tp) => {
            const { label, Icone } = CHIP_ITEM[tp]
            return (
              <span key={tp} className="inline-flex items-center gap-1 rounded-full bg-superficie-2 px-2 py-0.5 text-[0.6875rem] font-medium text-tinta-2">
                <Icone size={11} className="text-marca" aria-hidden /> {label}
              </span>
            )
          })}
          <span className="ml-auto text-[0.6875rem] font-semibold text-tinta-3">
            {n === 0 ? 'Sem itens' : `${n} ${n === 1 ? 'item' : 'itens'}`}
          </span>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// Detalhe de um assunto (modal) — lista os itens; admin gerencia aqui.
// -------------------------------------------------------------
function DetalheTopico({
  topico, grad, ehAdmin, onFechar, aoMudar, setErro,
}: {
  topico: InfoTopico
  grad: string
  ehAdmin: boolean
  onFechar: () => void
  aoMudar: () => void
  setErro: (s: string | null) => void
}) {
  const [edItem, setEdItem] = useState<InfoItem | 'novo' | null>(null)

  async function acaoItem(fn: () => Promise<unknown>) {
    setErro(null)
    try { await fn(); aoMudar() } catch (e) { setErro(e instanceof Error ? e.message : 'Não consegui concluir.') }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onFechar}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho colorido */}
        <div className="relative flex items-center gap-3.5 px-6 py-5" style={{ background: grad }}>
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-white/25 text-white ring-1 ring-inset ring-white/30 backdrop-blur-sm">
            <IconeTopico nome={topico.icone} size={26} />
          </span>
          <RichHtml html={topico.titulo} className="min-w-0 flex-1 text-lg font-bold leading-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.25)]" />
          <button type="button" onClick={onFechar} className="rounded-lg p-1.5 text-white/85 hover:bg-white/25 hover:text-white" aria-label="Fechar"><X size={20} aria-hidden /></button>
        </div>

        <div className="max-h-[calc(92vh-5.5rem)] overflow-y-auto p-6">
          {topico.descricao && <RichHtml html={topico.descricao} className="mb-4 text-[0.9063rem] leading-7 text-tinta-2" />}

          <div className="space-y-2.5">
            {topico.itens.length === 0 ? (
              <p className="text-[0.875rem] text-tinta-3">{ehAdmin ? 'Nenhum item ainda — adicione links, vídeos, fotos, planilhas ou textos.' : 'Sem conteúdos ainda.'}</p>
            ) : (
              topico.itens.map((it, i) => (
                <ItemView
                  key={it.id}
                  item={it}
                  ehAdmin={ehAdmin}
                  primeiro={i === 0}
                  ultimo={i === topico.itens.length - 1}
                  onEditar={() => { setErro(null); setEdItem(it) }}
                  onExcluir={() => { if (confirm('Remover este item?')) acaoItem(() => removerItem(topico.id, it.id)) }}
                  onMover={(dir) => acaoItem(() => moverItem(topico.id, it.id, dir))}
                />
              ))
            )}
          </div>

          {ehAdmin && (
            <button
              type="button"
              onClick={() => { setErro(null); setEdItem('novo') }}
              className="mt-4 inline-flex items-center gap-1.5 self-start rounded-lg border border-dashed border-borda-forte px-3 py-1.5 text-[0.8125rem] font-medium text-tinta-2 transition-colors hover:border-marca hover:text-marca-texto"
            >
              <Plus size={14} aria-hidden /> Adicionar item
            </button>
          )}
        </div>
      </div>

      {edItem && (
        <EditorItem
          topicoId={topico.id}
          item={edItem === 'novo' ? null : edItem}
          onFechar={() => setEdItem(null)}
          onSalvo={() => { setEdItem(null); aoMudar() }}
          setErro={setErro}
        />
      )}
    </div>
  )
}

// -------------------------------------------------------------
// Exibição de um item conforme o tipo
// -------------------------------------------------------------
function ItemView({
  item, ehAdmin, primeiro, ultimo, onEditar, onExcluir, onMover,
}: {
  item: InfoItem
  ehAdmin: boolean
  primeiro: boolean
  ultimo: boolean
  onEditar: () => void
  onExcluir: () => void
  onMover: (dir: -1 | 1) => void
}) {
  const Icone = ICONE_ITEM[item.tipo] ?? Link2
  return (
    <div className="rounded-lg border border-borda bg-white px-3 py-2.5">
      <div className="flex items-start gap-2">
        <Icone size={15} className="mt-0.5 flex-none text-marca" aria-hidden />
        <div className="min-w-0 flex-1">
          <RichHtml html={item.titulo} className="text-sm font-medium text-tinta" />
          {item.descricao && <RichHtml html={item.descricao} className="mt-0.5 text-xs leading-5 text-tinta-3" />}

          {item.tipo === 'texto' && item.texto && (
            <RichHtml html={item.texto} className="mt-1.5 text-[0.8125rem] leading-6 text-tinta-2" />
          )}

          {item.tipo === 'video' && item.url && (
            item.storage_path || !ehEmbed(item.url) ? (
              <video controls src={item.url} className="mt-2 w-full rounded-lg border border-borda" />
            ) : (
              <div className="mt-2 aspect-video overflow-hidden rounded-lg border border-borda bg-black">
                <iframe src={urlEmbed(item.url)} title="Vídeo" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            )
          )}

          {item.tipo === 'foto' && item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
              <img src={item.url} alt="" className="max-h-64 w-full rounded-lg border border-borda object-cover" />
            </a>
          )}

          {(item.tipo === 'link' || item.tipo === 'arquivo') && item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-marca-texto transition-colors hover:text-marca-escura">
              {item.tipo === 'arquivo' ? 'Abrir arquivo' : 'Abrir'} <ExternalLink size={13} aria-hidden />
            </a>
          )}

          {item.tipo === 'embed' && item.url && (
            <div className="mt-2">
              {ehEmbed(item.url) && (
                <div className="relative w-full overflow-hidden rounded-lg border border-borda bg-superficie-2" style={{ aspectRatio: '16 / 10' }}>
                  <iframe
                    src={urlEmbed(item.url)}
                    title="Conteúdo incorporado"
                    className="absolute inset-0 h-full w-full"
                    loading="lazy"
                    allow="fullscreen"
                    allowFullScreen
                  />
                </div>
              )}
              <a href={urlAbrir(item.url)} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-marca-texto transition-colors hover:text-marca-escura">
                Abrir calendário <ExternalLink size={13} aria-hidden />
              </a>
            </div>
          )}
        </div>

        {ehAdmin && (
          <div className="flex flex-none gap-0.5">
            <button type="button" title="Mover para cima" disabled={primeiro} onClick={() => onMover(-1)} className="rounded p-1 text-tinta-3 hover:bg-superficie-2 hover:text-marca disabled:opacity-30"><ArrowUp size={14} aria-hidden /></button>
            <button type="button" title="Mover para baixo" disabled={ultimo} onClick={() => onMover(1)} className="rounded p-1 text-tinta-3 hover:bg-superficie-2 hover:text-marca disabled:opacity-30"><ArrowDown size={14} aria-hidden /></button>
            <button type="button" title="Editar item" onClick={onEditar} className="rounded p-1 text-tinta-3 hover:bg-superficie-2 hover:text-marca"><Pencil size={14} aria-hidden /></button>
            <button type="button" title="Remover item" onClick={onExcluir} className="rounded p-1 text-tinta-3 hover:bg-plano hover:text-critico"><Trash2 size={14} aria-hidden /></button>
          </div>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// Modal genérico
// -------------------------------------------------------------
function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onFechar}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="text-base font-semibold text-tinta">{titulo}</h3>
          <button type="button" onClick={onFechar} className="rounded-lg p-1.5 text-tinta-3 hover:bg-superficie-2" aria-label="Fechar"><X size={18} aria-hidden /></button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// Editor de tópico (card)
// -------------------------------------------------------------
function EditorTopico({
  topico, onFechar, onSalvo, setErro,
}: {
  topico: InfoTopico | null
  onFechar: () => void
  onSalvo: (msg: string) => void
  setErro: (s: string | null) => void
}) {
  const [icone, setIcone] = useState(topico?.icone ?? 'ClipboardList')
  const [cor, setCor] = useState<string>(topico?.cor && CORES[topico.cor] ? topico.cor : 'azul')
  const [visivel, setVisivel] = useState<Visibilidade>(topico?.visivel === 'admin' ? 'admin' : 'todos')
  const tituloRef = useRef<RichHandle>(null)
  const descRef = useRef<RichHandle>(null)
  const [pendente, setPendente] = useState(false)

  async function salvar() {
    setErro(null); setPendente(true)
    try {
      const dados = { icone, cor, visivel, titulo: tituloRef.current?.getHtml() ?? '', descricao: descRef.current?.getHtml() ?? '' }
      if (topico) { await atualizarTopico(topico.id, dados); onSalvo('Tópico atualizado.') }
      else { await criarTopico(dados); onSalvo('Tópico criado.') }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui salvar.'); setPendente(false)
    }
  }

  return (
    <Modal titulo={topico ? 'Editar tópico' : 'Novo tópico'} onFechar={onFechar}>
      <div className="space-y-4">
        <Campo rotulo="Ícone" ajuda="Escolha um ícone que represente o tópico.">
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {ICONES_TOPICO.map((nome) => (
              <button
                key={nome}
                type="button"
                onClick={() => setIcone(nome)}
                title={ICONE_TOPICO_LABEL[nome]}
                className={`flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 transition-colors ${icone === nome ? 'border-marca bg-marca-clara text-marca' : 'border-borda-forte bg-white text-tinta-2 hover:border-marca'}`}
              >
                <IconeTopico nome={nome} size={18} />
                <span className="text-[0.6875rem] font-medium leading-tight">{ICONE_TOPICO_LABEL[nome]}</span>
              </button>
            ))}
          </div>
        </Campo>
        <Campo rotulo="Cor do card" ajuda="Ajuda a diferenciar os assuntos visualmente.">
          <div className="flex flex-wrap gap-2">
            {CORES_TOPICO.map((nome) => (
              <button
                key={nome}
                type="button"
                onClick={() => setCor(nome)}
                title={CORES[nome].label}
                aria-label={CORES[nome].label}
                className={`h-9 w-9 rounded-full transition-transform ${cor === nome ? 'scale-110 ring-2 ring-marca ring-offset-2' : 'ring-1 ring-inset ring-black/10 hover:scale-105'}`}
                style={{ background: CORES[nome].grad }}
              />
            ))}
          </div>
        </Campo>
        <Campo rotulo="Quem vê este assunto" ajuda="“Apenas administradores” esconde o card dos colaboradores.">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVisivel('todos')}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${visivel === 'todos' ? 'border-marca bg-marca-clara text-marca-escura' : 'border-borda-forte bg-white text-tinta-2 hover:border-marca'}`}
            >
              <Users size={13} aria-hidden /> Todos os colaboradores
            </button>
            <button
              type="button"
              onClick={() => setVisivel('admin')}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${visivel === 'admin' ? 'border-marca bg-marca-clara text-marca-escura' : 'border-borda-forte bg-white text-tinta-2 hover:border-marca'}`}
            >
              <Lock size={13} aria-hidden /> Apenas administradores
            </button>
          </div>
        </Campo>
        <Campo rotulo="Título" obrigatorio>
          <RichTextEditor ref={tituloRef} valorInicial={topico?.titulo ?? ''} placeholder="Ex.: Registro de Ponto – iFractal" minHeight={44} />
        </Campo>
        <Campo rotulo="Descrição" ajuda="Opcional. Use os botões para negrito e listas; Enter pula linha.">
          <RichTextEditor ref={descRef} valorInicial={topico?.descricao ?? ''} placeholder="Explique rapidamente o tópico…" />
        </Campo>
      </div>
      {!topico && (
        <p className="mt-4 rounded-lg bg-marca-clara px-3.5 py-2.5 text-xs leading-5 text-marca-escura">
          Depois de salvar, use <strong>“Adicionar item”</strong> no card para incluir o <strong>link de acesso</strong>, vídeos, fotos ou arquivos.
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Botao type="button" variante="secundario" onClick={onFechar}>Cancelar</Botao>
        <Botao type="button" onClick={salvar} disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar'}</Botao>
      </div>
    </Modal>
  )
}

// -------------------------------------------------------------
// Editor de item
// -------------------------------------------------------------
function EditorItem({
  topicoId, item, onFechar, onSalvo, setErro,
}: {
  topicoId: string
  item: InfoItem | null
  onFechar: () => void
  onSalvo: () => void
  setErro: (s: string | null) => void
}) {
  const [tipo, setTipo] = useState<ItemTipo>(item?.tipo ?? 'link')
  const tituloRef = useRef<RichHandle>(null)
  const descRef = useRef<RichHandle>(null)
  const textoRef = useRef<RichHandle>(null)
  const [fonte, setFonte] = useState<'link' | 'upload'>(item?.storage_path ? 'upload' : 'link')
  const [urlLink, setUrlLink] = useState(item?.storage_path ? '' : (item?.url ?? ''))
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [pendente, setPendente] = useState(false)

  const permiteUpload = tipo === 'video' || tipo === 'foto' || tipo === 'arquivo'
  const jaTemUpload = !!item?.storage_path

  const dicaLink = useMemo(() => {
    if (tipo === 'video') return 'Link do YouTube ou do Google Drive.'
    if (tipo === 'foto') return 'Link direto da imagem.'
    if (tipo === 'arquivo') return 'Link do Google Sheets/Drive ou do arquivo.'
    return 'Cole o endereço completo (https://).'
  }, [tipo])

  async function salvar() {
    setErro(null); setPendente(true)
    try {
      const titulo = tituloRef.current?.getHtml() ?? ''
      const descricao = descRef.current?.getHtml() ?? ''
      let dados: Parameters<typeof adicionarItem>[1]
      if (tipo === 'texto') {
        dados = { tipo, titulo, descricao, texto: textoRef.current?.getHtml() ?? '' }
      } else if (tipo === 'embed') {
        dados = { tipo, titulo, descricao, url: extrairUrlEmbed(urlLink) }
      } else if (tipo === 'link' || fonte === 'link') {
        dados = { tipo, titulo, descricao, url: urlLink }
      } else {
        // upload
        if (arquivo) {
          const { url, path } = await subirArquivo(topicoId, arquivo, tipo as 'video' | 'foto' | 'arquivo')
          dados = { tipo, titulo, descricao, url, storage_path: path }
        } else if (jaTemUpload && item) {
          dados = { tipo, titulo, descricao, url: item.url, storage_path: item.storage_path }
        } else {
          throw new Error('Escolha um arquivo para enviar.')
        }
      }
      if (item) await atualizarItem(topicoId, item.id, dados)
      else await adicionarItem(topicoId, dados)
      onSalvo()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui salvar o item.'); setPendente(false)
    }
  }

  const aceite = tipo === 'video' ? 'video/*' : tipo === 'foto' ? 'image/*' : undefined

  return (
    <Modal titulo={item ? 'Editar item' : 'Novo item'} onFechar={onFechar}>
      <div className="space-y-4">
        <Campo rotulo="Tipo" obrigatorio>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as ItemTipo)} className={ENTRADA}>
            {ITEM_TIPOS.map((t) => <option key={t} value={t}>{ITEM_TIPO_LABEL[t]}</option>)}
          </select>
        </Campo>

        <Campo rotulo="Título" obrigatorio>
          <RichTextEditor ref={tituloRef} valorInicial={item?.titulo ?? ''} placeholder="Ex.: Vídeo passo a passo / Paulista" minHeight={44} />
        </Campo>

        <Campo rotulo="Descrição">
          <RichTextEditor ref={descRef} valorInicial={item?.descricao ?? ''} placeholder="Opcional." minHeight={44} />
        </Campo>

        {tipo === 'texto' ? (
          <Campo rotulo="Conteúdo" obrigatorio>
            <RichTextEditor ref={textoRef} valorInicial={item?.texto ?? ''} placeholder="Escreva as orientações…" />
          </Campo>
        ) : tipo === 'embed' ? (
          <Campo
            rotulo="Link público ou código de incorporação"
            ajuda="Cole o link público do Canva (…/view) ou o código de “Incorporar”. Dá para trocar depois quando o calendário for atualizado."
            obrigatorio
          >
            <textarea
              value={urlLink}
              onChange={(e) => setUrlLink(e.target.value)}
              className={`${ENTRADA} min-h-[92px] font-mono text-xs`}
              placeholder={'https://www.canva.com/design/…/view\nou <iframe src="…"></iframe>'}
            />
          </Campo>
        ) : (
          <div className="space-y-3">
            {permiteUpload && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setFonte('link')} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${fonte === 'link' ? 'border-marca bg-marca-clara text-marca-escura' : 'border-borda-forte bg-white text-tinta-2 hover:border-marca'}`}>
                  <Link2 size={13} aria-hidden /> Link externo
                </button>
                <button type="button" onClick={() => setFonte('upload')} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${fonte === 'upload' ? 'border-marca bg-marca-clara text-marca-escura' : 'border-borda-forte bg-white text-tinta-2 hover:border-marca'}`}>
                  <Upload size={13} aria-hidden /> Enviar arquivo
                </button>
              </div>
            )}

            {tipo === 'link' || fonte === 'link' ? (
              <Campo rotulo="Link" ajuda={dicaLink} obrigatorio>
                <input value={urlLink} onChange={(e) => setUrlLink(e.target.value)} className={ENTRADA} placeholder="https://…" inputMode="url" />
              </Campo>
            ) : (
              <Campo rotulo="Arquivo" ajuda={jaTemUpload ? 'Já existe um arquivo enviado. Escolha outro só se quiser substituir.' : 'Enviado ao Firebase Storage.'} obrigatorio={!jaTemUpload}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-borda-forte bg-white px-4 py-3 text-sm text-tinta-2 transition-colors hover:border-marca">
                  <Upload size={16} className="text-marca" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{arquivo ? arquivo.name : (jaTemUpload ? 'Arquivo atual mantido' : 'Escolher arquivo…')}</span>
                  <input type="file" accept={aceite} className="hidden" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
                </label>
              </Campo>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Botao type="button" variante="secundario" onClick={onFechar} disabled={pendente}>Cancelar</Botao>
        <Botao type="button" onClick={salvar} disabled={pendente}>
          {pendente ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Salvando…</> : 'Salvar'}
        </Botao>
      </div>
    </Modal>
  )
}
