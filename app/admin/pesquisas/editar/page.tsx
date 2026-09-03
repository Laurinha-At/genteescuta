'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronUp, ChevronDown, Plus, Trash2, Save, Lock } from 'lucide-react'
import { getPesquisa, contarRespostas, salvarPesquisa, salvarEstrutura } from '@/lib/fb/admin'
import { ESCALA_CONCORDANCIA, ESCALA_FREQUENCIA, ROTULO_DIMENSAO } from '@/lib/nr1-template'
import { BotaoLink, CabecalhoPagina, Cartao, Chip, Aviso, Botao, Campo, ENTRADA } from '@/components/ui'
import type { PerguntaTipo } from '@/lib/types'

const ROTULO_TIPO: Record<PerguntaTipo, string> = {
  likert5: 'Escala de 1 a 5', enps: 'eNPS (0 a 10)', nota10: 'Nota de 0 a 10',
  escolha_unica: 'Escolha única', escolha_multipla: 'Múltipla escolha',
  texto: 'Texto curto', texto_longo: 'Texto livre', sim_nao: 'Sim ou não',
}

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= arr.length) return arr
  const c = [...arr]
  ;[c[i], c[j]] = [c[j], c[i]]
  return c
}

function Editor() {
  const params = useSearchParams()
  const id = params.get('id') ?? ''
  const [p, setP] = useState<any>(null)
  const [secoes, setSecoes] = useState<any[]>([])
  const [perguntas, setPerguntas] = useState<any[]>([])
  const [travado, setTravado] = useState(false)
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'nao'>('carregando')
  const [salvo, setSalvo] = useState(false)
  const [pendente, setPendente] = useState(false)

  useEffect(() => {
    if (!id) return setEstado('nao')
    getPesquisa(id).then(async (d) => {
      if (!d) return setEstado('nao')
      setP(d)
      setSecoes((d.secoes ?? []).slice().sort((a: any, b: any) => a.ordem - b.ordem))
      setPerguntas((d.perguntas ?? []).slice().sort((a: any, b: any) => a.ordem - b.ordem))
      setEstado('ok')
      setTravado((await contarRespostas(id)) > 0)
    }).catch(() => setEstado('nao'))
  }, [id])

  if (estado === 'carregando') return <div className="p-6 text-sm text-tinta-3">Carregando…</div>
  if (estado === 'nao' || !p) return <CabecalhoPagina titulo="Pesquisa não encontrada" voltar={{ href: '/admin/pesquisas', rotulo: 'Voltar' }} />

  function reordenar(sec: any[], perg: any[]) {
    sec.forEach((s, i) => (s.ordem = i))
    perg.forEach((q, i) => (q.ordem = i))
    setSecoes([...sec])
    setPerguntas([...perg])
  }

  async function salvarConfig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPendente(true); setSalvo(false)
    const f = new FormData(e.currentTarget)
    await salvarPesquisa(id, {
      titulo: String(f.get('titulo') ?? ''),
      descricao: String(f.get('descricao') ?? ''),
      identificacao: String(f.get('identificacao') ?? 'confidencial'),
      publico_alvo: String(f.get('publico_alvo') ?? ''),
      fecha_em: String(f.get('fecha_em') ?? ''),
      min_grupo: String(f.get('min_grupo') ?? '5'),
    })
    setSalvo(true); setPendente(false)
  }

  async function persistirEstrutura() {
    setPendente(true)
    await salvarEstrutura(id, secoes, perguntas)
    setSalvo(true); setPendente(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function novaSecao() {
    const s = { id: `s${Date.now()}`, titulo: 'Nova seção', descricao: null, dimensao: null, ordem: secoes.length }
    setSecoes([...secoes, s])
  }
  function novaPergunta(secaoId: string) {
    const q = { id: `q${Date.now()}`, secao_id: secaoId, enunciado: 'Nova pergunta', ajuda: null, tipo: 'likert5', opcoes: ESCALA_FREQUENCIA, obrigatoria: true, invertida: false, critica: false, segmentacao: null, ordem: perguntas.length }
    setPerguntas([...perguntas, q])
  }
  function editarPergunta(qid: string, campos: any) {
    setPerguntas(perguntas.map((q) => (q.id === qid ? { ...q, ...campos } : q)))
  }
  function editarSecao(sid: string, campos: any) {
    setSecoes(secoes.map((s) => (s.id === sid ? { ...s, ...campos } : s)))
  }

  const prazo = p.fecha_em ? p.fecha_em.slice(0, 10) : ''

  return (
    <>
      <CabecalhoPagina
        titulo="Editar pesquisa"
        voltar={{ href: `/admin/pesquisas/ver?id=${id}`, rotulo: 'Voltar à pesquisa' }}
        descricao={p.titulo}
        acoes={<Botao type="button" disabled={pendente} onClick={persistirEstrutura}><Save size={15} aria-hidden /> {pendente ? 'Salvando…' : 'Salvar estrutura'}</Botao>}
      />

      <div className="max-w-4xl space-y-4 p-4 sm:p-6">
        {salvo && <Aviso tom="sucesso">Alterações salvas.</Aviso>}
        {travado && (
          <Aviso tom="alerta" titulo="Esta pesquisa já tem respostas">
            Você pode corrigir textos, mas <strong>excluir</strong> perguntas e seções fica bloqueado — as respostas já dadas seriam apagadas junto. Para mudar o instrumento, crie uma nova pesquisa.
          </Aviso>
        )}

        <Cartao titulo="Configurações da pesquisa">
          <form onSubmit={salvarConfig} className="space-y-4">
            <Campo rotulo="Título" obrigatorio><input name="titulo" defaultValue={p.titulo} required className={ENTRADA} /></Campo>
            <Campo rotulo="Mensagem de abertura"><textarea name="descricao" rows={3} defaultValue={p.descricao ?? ''} className={ENTRADA} /></Campo>
            <Campo rotulo="Como as pessoas se identificam">
              <select name="identificacao" defaultValue={p.identificacao} className={ENTRADA}>
                <option value="confidencial">Confidencial</option>
                <option value="identificada">Identificada</option>
                <option value="anonima">Anônima</option>
              </select>
            </Campo>
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo rotulo="Pessoas convidadas"><input name="publico_alvo" type="number" min={1} defaultValue={p.publico_alvo ?? ''} className={ENTRADA} /></Campo>
              <Campo rotulo="Prazo final"><input name="fecha_em" type="date" defaultValue={prazo} className={ENTRADA} /></Campo>
              <Campo rotulo="Grupo mínimo"><input name="min_grupo" type="number" min={1} defaultValue={p.min_grupo} className={ENTRADA} /></Campo>
            </div>
            <Botao type="submit" disabled={pendente}><Save size={15} aria-hidden /> Salvar ajustes</Botao>
          </form>
        </Cartao>

        {secoes.map((secao, si) => {
          const doBloco = perguntas.filter((q) => q.secao_id === secao.id)
          return (
            <Cartao
              key={secao.id}
              titulo={`${si + 1}. ${secao.titulo}`}
              apoio={`${doBloco.length} ${doBloco.length === 1 ? 'pergunta' : 'perguntas'}`}
              acao={
                <div className="flex items-center gap-1.5">
                  {secao.dimensao && <Chip faixa="neutro">{ROTULO_DIMENSAO[secao.dimensao] ?? secao.dimensao}</Chip>}
                  <BotaoMover dir={-1} disabled={si === 0} onClick={() => reordenar(move(secoes, si, -1), perguntas)} />
                  <BotaoMover dir={1} disabled={si === secoes.length - 1} onClick={() => reordenar(move(secoes, si, 1), perguntas)} />
                </div>
              }
            >
              <details>
                <summary className="cursor-pointer list-none text-xs font-medium text-marca-texto hover:underline">Editar título e texto da seção</summary>
                <div className="mt-3 grid gap-3 rounded-md border border-borda bg-superficie-2 p-3 sm:grid-cols-2">
                  <Campo rotulo="Título da seção"><input value={secao.titulo} onChange={(e) => editarSecao(secao.id, { titulo: e.target.value })} className={ENTRADA} /></Campo>
                  <Campo rotulo="Texto de apoio"><input value={secao.descricao ?? ''} onChange={(e) => editarSecao(secao.id, { descricao: e.target.value })} className={ENTRADA} /></Campo>
                </div>
              </details>

              <ol className="mt-4 space-y-2">
                {doBloco.map((q, qi) => {
                  const idxGlobal = perguntas.findIndex((x) => x.id === q.id)
                  return (
                    <li key={q.id} className="rounded-md border border-borda">
                      <details>
                        <summary className="flex cursor-pointer list-none items-start gap-2.5 p-3 hover:bg-superficie-2">
                          <span className="w-5 flex-none text-right text-xs text-tinta-3 tabular">{qi + 1}.</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-tinta-2">{q.enunciado}</span>
                            <span className="mt-1 flex flex-wrap gap-1.5">
                              <Chip faixa="neutro">{ROTULO_TIPO[q.tipo as PerguntaTipo] ?? q.tipo}</Chip>
                              {q.invertida && <Chip faixa="neutro">item protetivo</Chip>}
                              {q.critica && <Chip faixa="critico">gera alerta</Chip>}
                              {!q.obrigatoria && <Chip faixa="neutro">opcional</Chip>}
                            </span>
                          </span>
                          <span className="flex flex-none items-center gap-1.5">
                            <BotaoMover dir={-1} disabled={qi === 0} onClick={() => reordenar(secoes, move(perguntas, idxGlobal, -1))} />
                            <BotaoMover dir={1} disabled={qi === doBloco.length - 1} onClick={() => reordenar(secoes, move(perguntas, idxGlobal, 1))} />
                          </span>
                        </summary>

                        <div className="space-y-3 border-t border-borda bg-superficie-2 p-3">
                          <Campo rotulo="Enunciado"><textarea rows={2} value={q.enunciado} onChange={(e) => editarPergunta(q.id, { enunciado: e.target.value })} className={ENTRADA} /></Campo>
                          <Campo rotulo="Texto de ajuda"><input value={q.ajuda ?? ''} onChange={(e) => editarPergunta(q.id, { ajuda: e.target.value })} className={ENTRADA} /></Campo>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Campo rotulo="Tipo de resposta">
                              <select value={q.tipo} onChange={(e) => {
                                const tipo = e.target.value as PerguntaTipo
                                editarPergunta(q.id, { tipo, opcoes: tipo === 'likert5' ? ESCALA_FREQUENCIA : q.opcoes })
                              }} className={ENTRADA}>
                                {(Object.keys(ROTULO_TIPO) as PerguntaTipo[]).map((t) => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}
                              </select>
                            </Campo>
                            {q.tipo === 'likert5' && (
                              <Campo rotulo="Escala">
                                <select value={q.opcoes?.[0]?.rotulo === 'Discordo totalmente' ? 'concordancia' : 'frequencia'} onChange={(e) => editarPergunta(q.id, { opcoes: e.target.value === 'concordancia' ? ESCALA_CONCORDANCIA : ESCALA_FREQUENCIA })} className={ENTRADA}>
                                  <option value="frequencia">Nunca → Sempre</option>
                                  <option value="concordancia">Discordo → Concordo</option>
                                </select>
                              </Campo>
                            )}
                          </div>
                          {(q.tipo === 'escolha_unica' || q.tipo === 'escolha_multipla') && (
                            <Campo rotulo="Opções" ajuda="Uma por linha.">
                              <textarea rows={4} value={(q.opcoes ?? []).map((o: any) => o.rotulo).join('\n')} onChange={(e) => editarPergunta(q.id, { opcoes: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => ({ valor: l, rotulo: l })) })} className={ENTRADA} />
                            </Campo>
                          )}
                          <div className="space-y-2 rounded-md border border-borda bg-white p-3">
                            <label className="flex items-center gap-2.5 text-sm text-tinta-2"><input type="checkbox" checked={q.obrigatoria} onChange={(e) => editarPergunta(q.id, { obrigatoria: e.target.checked })} className="h-4 w-4 accent-[#2a7897]" /> Resposta obrigatória</label>
                            {q.tipo === 'likert5' && (
                              <>
                                <label className="flex items-start gap-2.5 text-sm text-tinta-2"><input type="checkbox" checked={q.invertida} onChange={(e) => editarPergunta(q.id, { invertida: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#2a7897]" /> Item protetivo (nota alta = situação boa; entra invertido no cálculo)</label>
                                <label className="flex items-start gap-2.5 text-sm text-tinta-2"><input type="checkbox" checked={q.critica} onChange={(e) => editarPergunta(q.id, { critica: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#2a7897]" /> Gera alerta (assédio/violência: uma ocorrência já sobe ao topo)</label>
                              </>
                            )}
                          </div>
                          {travado ? (
                            <p className="flex items-center gap-1.5 text-xs text-tinta-3"><Lock size={12} aria-hidden /> Exclusão bloqueada: já existem respostas.</p>
                          ) : (
                            <button type="button" onClick={() => setPerguntas(perguntas.filter((x) => x.id !== q.id))} className="inline-flex items-center gap-1.5 rounded-md border border-[#f0c2c2] bg-white px-2.5 py-1.5 text-xs font-medium text-critico hover:bg-[#fdeaea]"><Trash2 size={13} aria-hidden /> Excluir pergunta</button>
                          )}
                        </div>
                      </details>
                    </li>
                  )
                })}
              </ol>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-borda pt-3">
                <button type="button" onClick={() => novaPergunta(secao.id)} className="inline-flex items-center gap-1.5 rounded-md border border-borda-forte bg-white px-2.5 py-1.5 text-xs font-medium text-tinta-2 hover:bg-superficie-2"><Plus size={13} aria-hidden /> Adicionar pergunta</button>
                {!travado && <button type="button" onClick={() => { setSecoes(secoes.filter((s) => s.id !== secao.id)); setPerguntas(perguntas.filter((q) => q.secao_id !== secao.id)) }} className="inline-flex items-center gap-1.5 rounded-md border border-[#f0c2c2] bg-white px-2.5 py-1.5 text-xs font-medium text-critico hover:bg-[#fdeaea]"><Trash2 size={13} aria-hidden /> Excluir seção</button>}
              </div>
            </Cartao>
          )
        })}

        <button type="button" onClick={novaSecao} className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-borda-forte bg-white px-4 py-4 text-sm font-medium text-tinta-2 hover:border-marca hover:text-marca-texto"><Plus size={15} aria-hidden /> Adicionar seção</button>

        <div className="sticky bottom-4 flex justify-end">
          <Botao type="button" disabled={pendente} onClick={persistirEstrutura} className="shadow-lg"><Save size={15} aria-hidden /> {pendente ? 'Salvando…' : 'Salvar estrutura'}</Botao>
        </div>
      </div>
    </>
  )
}

function BotaoMover({ dir, disabled, onClick }: { dir: -1 | 1; disabled: boolean; onClick: () => void }) {
  const Icone = dir === -1 ? ChevronUp : ChevronDown
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={dir === -1 ? 'Mover para cima' : 'Mover para baixo'} className="flex h-6 w-6 items-center justify-center rounded border border-borda-forte bg-white text-tinta-2 hover:bg-superficie-2 disabled:cursor-not-allowed disabled:opacity-35">
      <Icone size={13} aria-hidden />
    </button>
  )
}

export default function EditarPesquisa() {
  return (
    <Suspense fallback={null}>
      <Editor />
    </Suspense>
  )
}
