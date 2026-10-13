'use client'

// =============================================================
// Admin das Trilhas de Desenvolvimento (Fase 1). CRUD de trilhas e,
// dentro de cada trilha, CRUD de atividades com editor por tipo.
// =============================================================
import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, Loader2, ChevronUp, ChevronDown, Pencil, Eye, EyeOff, X, ListChecks, Image as ImageIcon, Star } from 'lucide-react'
import { Cartao, Campo, ENTRADA, Botao, Aviso, Chip } from '@/components/ui'
import {
  listarTrilhasDev, salvarTrilhaDev, excluirTrilhaDev, trilhaDevVazia,
  listarAtividades, salvarAtividade, excluirAtividade, atividadeVazia,
  TIPO_LABEL,
  type TrilhaDev, type Atividade, type TipoAtividade,
} from '@/lib/fb/trilhasDev'

export function GestaoTrilhasDev() {
  const [itens, setItens] = useState<TrilhaDev[] | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TrilhaDev | null>(null)
  const [abertaId, setAbertaId] = useState<string | null>(null)
  const [pendente, setPendente] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function carregar() { setItens(await listarTrilhasDev().catch(() => [])) }
  useEffect(() => { carregar() }, [])

  function abrir(t: TrilhaDev) { setErro(null); setAviso(null); setEditId(t.id); setDraft({ ...t }) }
  function fechar() { setEditId(null); setDraft(null) }
  function patch(p: Partial<TrilhaDev>) { setDraft((d) => (d ? { ...d, ...p } : d)) }

  async function salvar() {
    if (!draft) return
    if (!draft.titulo.trim()) { setErro('Dê um título à trilha.'); return }
    setPendente(true); setErro(null); setAviso(null)
    try {
      await salvarTrilhaDev({ ...draft, titulo: draft.titulo.trim() })
      setAviso('Trilha salva.'); fechar(); await carregar()
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não consegui salvar.') }
    setPendente(false)
  }

  function adicionar() {
    const ordem = (itens && itens.length ? Math.max(...itens.map((i) => i.ordem)) : 0) + 1
    const nova = trilhaDevVazia(ordem)
    setItens([...(itens ?? []), nova]); abrir(nova)
  }

  async function mover(t: TrilhaDev, dir: 'up' | 'down') {
    if (!itens) return
    const idx = itens.findIndex((i) => i.id === t.id); const j = dir === 'up' ? idx - 1 : idx + 1
    if (j < 0 || j >= itens.length) return
    const a = itens[idx], b = itens[j]
    await Promise.all([salvarTrilhaDev({ ...a, ordem: b.ordem }), salvarTrilhaDev({ ...b, ordem: a.ordem })]).catch(() => {})
    await carregar()
  }
  async function alternarAtiva(t: TrilhaDev) { await salvarTrilhaDev({ ...t, ativa: !t.ativa }).catch(() => {}); await carregar() }
  async function remover(t: TrilhaDev) {
    if (!confirm(`Remover a trilha "${t.titulo || 'sem título'}" e todas as suas atividades?`)) return
    await excluirTrilhaDev(t.id).catch(() => {})
    if (editId === t.id) fechar(); if (abertaId === t.id) setAbertaId(null)
    await carregar()
  }

  return (
    <Cartao titulo="Trilhas" apoio="Crie as trilhas, defina os pontos e gerencie as atividades de cada uma.">
      {aviso && <div className="mb-3"><Aviso tom="sucesso">{aviso}</Aviso></div>}
      {erro && <div className="mb-3"><Aviso tom="erro">{erro}</Aviso></div>}

      {itens === null ? (
        <p className="text-sm text-tinta-3">Carregando…</p>
      ) : (
        <div className="space-y-2">
          {itens.map((t, i) => (
            <div key={t.id} className="rounded-lg border border-borda bg-white">
              <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <span className="flex h-9 w-14 flex-none items-center justify-center overflow-hidden rounded-md bg-superficie-2">
                  {t.capa ? <img src={t.capa} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={16} className="text-tinta-3" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tinta">{t.titulo || '(sem título)'}</span>
                <Chip faixa="marca"><Star size={11} className="fill-current" aria-hidden /> {t.pontos} pts</Chip>
                <Chip faixa={t.ativa ? 'baixo' : 'neutro'}>{t.ativa ? 'Ativa' : 'Inativa'}</Chip>
                <div className="flex items-center gap-0.5">
                  <BtnIcone title="Subir" onClick={() => mover(t, 'up')} disabled={i === 0}><ChevronUp size={16} /></BtnIcone>
                  <BtnIcone title="Descer" onClick={() => mover(t, 'down')} disabled={i === itens.length - 1}><ChevronDown size={16} /></BtnIcone>
                  <BtnIcone title={t.ativa ? 'Desativar' : 'Ativar'} onClick={() => alternarAtiva(t)}>{t.ativa ? <EyeOff size={15} /> : <Eye size={15} />}</BtnIcone>
                  <BtnIcone title="Editar" onClick={() => (editId === t.id ? fechar() : abrir(t))}><Pencil size={15} /></BtnIcone>
                  <BtnIcone title="Remover" perigo onClick={() => remover(t)}><Trash2 size={15} /></BtnIcone>
                </div>
              </div>

              {editId === t.id && draft && (
                <div className="space-y-3 border-t border-borda px-3 py-3">
                  <Campo rotulo="Título"><input value={draft.titulo} onChange={(e) => patch({ titulo: e.target.value })} className={ENTRADA} placeholder="Ex.: Boas-vindas à Soulan" /></Campo>
                  <Campo rotulo="Descrição"><textarea value={draft.descricao} onChange={(e) => patch({ descricao: e.target.value })} rows={2} className={ENTRADA} /></Campo>
                  <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                    <Campo rotulo="Capa (caminho em public/)" ajuda="Ex.: /capa-trilha.jpg ou um endereço http."><input value={draft.capa} onChange={(e) => patch({ capa: e.target.value })} className={ENTRADA} placeholder="/capa-trilha.jpg" /></Campo>
                    <Campo rotulo="Pontos ao concluir"><input type="number" min={0} value={draft.pontos} onChange={(e) => patch({ pontos: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className={ENTRADA} /></Campo>
                  </div>
                  <label className="flex items-center gap-2.5 text-sm text-tinta"><input type="checkbox" checked={draft.ativa} onChange={(e) => patch({ ativa: e.target.checked })} className="h-4 w-4 accent-[var(--color-marca)]" /> Ativa (visível para os colaboradores)</label>
                  <div className="flex items-center gap-2">
                    <Botao type="button" onClick={salvar} disabled={pendente}>{pendente ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Salvando…</> : <><Save size={15} aria-hidden /> Salvar trilha</>}</Botao>
                    <button type="button" onClick={fechar} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-superficie-2"><X size={15} aria-hidden /> Cancelar</button>
                  </div>
                </div>
              )}

              {/* Atividades da trilha */}
              <div className="border-t border-borda px-3 py-2">
                <button type="button" onClick={() => setAbertaId(abertaId === t.id ? null : t.id)} className="inline-flex items-center gap-1.5 text-sm font-medium text-marca-texto hover:underline">
                  <ListChecks size={15} aria-hidden /> {abertaId === t.id ? 'Fechar atividades' : 'Gerenciar atividades'}
                </button>
                {abertaId === t.id && <div className="mt-2"><EditorAtividades trilhaId={t.id} /></div>}
              </div>
            </div>
          ))}

          <button type="button" onClick={adicionar} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-borda-forte px-3 py-2 text-sm font-medium text-tinta-2 transition-colors hover:border-marca hover:text-marca-texto">
            <Plus size={15} aria-hidden /> Adicionar trilha
          </button>
        </div>
      )}
    </Cartao>
  )
}

// -------- Atividades de uma trilha --------
function EditorAtividades({ trilhaId }: { trilhaId: string }) {
  const [itens, setItens] = useState<Atividade[] | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Atividade | null>(null)
  const [pendente, setPendente] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function carregar() { setItens(await listarAtividades(trilhaId).catch(() => [])) }
  useEffect(() => { carregar() }, [trilhaId])

  function abrir(a: Atividade) { setErro(null); setEditId(a.id); setDraft({ ...a, opcoes: [...a.opcoes], corretas: [...a.corretas], campos: [...a.campos] }) }
  function fechar() { setEditId(null); setDraft(null) }
  function patch(p: Partial<Atividade>) { setDraft((d) => (d ? { ...d, ...p } : d)) }

  async function salvar() {
    if (!draft) return
    if (!draft.titulo.trim()) { setErro('Dê um título à atividade.'); return }
    setPendente(true); setErro(null)
    try { await salvarAtividade(trilhaId, draft); fechar(); await carregar() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não consegui salvar a atividade.') }
    setPendente(false)
  }

  function adicionar() {
    const ordem = (itens && itens.length ? Math.max(...itens.map((i) => i.ordem)) : 0) + 1
    const nova = atividadeVazia(ordem, 'assinalar')
    setItens([...(itens ?? []), nova]); abrir(nova)
  }
  async function mover(a: Atividade, dir: 'up' | 'down') {
    if (!itens) return
    const idx = itens.findIndex((i) => i.id === a.id); const j = dir === 'up' ? idx - 1 : idx + 1
    if (j < 0 || j >= itens.length) return
    const x = itens[idx], y = itens[j]
    await Promise.all([salvarAtividade(trilhaId, { ...x, ordem: y.ordem }), salvarAtividade(trilhaId, { ...y, ordem: x.ordem })]).catch(() => {})
    await carregar()
  }
  async function remover(a: Atividade) {
    if (!confirm(`Remover a atividade "${a.titulo || 'sem título'}"?`)) return
    await excluirAtividade(trilhaId, a.id).catch(() => {})
    if (editId === a.id) fechar()
    await carregar()
  }

  if (itens === null) return <p className="text-sm text-tinta-3">Carregando atividades…</p>

  return (
    <div className="space-y-2 rounded-lg bg-superficie-2 p-2.5">
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {itens.length === 0 && <p className="px-1 text-xs text-tinta-3">Nenhuma atividade ainda.</p>}
      {itens.map((a, i) => (
        <div key={a.id} className="rounded-lg border border-borda bg-white">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-marca-clara text-xs font-bold text-marca-texto">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-tinta">{a.titulo || '(sem título)'}</span>
            <Chip faixa="neutro">{a.tipo === 'assinalar' ? 'Assinalar' : a.tipo === 'responder' ? 'Responder' : 'Listar'}</Chip>
            <div className="flex items-center gap-0.5">
              <BtnIcone title="Subir" onClick={() => mover(a, 'up')} disabled={i === 0}><ChevronUp size={15} /></BtnIcone>
              <BtnIcone title="Descer" onClick={() => mover(a, 'down')} disabled={i === itens.length - 1}><ChevronDown size={15} /></BtnIcone>
              <BtnIcone title="Editar" onClick={() => (editId === a.id ? fechar() : abrir(a))}><Pencil size={14} /></BtnIcone>
              <BtnIcone title="Remover" perigo onClick={() => remover(a)}><Trash2 size={14} /></BtnIcone>
            </div>
          </div>
          {editId === a.id && draft && (
            <div className="space-y-3 border-t border-borda px-3 py-3">
              <Campo rotulo="Tipo de atividade">
                <select value={draft.tipo} onChange={(e) => patch({ tipo: e.target.value as TipoAtividade })} className={ENTRADA}>
                  {(['assinalar', 'responder', 'listar'] as TipoAtividade[]).map((tp) => <option key={tp} value={tp}>{TIPO_LABEL[tp]}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Título"><input value={draft.titulo} onChange={(e) => patch({ titulo: e.target.value })} className={ENTRADA} placeholder="Ex.: Nossos valores" /></Campo>
              <Campo rotulo="Enunciado"><textarea value={draft.enunciado} onChange={(e) => patch({ enunciado: e.target.value })} rows={2} className={ENTRADA} placeholder="O que a pessoa deve fazer." /></Campo>
              <Campo rotulo="Imagem (opcional, caminho em public/)"><input value={draft.imagem} onChange={(e) => patch({ imagem: e.target.value })} className={ENTRADA} placeholder="/pergunta.jpg" /></Campo>

              {draft.tipo === 'assinalar' && <EditorAssinalar draft={draft} patch={patch} />}
              {draft.tipo === 'responder' && <p className="rounded-lg bg-superficie-2 px-3 py-2 text-xs text-tinta-3">Resposta aberta em texto. Por ora a resposta é apenas registrada (sem correção automática).</p>}
              {draft.tipo === 'listar' && <EditorListar draft={draft} patch={patch} />}

              <div className="flex items-center gap-2">
                <Botao type="button" onClick={salvar} disabled={pendente}>{pendente ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Salvando…</> : <><Save size={15} aria-hidden /> Salvar atividade</>}</Botao>
                <button type="button" onClick={fechar} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-superficie-2"><X size={15} aria-hidden /> Cancelar</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button type="button" onClick={adicionar} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-borda-forte px-3 py-1.5 text-xs font-medium text-tinta-2 transition-colors hover:border-marca hover:text-marca-texto">
        <Plus size={14} aria-hidden /> Adicionar atividade
      </button>
    </div>
  )
}

function EditorAssinalar({ draft, patch }: { draft: Atividade; patch: (p: Partial<Atividade>) => void }) {
  function setOpcao(i: number, v: string) { patch({ opcoes: draft.opcoes.map((o, j) => (j === i ? v : o)) }) }
  function addOpcao() { patch({ opcoes: [...draft.opcoes, ''] }) }
  function removeOpcao(i: number) {
    patch({
      opcoes: draft.opcoes.filter((_, j) => j !== i),
      corretas: draft.corretas.filter((c) => c !== i).map((c) => (c > i ? c - 1 : c)),
    })
  }
  function toggleCorreta(i: number) {
    patch({ corretas: draft.corretas.includes(i) ? draft.corretas.filter((c) => c !== i) : [...draft.corretas, i] })
  }
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-tinta-2">Opções (marque a correta; pode marcar mais de uma)</p>
      <div className="space-y-2">
        {draft.opcoes.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="checkbox" checked={draft.corretas.includes(i)} onChange={() => toggleCorreta(i)} title="Correta" className="h-4 w-4 flex-none accent-[var(--color-marca)]" />
            <input value={o} onChange={(e) => setOpcao(i, e.target.value)} className={ENTRADA} placeholder={`Opção ${i + 1}`} />
            <button type="button" onClick={() => removeOpcao(i)} title="Remover opção" className="rounded p-1.5 text-tinta-3 hover:bg-plano hover:text-critico"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addOpcao} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-borda-forte px-2.5 py-1.5 text-xs font-medium text-tinta-2 hover:border-marca hover:text-marca-texto"><Plus size={13} aria-hidden /> Adicionar opção</button>
    </div>
  )
}

function EditorListar({ draft, patch }: { draft: Atividade; patch: (p: Partial<Atividade>) => void }) {
  function setCampo(i: number, v: string) { patch({ campos: draft.campos.map((c, j) => (j === i ? v : c)) }) }
  function addCampo() { patch({ campos: [...draft.campos, ''] }) }
  function removeCampo(i: number) { patch({ campos: draft.campos.filter((_, j) => j !== i) }) }
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-tinta-2">Campos para a pessoa preencher</p>
      <div className="space-y-2">
        {draft.campos.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={c} onChange={(e) => setCampo(i, e.target.value)} className={ENTRADA} placeholder={`Campo ${i + 1} (ex.: Meta do mês)`} />
            <button type="button" onClick={() => removeCampo(i)} title="Remover campo" className="rounded p-1.5 text-tinta-3 hover:bg-plano hover:text-critico"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addCampo} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-borda-forte px-2.5 py-1.5 text-xs font-medium text-tinta-2 hover:border-marca hover:text-marca-texto"><Plus size={13} aria-hidden /> Adicionar campo</button>
    </div>
  )
}

function BtnIcone({ children, title, onClick, disabled, perigo }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean; perigo?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled} className={`rounded p-1.5 text-tinta-3 transition-colors disabled:opacity-30 ${perigo ? 'hover:bg-plano hover:text-critico' : 'hover:bg-superficie-2 hover:text-tinta'}`}>{children}</button>
  )
}
