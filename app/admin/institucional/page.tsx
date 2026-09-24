'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import {
  getSobre, salvarSobre, getMissao, salvarMissao,
  type SobreConfig, type MissaoConfig, type Bloco, type Valor,
} from '@/lib/fb/institucional'
import { CabecalhoPagina, Cartao, Campo, ENTRADA, Botao, Aviso } from '@/components/ui'

export default function AdminInstitucional() {
  const [sobre, setSobre] = useState<SobreConfig | null>(null)
  const [missao, setMissao] = useState<MissaoConfig | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<'sobre' | 'missao' | null>(null)

  useEffect(() => {
    getSobre().then(setSobre).catch(() => setErro('Não consegui carregar.'))
    getMissao().then(setMissao).catch(() => setErro('Não consegui carregar.'))
  }, [])

  async function salvar(qual: 'sobre' | 'missao') {
    setSalvando(qual); setErro(null); setAviso(null)
    try {
      if (qual === 'sobre' && sobre) await salvarSobre(sobre)
      if (qual === 'missao' && missao) await salvarMissao(missao)
      setAviso('Salvo! Já aparece no site.')
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não consegui salvar.') }
    setSalvando(null)
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Sobre / Missão, Visão e Valores"
        descricao="Edite os textos institucionais das páginas públicas. As mudanças aparecem no site na hora."
      />
      <div className="max-w-4xl space-y-4 p-4 sm:p-6">
        {aviso && <Aviso tom="sucesso">{aviso}</Aviso>}
        {erro && <Aviso tom="erro">{erro}</Aviso>}

        {/* ---------------- Sobre Nós ---------------- */}
        <Cartao titulo="Sobre Nós" apoio="Página “Sobre Nós” (rodapé/menu).">
          {!sobre ? <p className="text-sm text-tinta-3">Carregando…</p> : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo rotulo="Título"><input value={sobre.titulo} onChange={(e) => setSobre({ ...sobre, titulo: e.target.value })} className={ENTRADA} /></Campo>
                <Campo rotulo="Subtítulo"><input value={sobre.subtitulo} onChange={(e) => setSobre({ ...sobre, subtitulo: e.target.value })} className={ENTRADA} /></Campo>
              </div>

              <div>
                <p className="text-sm font-medium text-tinta">Conteúdo (parágrafos e subtítulos)</p>
                <div className="mt-2 space-y-2">
                  {sobre.blocos.map((b, i) => (
                    <div key={i} className="rounded-lg border border-borda bg-white p-2">
                      <div className="flex items-center gap-2">
                        <select value={b.tipo} onChange={(e) => setSobre({ ...sobre, blocos: patch(sobre.blocos, i, { tipo: e.target.value as Bloco['tipo'] }) })} className="rounded-lg border border-borda-forte bg-white px-2 py-1.5 text-xs font-medium text-tinta">
                          <option value="p">Parágrafo</option>
                          <option value="sub">Subtítulo</option>
                        </select>
                        <div className="ml-auto flex gap-0.5">
                          <IconBtn title="Subir" disabled={i === 0} onClick={() => setSobre({ ...sobre, blocos: mover(sobre.blocos, i, -1) })}><ArrowUp size={15} /></IconBtn>
                          <IconBtn title="Descer" disabled={i === sobre.blocos.length - 1} onClick={() => setSobre({ ...sobre, blocos: mover(sobre.blocos, i, 1) })}><ArrowDown size={15} /></IconBtn>
                          <IconBtn title="Remover" perigo onClick={() => setSobre({ ...sobre, blocos: sobre.blocos.filter((_, j) => j !== i) })}><Trash2 size={15} /></IconBtn>
                        </div>
                      </div>
                      <textarea value={b.texto} onChange={(e) => setSobre({ ...sobre, blocos: patch(sobre.blocos, i, { texto: e.target.value }) })} rows={b.tipo === 'sub' ? 1 : 3} className={`${ENTRADA} mt-2`} />
                    </div>
                  ))}
                  <AddBtn onClick={() => setSobre({ ...sobre, blocos: [...sobre.blocos, { tipo: 'p', texto: '' } as Bloco] })}>Adicionar parágrafo/subtítulo</AddBtn>
                </div>
              </div>

              <Campo rotulo="Frase de destaque"><input value={sobre.destaque} onChange={(e) => setSobre({ ...sobre, destaque: e.target.value })} className={ENTRADA} placeholder="Eu te ajudo a trabalhar mais feliz." /></Campo>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo rotulo="Texto do link"><input value={sobre.link_texto} onChange={(e) => setSobre({ ...sobre, link_texto: e.target.value })} className={ENTRADA} placeholder="Conheça a Soulan" /></Campo>
                <Campo rotulo="URL do link"><input value={sobre.link_url} onChange={(e) => setSobre({ ...sobre, link_url: e.target.value })} className={ENTRADA} placeholder="https://soulan.com.br/" /></Campo>
              </div>

              <div className="flex justify-end">
                <Botao type="button" onClick={() => salvar('sobre')} disabled={salvando === 'sobre'}>
                  {salvando === 'sobre' ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Salvando…</> : <><Save size={15} aria-hidden /> Salvar Sobre Nós</>}
                </Botao>
              </div>
            </div>
          )}
        </Cartao>

        {/* ---------------- Missão, Visão e Valores ---------------- */}
        <Cartao titulo="Missão, Visão e Valores">
          {!missao ? <p className="text-sm text-tinta-3">Carregando…</p> : (
            <div className="space-y-4">
              <Campo rotulo="Visão"><textarea value={missao.visao} onChange={(e) => setMissao({ ...missao, visao: e.target.value })} rows={3} className={ENTRADA} /></Campo>
              <Campo rotulo="Missão"><textarea value={missao.missao} onChange={(e) => setMissao({ ...missao, missao: e.target.value })} rows={3} className={ENTRADA} /></Campo>
              <Campo rotulo="Texto antes dos valores"><textarea value={missao.intro_valores} onChange={(e) => setMissao({ ...missao, intro_valores: e.target.value })} rows={2} className={ENTRADA} /></Campo>

              <div>
                <p className="text-sm font-medium text-tinta">Valores</p>
                <div className="mt-2 space-y-2">
                  {missao.valores.map((v, i) => (
                    <div key={i} className="rounded-lg border border-borda bg-white p-2">
                      <div className="flex items-center gap-2">
                        <input value={v.nome} onChange={(e) => setMissao({ ...missao, valores: patch(missao.valores, i, { nome: e.target.value }) })} className={ENTRADA} placeholder="Nome do valor" />
                        <IconBtn title="Remover" perigo onClick={() => setMissao({ ...missao, valores: missao.valores.filter((_, j) => j !== i) })}><Trash2 size={15} /></IconBtn>
                      </div>
                      <textarea value={v.desc} onChange={(e) => setMissao({ ...missao, valores: patch(missao.valores, i, { desc: e.target.value }) })} rows={2} className={`${ENTRADA} mt-2`} placeholder="Descrição" />
                    </div>
                  ))}
                  <AddBtn onClick={() => setMissao({ ...missao, valores: [...missao.valores, { nome: '', desc: '' } as Valor] })}>Adicionar valor</AddBtn>
                </div>
              </div>

              <div className="flex justify-end">
                <Botao type="button" onClick={() => salvar('missao')} disabled={salvando === 'missao'}>
                  {salvando === 'missao' ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Salvando…</> : <><Save size={15} aria-hidden /> Salvar Missão/Visão/Valores</>}
                </Botao>
              </div>
            </div>
          )}
        </Cartao>
      </div>
    </>
  )
}

function patch<T>(arr: T[], i: number, p: Partial<T>): T[] {
  return arr.map((x, j) => (j === i ? { ...x, ...p } : x))
}
function mover<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= arr.length) return arr
  const c = [...arr]
  ;[c[i], c[j]] = [c[j], c[i]]
  return c
}

function IconBtn({ children, title, onClick, disabled, perigo }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean; perigo?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled} className={`rounded p-1.5 text-tinta-3 disabled:opacity-30 ${perigo ? 'hover:bg-plano hover:text-critico' : 'hover:bg-superficie-2 hover:text-marca'}`}>
      {children}
    </button>
  )
}
function AddBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-borda-forte px-3 py-2 text-sm font-medium text-tinta-2 transition-colors hover:border-marca hover:text-marca-texto">
      <Plus size={15} aria-hidden /> {children}
    </button>
  )
}
