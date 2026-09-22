'use client'

// =============================================================
// Informações Administrativas — tópicos (cards) com vários itens.
//
// Colaboradores logados VEEM. Quem é admin (Master) ganha os controles
// de adicionar/editar/reordenar/remover tópicos e itens. A trava real de
// escrita está nas Regras do Firestore e do Storage.
// =============================================================
import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Pencil, Trash2, X, ExternalLink, ArrowUp, ArrowDown, Upload, Link2, Loader2,
  ClipboardList, Clock, Bus, CreditCard, Wallet, Laptop, FileText, BookOpen, HeartPulse,
  Wrench, Building2, Gift, GraduationCap, Info, Video, Image as ImageIcon,
} from 'lucide-react'
import {
  listarTopicos, criarTopico, atualizarTopico, excluirTopico, trocarOrdemTopicos,
  adicionarItem, atualizarItem, removerItem, moverItem, subirArquivo,
  ITEM_TIPOS, ITEM_TIPO_LABEL, ICONES_TOPICO,
  type InfoTopico, type InfoItem, type ItemTipo,
} from '@/lib/fb/infoAdmin'
import type { Perfil } from '@/lib/fb/funcionarios'
import { Aviso, Botao, Campo, ENTRADA, Vazio } from '@/components/ui'
import { RichTextEditor, RichHtml } from '@/components/RichText'

// -------- Ícones --------
const ICONES: Record<string, typeof Info> = {
  ClipboardList, Clock, Bus, CreditCard, Wallet, Laptop, FileText, BookOpen,
  HeartPulse, Wrench, Building2, Gift, GraduationCap, Info,
}
const ICONE_ITEM: Record<ItemTipo, typeof Info> = {
  link: Link2, video: Video, foto: ImageIcon, arquivo: FileText, texto: FileText,
}
function IconeTopico({ nome, size = 20 }: { nome: string; size?: number }) {
  const C = ICONES[nome] ?? Info
  return <C size={size} aria-hidden />
}

/** Converte link de YouTube/Drive na URL de embed. */
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
    return url
  } catch { return url }
}
const ehEmbed = (url: string) => /youtube\.com|youtu\.be|drive\.google\.com/.test(url)

type EdTopico = InfoTopico | 'novo' | null

