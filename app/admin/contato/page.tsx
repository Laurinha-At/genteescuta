'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { getContato, salvarContato, type ContatoConfig, type Focal, type ContatoPessoa } from '@/lib/fb/contato'
import { CabecalhoPagina, Cartao, Campo, ENTRADA, Botao, Aviso } from '@/components/ui'

export default function AdminContato() {
  const [c, setC] = useState<ContatoConfig | null>(null)
  const [pendente, setPendente] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => { getContato().then(setC).catch(() => setErro('Não consegui carregar.')) }, [])

  function set<K extends keyof ContatoConfig>(k: K, v: ContatoConfig[K]) {
    setC((atual) => (atual ? { ...atual, [k]: v } : atual))
  }

  async function salvar() {
    if (!c) return
    setPendente(true); setErro(null); setAviso(null)
    try { await salvarContato(c); setAviso('Página de Contato atualizada. Já aparece no site.') }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não consegui salvar.') }
    setPendente(false)
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Contato e Suporte"
        descricao="Edite os textos e a lista de contatos da página pública. As mudanças aparecem no site na hora."
        voltar={{ href: '/contato', rotulo: 'Ver página pública' }}
      />
      <div className="max-w-4xl space-y-4 p-4 sm:p-6">
        {aviso && <Aviso tom="sucesso">{aviso}</Aviso>}
        {erro && <Aviso tom="erro">{erro}</Aviso>}

        {!c ? (
          <p className="text-sm text-tinta-3">Carregando…</p>
        ) : (
          <>
            <Cartao titulo="Textos">
              <div className="space-y-4">
                <Campo rotulo="E-mail principal">
                  <input value={c.email_contato} onChange={(e) => set('email_contato', e.target.value)} className={ENTRADA} placeholder="gentecultura@soulan.com.br" />
                </Campo>
                <Campo rotulo="Texto de abertura">
                  <textarea value={c.intro_topo} onChange={(e) => set('intro_topo', e.target.value)} rows={2} className={ENTRADA} />
                </Campo>
                <Campo rotulo="Aviso de sigilo">
                  <textarea value={c.aviso_sigilo} onChange={(e) => set('aviso_sigilo', e.target.value)} rows={2} className={ENTRADA} />
                </Campo>
                <Campo rotulo="Texto antes dos responsáveis por assunto">
                  <textarea value={c.intro_focais} onChange={(e) => set('intro_focais', e.target.value)} rows={3} className={ENTRADA} />
                </Campo>
              </div>
            </Cartao>

            <Cartao titulo="Responsáveis por assunto" apoio="Quem procurar para cada tipo de situação.">
              <div className="space-y-2">
                {c.focais.map((f, i) => (
                  <Linha key={i} onRemover={() => set('focais', c.focais.filter((_, j) => j !== i))}>
                    <input value={f.assunto} onChange={(e) => set('focais', troca(c.focais, i, { assunto: e.target.value }))} className={ENTRADA} placeholder="Assunto (ex.: Benefícios)" />
                    <input value={f.responsaveis} onChange={(e) => set('focais', troca(c.focais, i, { responsaveis: e.target.value }))} className={ENTRADA} placeholder="Responsável (ex.: Edna)" />
                  </Linha>
                ))}
                <BotaoAdicionar onClick={() => set('focais', [...c.focais, { assunto: '', responsaveis: '' } as Focal])}>Adicionar assunto</BotaoAdicionar>
              </div>
            </Cartao>

            <Cartao titulo="Contatos (telefones e e-mails)">
              <div className="space-y-2">
                {c.contatos.map((p, i) => (
                  <Linha key={i} onRemover={() => set('contatos', c.contatos.filter((_, j) => j !== i))}>
                    <input value={p.nome} onChange={(e) => set('contatos', troca(c.contatos, i, { nome: e.target.value }))} className={ENTRADA} placeholder="Nome" />
                    <input value={p.cargo} onChange={(e) => set('contatos', troca(c.contatos, i, { cargo: e.target.value }))} className={ENTRADA} placeholder="Cargo / setor" />
                    <input value={p.telefone} onChange={(e) => set('contatos', troca(c.contatos, i, { telefone: e.target.value }))} className={ENTRADA} placeholder="Telefone" inputMode="tel" />
                    <input value={p.email} onChange={(e) => set('contatos', troca(c.contatos, i, { email: e.target.value }))} className={ENTRADA} placeholder="E-mail" inputMode="email" />
                  </Linha>
                ))}
                <BotaoAdicionar onClick={() => set('contatos', [...c.contatos, { nome: '', cargo: '', email: '', telefone: '' } as ContatoPessoa])}>Adicionar contato</BotaoAdicionar>
              </div>
            </Cartao>

            <div className="sticky bottom-3 flex justify-end">
              <Botao type="button" onClick={salvar} disabled={pendente}>
                {pendente ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Salvando…</> : <><Save size={15} aria-hidden /> Salvar alterações</>}
              </Botao>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function troca<T>(arr: T[], i: number, patch: Partial<T>): T[] {
  return arr.map((x, j) => (j === i ? { ...x, ...patch } : x))
}

function Linha({ children, onRemover }: { children: React.ReactNode; onRemover: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-borda bg-white p-2">
      <div className="grid flex-1 gap-2 sm:grid-cols-2">{children}</div>
      <button type="button" onClick={onRemover} title="Remover" className="mt-0.5 rounded p-1.5 text-tinta-3 hover:bg-plano hover:text-critico">
        <Trash2 size={16} aria-hidden />
      </button>
    </div>
  )
}

function BotaoAdicionar({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-borda-forte px-3 py-2 text-sm font-medium text-tinta-2 transition-colors hover:border-marca hover:text-marca-texto">
      <Plus size={15} aria-hidden /> {children}
    </button>
  )
}
