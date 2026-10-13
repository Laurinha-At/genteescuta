'use client'

// =============================================================
// Admin do carrossel da home (Conteúdo do site): configurações gerais
// (ligar/desligar, autoplay, velocidade, pausar no hover) e a lista de
// slides (adicionar, editar, reordenar, ativar/desativar, remover).
// =============================================================
import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, Loader2, ChevronUp, ChevronDown, Pencil, Eye, EyeOff, X, Star, Image as ImageIcon } from 'lucide-react'
import { Cartao, Campo, ENTRADA, Botao, Aviso, Chip } from '@/components/ui'
import {
  getCarrosselConfig,
  salvarCarrosselConfig,
  limitarVelocidade,
  listarSlides,
  semearSlidesSePreciso,
  salvarSlide,
  excluirSlide,
  slideVazio,
  CARROSSEL_CONFIG_PADRAO,
  type CarrosselConfig,
  type SlideCarrossel,
} from '@/lib/fb/carrossel'

export function GestaoCarrossel() {
  return (
    <>
      <ConfigCarrossel />
      <SlidesCarrossel />
    </>
  )
}

// -------- Configurações gerais --------
function ConfigCarrossel() {
  const [cfg, setCfg] = useState<CarrosselConfig | null>(null)
  const [pendente, setPendente] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => { getCarrosselConfig().then(setCfg).catch(() => setCfg({ ...CARROSSEL_CONFIG_PADRAO })) }, [])
  function patch(p: Partial<CarrosselConfig>) { setCfg((c) => (c ? { ...c, ...p } : c)) }

  async function salvar() {
    if (!cfg) return
    setPendente(true); setErro(null); setAviso(null)
    try {
      await salvarCarrosselConfig(cfg)
      setAviso('Configurações do carrossel salvas. Já valem na home.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui salvar.')
    }
    setPendente(false)
  }

  return (
    <Cartao titulo="Carrossel" apoio="Ligar/desligar, passagem automática, velocidade e pausa no hover.">
      {aviso && <div className="mb-3"><Aviso tom="sucesso">{aviso}</Aviso></div>}
      {erro && <div className="mb-3"><Aviso tom="erro">{erro}</Aviso></div>}
      {!cfg ? (
        <p className="text-sm text-tinta-3">Carregando…</p>
      ) : (
        <div className="space-y-4">
          <Alternador titulo="Mostrar o carrossel na home" apoio="Se desligado, o carrossel não aparece para ninguém." on={cfg.ativo} onChange={(v) => patch({ ativo: v })} />
          <Alternador titulo="Passagem automática (autoplay)" apoio="Troca os slides sozinho." on={cfg.autoplay} onChange={(v) => patch({ autoplay: v })} />
          <Alternador titulo="Pausar quando o mouse passa por cima" apoio="Mantém o slide enquanto a pessoa está lendo." on={cfg.pausar_hover} onChange={(v) => patch({ pausar_hover: v })} />

          <div className="rounded-lg border border-borda bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-tinta">Tempo em cada slide</span>
              <span className="text-sm font-semibold text-marca-texto tabular">{cfg.velocidade_s}s</span>
            </div>
            <input
              type="range" min={3} max={12} step={1}
              value={cfg.velocidade_s}
              onChange={(e) => patch({ velocidade_s: limitarVelocidade(e.target.value) })}
              className="mt-2 w-full accent-[var(--color-marca)]"
              aria-label="Tempo em cada slide (segundos)"
            />
            <div className="mt-1 flex justify-between text-[0.6875rem] text-tinta-3"><span>3s</span><span>12s</span></div>
          </div>

          <div className="flex justify-end">
            <Botao type="button" onClick={salvar} disabled={pendente}>
              {pendente ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Salvando…</> : <><Save size={15} aria-hidden /> Salvar configurações</>}
            </Botao>
          </div>
        </div>
      )}
    </Cartao>
  )
}

function Alternador({ titulo, apoio, on, onChange }: { titulo: string; apoio: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-borda bg-white px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-tinta">{titulo}</span>
        <span className="block text-xs text-tinta-3">{apoio}</span>
      </span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 flex-none accent-[var(--color-marca)]" />
    </label>
  )
}