export function InfoAdminApp({ perfil }: { perfil: Perfil }) {
  const ehAdmin = perfil.tipo === 'admin' && perfil.ativo
  const [topicos, setTopicos] = useState<InfoTopico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [edTopico, setEdTopico] = useState<EdTopico>(null)
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

  return (
    <div className="space-y-4">
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {aviso && !erro && <Aviso tom="sucesso">{aviso}</Aviso>}

      {ehAdmin && (
        <div className="flex justify-end">
          <Botao type="button" onClick={() => { setErro(null); setAviso(null); setEdTopico('novo') }}>
            <Plus size={15} aria-hidden /> Adicionar tópico
          </Botao>
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-tinta-3">Carregando…</p>
      ) : topicos.length === 0 ? (
        <Vazio
          titulo="Nenhum tópico ainda"
          descricao={ehAdmin ? 'Use “Adicionar tópico” para criar o primeiro card (ex.: Registro de Ponto, Vale-Transporte).' : 'Em breve a equipe de Gente & Cultura vai publicar os conteúdos aqui.'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {topicos.map((t, idx) => (
            <CartaoTopico
              key={t.id}
              topico={t}
              ehAdmin={ehAdmin}
              primeiro={idx === 0}
              ultimo={idx === topicos.length - 1}
              onEditar={() => { setErro(null); setAviso(null); setEdTopico(t) }}
              onExcluir={() => { if (confirm('Remover este tópico e todos os seus itens?')) acao(() => excluirTopico(t.id), 'Tópico removido.') }}
              onMover={(dir) => { const outro = topicos[idx + dir]; if (outro) acao(() => trocarOrdemTopicos(t, outro)) }}
              aoMudar={recarregar}
              setErro={setErro}
            />
          ))}
        </div>
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
// Card de um tópico
// -------------------------------------------------------------
function CartaoTopico({
  topico, ehAdmin, primeiro, ultimo, onEditar, onExcluir, onMover, aoMudar, setErro,
}: {
  topico: InfoTopico
  ehAdmin: boolean
  primeiro: boolean
  ultimo: boolean
  onEditar: () => void
  onExcluir: () => void
  onMover: (dir: -1 | 1) => void
  aoMudar: () => void
  setErro: (s: string | null) => void
}) {
  const [edItem, setEdItem] = useState<InfoItem | 'novo' | null>(null)

  async function acaoItem(fn: () => Promise<unknown>) {
    setErro(null)
    try { await fn(); aoMudar() } catch (e) { setErro(e instanceof Error ? e.message : 'Não consegui concluir.') }
  }

  return (
    <div className="cartao-g flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-marca-clara text-marca">
          <IconeTopico nome={topico.icone} />
        </span>
        <div className="min-w-0 flex-1">
          <RichHtml html={topico.titulo} className="text-[0.9375rem] font-semibold text-tinta" />
          {topico.descricao && <RichHtml html={topico.descricao} className="mt-1 text-[0.8125rem] leading-6 text-tinta-3" />}
        </div>
        {ehAdmin && (
          <div className="flex flex-none flex-col gap-0.5">
            <div className="flex gap-0.5">
              <button type="button" title="Mover para cima" disabled={primeiro} onClick={() => onMover(-1)} className="rounded p-1 text-tinta-3 hover:bg-white hover:text-marca disabled:opacity-30">
                <ArrowUp size={15} aria-hidden />
              </button>
              <button type="button" title="Mover para baixo" disabled={ultimo} onClick={() => onMover(1)} className="rounded p-1 text-tinta-3 hover:bg-white hover:text-marca disabled:opacity-30">
                <ArrowDown size={15} aria-hidden />
              </button>
            </div>
            <div className="flex gap-0.5">
              <button type="button" title="Editar tópico" onClick={onEditar} className="rounded p-1 text-tinta-3 hover:bg-white hover:text-marca">
                <Pencil size={15} aria-hidden />
              </button>
              <button type="button" title="Remover tópico" onClick={onExcluir} className="rounded p-1 text-tinta-3 hover:bg-plano hover:text-critico">
                <Trash2 size={15} aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2.5">
        {topico.itens.length === 0 ? (
          <p className="text-[0.8125rem] text-tinta-3">{ehAdmin ? 'Nenhum item ainda — adicione links, vídeos, fotos, arquivos ou textos.' : 'Sem conteúdos ainda.'}</p>
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
  const [titulo, setTitulo] = useState(topico?.titulo ?? '')
  const [descricao, setDescricao] = useState(topico?.descricao ?? '')
  const [pendente, setPendente] = useState(false)

  async function salvar() {
    setErro(null); setPendente(true)
    try {
      if (topico) { await atualizarTopico(topico.id, { icone, titulo, descricao }); onSalvo('Tópico atualizado.') }
      else { await criarTopico({ icone, titulo, descricao }); onSalvo('Tópico criado.') }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui salvar.'); setPendente(false)
    }
  }

  return (
    <Modal titulo={topico ? 'Editar tópico' : 'Novo tópico'} onFechar={onFechar}>
      <div className="space-y-4">
        <Campo rotulo="Ícone">
          <div className="flex flex-wrap gap-1.5">
            {ICONES_TOPICO.map((nome) => (
              <button
                key={nome}
                type="button"
                onClick={() => setIcone(nome)}
                title={nome}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${icone === nome ? 'border-marca bg-marca-clara text-marca' : 'border-borda-forte bg-white text-tinta-2 hover:border-marca'}`}
              >
                <IconeTopico nome={nome} size={18} />
              </button>
            ))}
          </div>
        </Campo>
        <Campo rotulo="Título" obrigatorio>
          <RichTextEditor valorInicial={titulo} onChange={setTitulo} placeholder="Ex.: Registro de Ponto – iFractal" minHeight={44} />
        </Campo>
        <Campo rotulo="Descrição">
          <RichTextEditor valorInicial={descricao} onChange={setDescricao} placeholder="Explique rapidamente o tópico…" />
        </Campo>
      </div>
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
  const [titulo, setTitulo] = useState(item?.titulo ?? '')
  const [descricao, setDescricao] = useState(item?.descricao ?? '')
  const [texto, setTexto] = useState(item?.texto ?? '')
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
      let dados: Parameters<typeof adicionarItem>[1]
      if (tipo === 'texto') {
        dados = { tipo, titulo, descricao, texto }
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
          <RichTextEditor valorInicial={titulo} onChange={setTitulo} placeholder="Ex.: Vídeo passo a passo / Paulista" minHeight={44} />
        </Campo>

        <Campo rotulo="Descrição">
          <RichTextEditor valorInicial={descricao} onChange={setDescricao} placeholder="Opcional." minHeight={44} />
        </Campo>

        {tipo === 'texto' ? (
          <Campo rotulo="Conteúdo" obrigatorio>
            <RichTextEditor valorInicial={texto} onChange={setTexto} placeholder="Escreva as orientações…" />
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
