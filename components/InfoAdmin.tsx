'use client'

// =============================================================
// Informações Administrativas — tela do colaborador + edição do admin.
//
// Colaboradores logados VEEM os itens. Quem é admin (perfil.tipo ===
// 'admin') ganha os controles de adicionar, editar e remover. A trava
// real de escrita está nas Regras do Firestore.
// =============================================================
import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Pencil, Trash2, X, ExternalLink, FileSpreadsheet, LinkIcon, Video, FileText,
} from 'lucide-react'
import {
  listarInfoItens, criarInfoItem, atualizarInfoItem, excluirInfoItem,
  INFO_TIPOS, INFO_TIPO_LABEL, type InfoItem, type InfoTipo,
} from '@/lib/fb/infoAdmin'
import type { Perfil } from '@/lib/fb/funcionarios'
import { Aviso, Botao, Campo, Chip, ENTRADA, Vazio } from '@/components/ui'

const ICONE: Record<InfoTipo, typeof LinkIcon> = {
  link: LinkIcon,
  planilha: FileSpreadsheet,
  texto: FileText,
  video: Video,
}

/** Converte um link de YouTube/Drive na URL de embed correspondente. */
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
  } catch {
    return url
  }
}

export function InfoAdminApp({ perfil }: { perfil: Perfil }) {
  const ehAdmin = perfil.tipo === 'admin' && perfil.ativo
  const [itens, setItens] = useState<InfoItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<InfoItem | 'novo' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  function recarregar() {
    setCarregando(true)
    listarInfoItens().then(setItens).catch(() => {}).finally(() => setCarregando(false))
  }
  // Carga inicial: não flipa o loading de forma síncrona (ele já começa true).
  useEffect(() => {
    listarInfoItens().then(setItens).catch(() => {}).finally(() => setCarregando(false))
  }, [])

  async function remover(item: InfoItem) {
    if (!confirm(`Remover “${item.titulo}”? Essa ação não pode ser desfeita.`)) return
    setErro(null)
    try {
      await excluirInfoItem(item.id, item.titulo)
      setAviso('Item removido.')
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui remover.')
    }
  }

  return (
    <div className="space-y-4">
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {aviso && !erro && <Aviso tom="sucesso">{aviso}</Aviso>}

      {ehAdmin && (
        <div className="flex justify-end">
          <Botao type="button" onClick={() => { setErro(null); setAviso(null); setEditando('novo') }}>
            <Plus size={15} aria-hidden /> Adicionar item
          </Botao>
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-tinta-3">Carregando…</p>
      ) : itens.length === 0 ? (
        <Vazio
          titulo="Nada por aqui ainda"
          descricao={ehAdmin ? 'Use “Adicionar item” para publicar links, planilhas, textos e vídeos.' : 'Em breve a equipe de Gente & Cultura vai publicar os conteúdos aqui.'}
        />
      ) : (
        <div className="space-y-3.5">
          {itens.map((item) => (
            <ItemCartao
              key={item.id}
              item={item}
              ehAdmin={ehAdmin}
              onEditar={() => { setErro(null); setAviso(null); setEditando(item) }}
              onRemover={() => remover(item)}
            />
          ))}
        </div>
      )}

      {editando && (
        <EditorItem
          item={editando === 'novo' ? null : editando}
          onFechar={() => setEditando(null)}
          onSalvo={(msg) => { setEditando(null); setAviso(msg); recarregar() }}
          setErro={setErro}
        />
      )}
    </div>
  )
}