// -------- Lista de slides --------
function SlidesCarrossel() {
  const [itens, setItens] = useState<SlideCarrossel[] | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<SlideCarrossel | null>(null)
  const [pendente, setPendente] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function carregar() {
    let lista = await listarSlides().catch(() => [])
    if (lista.length === 0) {
      await semearSlidesSePreciso().catch(() => {})
      lista = await listarSlides().catch(() => [])
    }
    setItens(lista)
  }
  useEffect(() => { carregar() }, [])

  function abrir(s: SlideCarrossel) { setErro(null); setAviso(null); setEditId(s.id); setDraft({ ...s }) }
  function fechar() { setEditId(null); setDraft(null) }
  function patch(p: Partial<SlideCarrossel>) { setDraft((d) => (d ? { ...d, ...p } : d)) }

  async function salvarItem() {
    if (!draft) return
    if (!draft.titulo.trim()) { setErro('Dê um título ao slide.'); return }
    setPendente(true); setErro(null); setAviso(null)
    try {
      await salvarSlide({ ...draft, titulo: draft.titulo.trim(), texto: draft.texto.trim(), imagem: draft.imagem.trim(), link: draft.link.trim() })
      setAviso('Slide salvo. Já aparece na home.')
      fechar(); await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui salvar o slide.')
    }
    setPendente(false)
  }

  function adicionar() {
    const ordem = (itens && itens.length ? Math.max(...itens.map((i) => i.ordem)) : 0) + 1
    const novo = slideVazio(ordem)
    setItens([...(itens ?? []), novo])
    abrir(novo)
  }

  async function mover(s: SlideCarrossel, dir: 'up' | 'down') {
    if (!itens) return
    const idx = itens.findIndex((i) => i.id === s.id)
    const j = dir === 'up' ? idx - 1 : idx + 1
    if (j < 0 || j >= itens.length) return
    const a = itens[idx], b = itens[j]
    await Promise.all([salvarSlide({ ...a, ordem: b.ordem }), salvarSlide({ ...b, ordem: a.ordem })]).catch(() => {})
    await carregar()
  }

  async function alternarAtivo(s: SlideCarrossel) {
    await salvarSlide({ ...s, ativo: !s.ativo }).catch(() => {})
    await carregar()
  }

  async function remover(s: SlideCarrossel) {
    if (!confirm(`Remover o slide "${s.titulo || 'sem título'}"?`)) return
    await excluirSlide(s.id).catch(() => {})
    if (editId === s.id) fechar()
    await carregar()
  }

  return (
    <Cartao titulo="Informações (slides)" apoio="Cada mudança é salva por slide e aparece na hora. Imagem: use um caminho de arquivo em public/ (ex.: /capa-soulan.png).">
      {aviso && <div className="mb-3"><Aviso tom="sucesso">{aviso}</Aviso></div>}
      {erro && <div className="mb-3"><Aviso tom="erro">{erro}</Aviso></div>}

      {itens === null ? (
        <p className="text-sm text-tinta-3">Carregando…</p>
      ) : (
        <div className="space-y-2">
          {itens.map((s, i) => (
            <div key={s.id} className="rounded-lg border border-borda bg-white">
              <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <span className="flex h-9 w-14 flex-none items-center justify-center overflow-hidden rounded-md bg-superficie-2">
                  {s.imagem ? <img src={s.imagem} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={16} className="text-tinta-3" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tinta">{s.titulo || '(sem título)'}</span>
                {s.destaque && <Chip faixa="marca"><Star size={11} className="fill-current" aria-hidden /> Destaque</Chip>}
                <Chip faixa={s.ativo ? 'baixo' : 'neutro'}>{s.ativo ? 'Ativo' : 'Inativo'}</Chip>
                <div className="flex items-center gap-0.5">
                  <BtnIcone title="Subir" onClick={() => mover(s, 'up')} disabled={i === 0}><ChevronUp size={16} /></BtnIcone>
                  <BtnIcone title="Descer" onClick={() => mover(s, 'down')} disabled={i === itens.length - 1}><ChevronDown size={16} /></BtnIcone>
                  <BtnIcone title={s.ativo ? 'Desativar' : 'Ativar'} onClick={() => alternarAtivo(s)}>{s.ativo ? <EyeOff size={15} /> : <Eye size={15} />}</BtnIcone>
                  <BtnIcone title="Editar" onClick={() => (editId === s.id ? fechar() : abrir(s))}><Pencil size={15} /></BtnIcone>
                  <BtnIcone title="Remover" perigo onClick={() => remover(s)}><Trash2 size={15} /></BtnIcone>
                </div>
              </div>

              {editId === s.id && draft && (
                <div className="space-y-3 border-t border-borda px-3 py-3">
                  <Campo rotulo="Imagem (caminho em public/)" ajuda="Coloque a imagem na pasta public e use o caminho, ex.: /capa-soulan.png. Também aceita um endereço http.">
                    <input value={draft.imagem} onChange={(e) => patch({ imagem: e.target.value })} className={ENTRADA} placeholder="/minha-imagem.jpg" />
                  </Campo>
                  {draft.imagem && (
                    <div className="overflow-hidden rounded-lg border border-borda">
                      <img src={draft.imagem} alt="Prévia" className="h-32 w-full object-cover" />
                    </div>
                  )}
                  <Campo rotulo="Título">
                    <input value={draft.titulo} onChange={(e) => patch({ titulo: e.target.value })} className={ENTRADA} placeholder="Ex.: Campanha de vacinação" />
                  </Campo>
                  <Campo rotulo="Texto / descrição">
                    <textarea value={draft.texto} onChange={(e) => patch({ texto: e.target.value })} rows={2} className={ENTRADA} />
                  </Campo>
                  <Campo rotulo="Link (opcional)" ajuda="Para onde o slide leva ao clicar. Ex.: /mural ou um endereço http.">
                    <input value={draft.link} onChange={(e) => patch({ link: e.target.value })} className={ENTRADA} placeholder="/mural" />
                  </Campo>
                  <Campo rotulo="Cor do card" ajuda="Cor de fundo do slide na home (usada quando não há imagem). O texto ajusta o contraste automaticamente.">
                    <SeletorCor valor={draft.cor} onChange={(c) => patch({ cor: c })} />
                  </Campo>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2.5 text-sm text-tinta">
                      <input type="checkbox" checked={draft.destaque} onChange={(e) => patch({ destaque: e.target.checked })} className="h-4 w-4 accent-[var(--color-marca)]" /> Destaque (mostra o selo)
                    </label>
                    <label className="flex items-center gap-2.5 text-sm text-tinta">
                      <input type="checkbox" checked={draft.ativo} onChange={(e) => patch({ ativo: e.target.checked })} className="h-4 w-4 accent-[var(--color-marca)]" /> Ativo (aparece na home)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Botao type="button" onClick={salvarItem} disabled={pendente}>
                      {pendente ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Salvando…</> : <><Save size={15} aria-hidden /> Salvar slide</>}
                    </Botao>
                    <button type="button" onClick={fechar} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-superficie-2">
                      <X size={15} aria-hidden /> Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button type="button" onClick={adicionar} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-borda-forte px-3 py-2 text-sm font-medium text-tinta-2 transition-colors hover:border-marca hover:text-marca-texto">
            <Plus size={15} aria-hidden /> Adicionar slide
          </button>
        </div>
      )}
    </Cartao>
  )
}

// Cores da identidade Soulan (atalho rápido).
const CORES_SOULAN: { nome: string; hex: string }[] = [
  { nome: 'Azul médio', hex: '#1A4895' },
  { nome: 'Azul escuro', hex: '#002443' },
  { nome: 'Azul claro', hex: '#59A4D8' },
  { nome: 'Azul suave', hex: '#BFD7EA' },
  { nome: 'Verde', hex: '#AAD12F' },
  { nome: 'Verde claro', hex: '#E8F9A0' },
  { nome: 'Verde água', hex: '#89D5C9' },
  { nome: 'Coral', hex: '#FF8864' },
  { nome: 'Bege', hex: '#EFDCBD' },
]

function SeletorCor({ valor, onChange }: { valor: string; onChange: (c: string) => void }) {
  const atual = /^#[0-9a-f]{6}$/i.test(valor) ? valor : ''
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {CORES_SOULAN.map((c) => {
          const on = atual.toLowerCase() === c.hex.toLowerCase()
          return (
            <button
              key={c.hex}
              type="button"
              onClick={() => onChange(c.hex)}
              title={c.nome}
              aria-label={c.nome}
              aria-pressed={on}
              className={`h-7 w-7 rounded-full border transition-transform hover:scale-110 ${on ? 'ring-2 ring-marca ring-offset-2' : 'border-black/10'}`}
              style={{ background: c.hex }}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-tinta-2">
          Outra cor
          <input type="color" value={atual || '#1a4895'} onChange={(e) => onChange(e.target.value)} className="h-7 w-10 cursor-pointer rounded border border-borda-forte bg-white p-0.5" />
        </label>
        {atual && (
          <>
            <span className="rounded bg-superficie-2 px-2 py-1 text-xs font-medium text-tinta-2 tabular">{atual.toUpperCase()}</span>
            <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-1 text-xs font-medium text-tinta-3 hover:text-critico">
              <X size={12} aria-hidden /> Limpar (usar degradê padrão)
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function BtnIcone({ children, title, onClick, disabled, perigo }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean; perigo?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded p-1.5 text-tinta-3 transition-colors disabled:opacity-30 ${perigo ? 'hover:bg-plano hover:text-critico' : 'hover:bg-superficie-2 hover:text-tinta'}`}
    >
      {children}
    </button>
  )
}
