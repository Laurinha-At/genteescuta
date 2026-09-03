'use client'

import { useEffect, useState } from 'react'
import { Award, Check, X, MessageCircle, Trash2 } from 'lucide-react'
import {
  reconhecimentosPendentes,
  aprovarReconhecimento,
  recusarReconhecimento,
  comentariosPendentes,
  aprovarComentario,
  excluirComentario,
} from '@/lib/fb/admin'
import { CabecalhoPagina, Cartao, Chip, Campo, ENTRADA } from '@/components/ui'
import { fmtData } from '@/lib/format'

export default function Moderacao() {
  const [recs, setRecs] = useState<any[]>([])
  const [coms, setComs] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  function recarregar() {
    setCarregando(true)
    Promise.all([reconhecimentosPendentes(), comentariosPendentes()])
      .then(([r, c]) => {
        setRecs(r)
        setComs(c)
      })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }
  useEffect(recarregar, [])

  return (
    <>
      <CabecalhoPagina
        titulo="Moderação do mural"
        descricao="Aprove reconhecimentos e comentários antes que apareçam para a empresa."
        voltar={{ href: '/admin/mural', rotulo: 'Voltar ao mural' }}
      />

      <div className="max-w-3xl space-y-4 p-4 sm:p-6">
        <Cartao titulo={`Reconhecimentos aguardando (${recs.length})`} apoio="Enviados pelo canal. Ao aprovar, viram post no mural — sem o nome de quem enviou.">
          {carregando ? (
            <p className="text-sm text-tinta-3">Carregando…</p>
          ) : recs.length === 0 ? (
            <p className="text-sm text-tinta-3">Nada pendente. 🎉</p>
          ) : (
            <ul className="space-y-3">
              {recs.map((m) => (
                <li key={m.id}>
                  <ItemReconhecimento m={m} aoAgir={recarregar} />
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo={`Comentários aguardando (${coms.length})`} apoio="Comentários anônimos do mural. Aprove para publicar ou remova.">
          {carregando ? (
            <p className="text-sm text-tinta-3">Carregando…</p>
          ) : coms.length === 0 ? (
            <p className="text-sm text-tinta-3">Nada pendente. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {coms.map((c) => (
                <li key={c.id} className="rounded-md border border-borda p-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={14} className="flex-none text-tinta-3" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-xs text-tinta-3">em “{c.postTitulo}”</span>
                    <span className="text-xs text-tinta-3">{fmtData(c.criado_em)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-5 text-tinta-2">{c.texto}</p>
                  <p className="mt-1.5 text-xs text-tinta-3">
                    por <strong className="font-medium text-tinta-2">{c.nome || 'Anônimo'}</strong>
                    {c.email ? ` · ${c.email}` : ''}
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button type="button" onClick={() => aprovarComentario(c.postId, c.id).then(recarregar)} className="inline-flex items-center gap-1.5 rounded-lg bg-marca px-3 py-1.5 text-xs font-semibold text-white hover:bg-marca-escura">
                      <Check size={13} aria-hidden /> Aprovar
                    </button>
                    <button type="button" onClick={() => { if (confirm('Remover este comentário?')) excluirComentario(c.postId, c.id).then(recarregar) }} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-1.5 text-xs font-semibold text-tinta hover:bg-plano hover:text-critico">
                      <Trash2 size={13} aria-hidden /> Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </>
  )
}

function ItemReconhecimento({ m, aoAgir }: { m: any; aoAgir: () => void }) {
  const [titulo, setTitulo] = useState(m.titulo ?? '')
  const [corpo, setCorpo] = useState(m.descricao ?? '')
  const [pendente, setPendente] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function aprovar() {
    setErro(null)
    setPendente(true)
    try {
      await aprovarReconhecimento(m.id, { titulo, corpo, area: m.area ?? null })
      aoAgir()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui aprovar.')
      setPendente(false)
    }
  }

  async function recusar() {
    if (!confirm('Recusar este reconhecimento? Ele não aparecerá no mural.')) return
    setPendente(true)
    await recusarReconhecimento(m.id).catch(() => {})
    aoAgir()
  }

  return (
    <div className="rounded-md border border-borda p-3.5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f4ec] px-2.5 py-1 text-xs font-semibold text-[#0b5d3a]">
          <Award size={13} aria-hidden /> Reconhecimento
        </span>
        {m.area && <Chip faixa="marca">{m.area}</Chip>}
        <span className="ml-auto text-xs text-tinta-3">{fmtData(m.criado_em)}</span>
      </div>

      {erro && <p className="mb-2 text-xs font-medium text-critico">{erro}</p>}

      <div className="space-y-3">
        <Campo rotulo="Título (aparece no mural)">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={ENTRADA} />
        </Campo>
        <Campo rotulo="Texto (aparece no mural)" ajuda="Revise antes de publicar. O nome/e-mail de quem enviou NÃO é publicado.">
          <textarea value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={4} className={ENTRADA} />
        </Campo>
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" disabled={pendente} onClick={aprovar} className="inline-flex items-center gap-1.5 rounded-lg bg-marca px-3.5 py-2 text-sm font-semibold text-white hover:bg-marca-escura disabled:opacity-60">
          <Check size={15} aria-hidden /> {pendente ? 'Publicando…' : 'Aprovar e publicar'}
        </button>
        <button type="button" disabled={pendente} onClick={recusar} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3.5 py-2 text-sm font-semibold text-tinta hover:bg-plano hover:text-critico disabled:opacity-60">
          <X size={15} aria-hidden /> Recusar
        </button>
      </div>
    </div>
  )
}