function ItemCartao({
  item, ehAdmin, onEditar, onRemover,
}: {
  item: InfoItem
  ehAdmin: boolean
  onEditar: () => void
  onRemover: () => void
}) {
  const Icone = ICONE[item.tipo] ?? LinkIcon
  return (
    <div className="cartao-g p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-marca-clara text-marca">
          <Icone size={19} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[0.9375rem] font-semibold text-tinta">{item.titulo}</h3>
            <Chip faixa="neutro">{INFO_TIPO_LABEL[item.tipo]}</Chip>
          </div>
          {item.descricao && <p className="mt-1 text-[0.8125rem] leading-6 text-tinta-3">{item.descricao}</p>}

          {item.tipo === 'texto' && item.texto && (
            <p className="mt-2 whitespace-pre-wrap text-[0.9375rem] leading-7 text-tinta-2">{item.texto}</p>
          )}

          {item.tipo === 'video' && item.url && (
            <div className="mt-3 aspect-video overflow-hidden rounded-xl border border-borda bg-black">
              <iframe
                src={urlEmbed(item.url)}
                title={item.titulo}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {(item.tipo === 'link' || item.tipo === 'planilha') && item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-marca-texto transition-colors hover:text-marca-escura"
            >
              Abrir <ExternalLink size={14} aria-hidden />
            </a>
          )}
        </div>

        {ehAdmin && (
          <div className="flex flex-none gap-1">
            <button type="button" title="Editar" onClick={onEditar} className="rounded p-1.5 text-tinta-3 hover:bg-white hover:text-marca">
              <Pencil size={16} aria-hidden />
            </button>
            <button type="button" title="Remover" onClick={onRemover} className="rounded p-1.5 text-tinta-3 hover:bg-plano hover:text-critico">
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EditorItem({
  item, onFechar, onSalvo, setErro,
}: {
  item: InfoItem | null
  onFechar: () => void
  onSalvo: (msg: string) => void
  setErro: (s: string | null) => void
}) {
  const [tipo, setTipo] = useState<InfoTipo>(item?.tipo ?? 'link')
  const [titulo, setTitulo] = useState(item?.titulo ?? '')
  const [descricao, setDescricao] = useState(item?.descricao ?? '')
  const [url, setUrl] = useState(item?.url ?? '')
  const [texto, setTexto] = useState(item?.texto ?? '')
  const [pendente, setPendente] = useState(false)

  const ajudaUrl = useMemo(() => {
    if (tipo === 'planilha') return 'Cole o link do Google Sheets/Drive (compartilhado para quem pode ver).'
    if (tipo === 'video') return 'Cole o link do YouTube ou do Google Drive. Ele é exibido embutido na página.'
    return 'Cole o endereço completo (começando com https://).'
  }, [tipo])

  async function salvar() {
    setErro(null)
    setPendente(true)
    try {
      const dados = { tipo, titulo, descricao, url, texto }
      if (item) {
        await atualizarInfoItem(item.id, dados)
        onSalvo('Item atualizado.')
      } else {
        await criarInfoItem(dados)
        onSalvo('Item adicionado.')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui salvar.')
      setPendente(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onFechar}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="text-base font-semibold text-tinta">{item ? 'Editar item' : 'Adicionar item'}</h3>
          <button type="button" onClick={onFechar} className="rounded-lg p-1.5 text-tinta-3 hover:bg-superficie-2" aria-label="Fechar">
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <Campo rotulo="Tipo" obrigatorio>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as InfoTipo)} className={ENTRADA}>
              {INFO_TIPOS.map((t) => <option key={t} value={t}>{INFO_TIPO_LABEL[t]}</option>)}
            </select>
          </Campo>

          <Campo rotulo="Título" obrigatorio>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={ENTRADA} placeholder="Ex.: Como registrar o ponto" />
          </Campo>

          <Campo rotulo="Descrição" ajuda="Opcional — uma linha explicando o item.">
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className={ENTRADA} placeholder="Ex.: Passo a passo do relógio de ponto." />
          </Campo>

          {tipo === 'texto' ? (
            <Campo rotulo="Conteúdo" obrigatorio>
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={7} className={ENTRADA} placeholder="Escreva as orientações…" />
            </Campo>
          ) : (
            <Campo rotulo="Link" ajuda={ajudaUrl} obrigatorio>
              <input value={url} onChange={(e) => setUrl(e.target.value)} className={ENTRADA} placeholder="https://…" inputMode="url" />
            </Campo>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Botao type="button" variante="secundario" onClick={onFechar}>Cancelar</Botao>
          <Botao type="button" onClick={salvar} disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar'}</Botao>
        </div>
      </div>
    </div>
  )
}
