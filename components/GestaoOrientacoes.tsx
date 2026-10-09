'use client'

// =============================================================
// Admin da seção "Qual solicitação você deseja realizar?".
// Lista, adiciona, edita, reordena e ativa/desativa os itens
// (coleção orientacao_solicitacoes). Cada item tem visibilidade
// 'todos' ou 'gestores_admin'.
// =============================================================
import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, Loader2, ChevronUp, ChevronDown, Pencil, Eye, EyeOff, X } from 'lucide-react'
import { Cartao, Campo, ENTRADA, Botao, Aviso, Chip } from '@/components/ui'
import {
  listarOrientacoes,
  semearOrientacoes,
  salvarOrientacao,
  excluirOrientacao,
  orientacaoVazia,
  type OrientacaoDoc,
} from '@/lib/fb/orientacoes'

export function GestaoOrientacoes() {
  const [itens, setItens] = useState<OrientacaoDoc[] | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<OrientacaoDoc | null>(null)
  const [pendente, setPendente] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function carregar() {
    let lista = await listarOrientacoes().catch(() => [])
    if (lista.length === 0) {
      await semearOrientacoes().catch(() => {})
      lista = await listarOrientacoes().catch(() => [])
    }
    setItens(lista)
  }
  useEffect(() => { carregar() }, [])

  function abrirEdicao(o: OrientacaoDoc) {
    setErro(null); setAviso(null)
    setEditId(o.id)
    setDraft({ ...o, corpo: [...o.corpo], passos: [...o.passos] })
  }
  function fecharEdicao() { setEditId(null); setDraft(null) }
  function patch(p: Partial<OrientacaoDoc>) { setDraft((d) => (d ? { ...d, ...p } : d)) }

  async function salvarItem() {
    if (!draft) return
    if (!draft.titulo.trim()) { setErro('Dê um título ao item.'); return }
    setPendente(true); setErro(null); setAviso(null)
    try {
      const limpo: OrientacaoDoc = {
        ...draft,
        emoji: draft.emoji.trim() || '📝',
        titulo: draft.titulo.trim(),
        email: draft.email.trim(),
        assunto: draft.assunto.trim(),
        observacao: draft.observacao.trim(),
        corpo: draft.corpo.map((s) => s.trimEnd()).filter((s) => s.trim() !== ''),
        passos: draft.passos.map((s) => s.trimEnd()).filter((s) => s.trim() !== ''),
        doc_rotulo: draft.doc_rotulo.trim(),
        doc_href: draft.doc_href.trim(),
        doc_instrucao: draft.doc_instrucao.trim(),
      }
      await salvarOrientacao(limpo)
      setAviso('Item salvo. Já aparece na página pública.')
      fecharEdicao()
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui salvar o item.')
    }
    setPendente(false)
  }

  function adicionar() {
    const ordem = (itens && itens.length ? Math.max(...itens.map((i) => i.ordem)) : 0) + 1
    const novo = orientacaoVazia(ordem)
    setItens([...(itens ?? []), novo])
    abrirEdicao(novo)
  }

  async function mover(o: OrientacaoDoc, dir: 'up' | 'down') {
    if (!itens) return
    const idx = itens.findIndex((i) => i.id === o.id)
    const j = dir === 'up' ? idx - 1 : idx + 1
    if (j < 0 || j >= itens.length) return
    const a = itens[idx], b = itens[j]
    await Promise.all([
      salvarOrientacao({ ...a, ordem: b.ordem }),
      salvarOrientacao({ ...b, ordem: a.ordem }),
    ]).catch(() => {})
    await carregar()
  }

  async function alternarAtivo(o: OrientacaoDoc) {
    await salvarOrientacao({ ...o, ativo: !o.ativo }).catch(() => {})
    await carregar()
  }

  async function remover(o: OrientacaoDoc) {
    if (!confirm(`Remover "${o.titulo || 'este item'}"?`)) return
    await excluirOrientacao(o.id).catch(() => {})
    if (editId === o.id) fecharEdicao()
    await carregar()
  }

  return (
    <Cartao
      titulo="Qual solicitação você deseja realizar?"
      apoio="Itens da seção de solicitações. Cada mudança é salva por item (botão Salvar item) e aparece na hora."
    >
      {aviso && <div className="mb-3"><Aviso tom="sucesso">{aviso}</Aviso></div>}
      {erro && <div className="mb-3"><Aviso tom="erro">{erro}</Aviso></div>}

      {itens === null ? (
        <p className="text-sm text-tinta-3">Carregando…</p>
      ) : (
        <div className="space-y-2">
          {itens.map((o, i) => (
            <div key={o.id} className="rounded-lg border border-borda bg-white">
              {/* Cabeçalho do item */}
              <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <span className="text-lg leading-none" aria-hidden>{o.emoji}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tinta">{o.titulo || '(novo item)'}</span>
                <Chip faixa={o.visibilidade === 'gestores_admin' ? 'marca' : 'neutro'}>
                  {o.visibilidade === 'gestores_admin' ? 'Gestores e admins' : 'Todos'}
                </Chip>
                <Chip faixa={o.ativo ? 'baixo' : 'neutro'}>{o.ativo ? 'Ativo' : 'Inativo'}</Chip>
                <div className="flex items-center gap-0.5">
                  <BtnIcone title="Subir" onClick={() => mover(o, 'up')} disabled={i === 0}><ChevronUp size={16} /></BtnIcone>
                  <BtnIcone title="Descer" onClick={() => mover(o, 'down')} disabled={i === itens.length - 1}><ChevronDown size={16} /></BtnIcone>
                  <BtnIcone title={o.ativo ? 'Desativar' : 'Ativar'} onClick={() => alternarAtivo(o)}>{o.ativo ? <EyeOff size={15} /> : <Eye size={15} />}</BtnIcone>
                  <BtnIcone title="Editar" onClick={() => (editId === o.id ? fecharEdicao() : abrirEdicao(o))}><Pencil size={15} /></BtnIcone>
                  <BtnIcone title="Remover" perigo onClick={() => remover(o)}><Trash2 size={15} /></BtnIcone>
                </div>
              </div>

              {/* Formulário de edição */}
              {editId === o.id && draft && (
                <div className="space-y-3 border-t border-borda px-3 py-3">
                  <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
                    <Campo rotulo="Ícone (emoji)">
                      <input value={draft.emoji} onChange={(e) => patch({ emoji: e.target.value })} className={ENTRADA} maxLength={4} />
                    </Campo>
                    <Campo rotulo="Título">
                      <input value={draft.titulo} onChange={(e) => patch({ titulo: e.target.value })} className={ENTRADA} placeholder="Ex.: Cadastro de Uber" />
                    </Campo>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Campo rotulo="E-mail de contato">
                      <input value={draft.email} onChange={(e) => patch({ email: e.target.value })} className={ENTRADA} inputMode="email" placeholder="exemplo@soulan.com.br" />
                    </Campo>
                    <Campo rotulo="Assunto do e-mail">
                      <input value={draft.assunto} onChange={(e) => patch({ assunto: e.target.value })} className={ENTRADA} placeholder="Ex.: Cadastro Uber" />
                    </Campo>
                  </div>
                  <Campo rotulo="Campos do corpo (um por linha)" ajuda="Rótulos pré-preenchidos no e-mail. Ex.: Nome completo:">
                    <textarea value={draft.corpo.join('\n')} onChange={(e) => patch({ corpo: e.target.value.split('\n') })} rows={3} className={ENTRADA} />
                  </Campo>
                  <Campo rotulo="Como pedir — passos (um por linha)">
                    <textarea value={draft.passos.join('\n')} onChange={(e) => patch({ passos: e.target.value.split('\n') })} rows={4} className={ENTRADA} />
                  </Campo>
                  <Campo rotulo="Observação (opcional)" ajuda="Aparece como um aviso de Atenção.">
                    <textarea value={draft.observacao} onChange={(e) => patch({ observacao: e.target.value })} rows={2} className={ENTRADA} />
                  </Campo>

                  {/* Documento */}
                  <div className="rounded-lg border border-borda bg-superficie-2 p-3">
                    <p className="mb-2 text-xs font-semibold text-tinta-2">Documento (opcional)</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Campo rotulo="Rótulo do botão">
                        <input value={draft.doc_rotulo} onChange={(e) => patch({ doc_rotulo: e.target.value })} className={ENTRADA} placeholder="Ex.: Baixar formulário" />
                      </Campo>
                      <Campo rotulo="Caminho do arquivo" ajuda="Coloque o arquivo em public/docs e use o caminho /docs/arquivo.docx">
                        <input value={draft.doc_href} onChange={(e) => patch({ doc_href: e.target.value })} className={ENTRADA} placeholder="/docs/arquivo.docx" />
                      </Campo>
                    </div>
                    <div className="mt-3">
                      <Campo rotulo="Instrução do documento">
                        <input value={draft.doc_instrucao} onChange={(e) => patch({ doc_instrucao: e.target.value })} className={ENTRADA} placeholder="Ex.: Preencha e anexe ao e-mail." />
                      </Campo>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Campo rotulo="Visível para">
                      <select value={draft.visibilidade} onChange={(e) => patch({ visibilidade: e.target.value === 'gestores_admin' ? 'gestores_admin' : 'todos' })} className={ENTRADA}>
                        <option value="todos">Todos</option>
                        <option value="gestores_admin">Somente gestores e admins</option>
                      </select>
                    </Campo>
                    <label className="flex items-center gap-2.5 self-end pb-2.5">
                      <input type="checkbox" checked={draft.ativo} onChange={(e) => patch({ ativo: e.target.checked })} className="h-4 w-4 accent-marca" />
                      <span className="text-sm text-tinta">Ativo (aparece na página)</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Botao type="button" onClick={salvarItem} disabled={pendente}>
                      {pendente ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Salvando…</> : <><Save size={15} aria-hidden /> Salvar item</>}
                    </Botao>
                    <button type="button" onClick={fecharEdicao} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-superficie-2">
                      <X size={15} aria-hidden /> Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button type="button" onClick={adicionar} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-borda-forte px-3 py-2 text-sm font-medium text-tinta-2 transition-colors hover:border-marca hover:text-marca-texto">
            <Plus size={15} aria-hidden /> Adicionar solicitação
          </button>
        </div>
      )}
    </Cartao>
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
