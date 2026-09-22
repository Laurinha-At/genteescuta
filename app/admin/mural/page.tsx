'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Megaphone, Award, Plus, Pencil, Trash2, Eye, EyeOff, ShieldQuestion, X } from 'lucide-react'
import {
  listarPosts,
  salvarPostInforma,
  excluirPost,
  definirPublicadoPost,
  reconhecimentosPendentes,
  comentariosPendentes,
} from '@/lib/fb/admin'
import { CabecalhoPagina, Cartao, Chip, Aviso, Botao, Campo, ENTRADA } from '@/components/ui'
import { fmtData } from '@/lib/format'

export default function MuralAdmin() {
  const [posts, setPosts] = useState<any[]>([])
  const [pendRec, setPendRec] = useState(0)
  const [pendCom, setPendCom] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<any | null>(null)

  function recarregar() {
    listarPosts().then(setPosts).catch(() => {}).finally(() => setCarregando(false))
    reconhecimentosPendentes().then((r) => setPendRec(r.length)).catch(() => {})
    comentariosPendentes().then((c) => setPendCom(c.length)).catch(() => {})
  }
  useEffect(recarregar, [])

  const informa = posts.filter((p) => p.categoria === 'informa')
  const reconhecimentos = posts.filter((p) => p.categoria === 'reconhecimento')

  return (
    <>
      <CabecalhoPagina
        titulo="Mural & Gente Informa"
        descricao="Publique avisos do Gente Informa e cuide do que aparece no mural para a empresa."
        acoes={
          <Link
            href="/admin/mural/moderacao"
            className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3.5 py-2 text-sm font-medium text-tinta hover:bg-superficie-2"
          >
            <ShieldQuestion size={15} aria-hidden /> Moderação
            {(pendRec + pendCom) > 0 && (
              <span className="ml-1 rounded-full bg-critico px-1.5 text-[11px] font-semibold leading-5 text-white tabular">
                {pendRec + pendCom}
              </span>
            )}
          </Link>
        }
      />

      <div className="max-w-6xl space-y-4 p-4 sm:p-6">
        {(pendRec > 0 || pendCom > 0) && (
          <Aviso tom="alerta">
            Há{' '}
            {pendRec > 0 && <strong>{pendRec} reconhecimento(s)</strong>}
            {pendRec > 0 && pendCom > 0 && ' e '}
            {pendCom > 0 && <strong>{pendCom} comentário(s)</strong>}
            {' '}aguardando aprovação.{' '}
            <Link href="/admin/mural/moderacao" className="font-semibold text-marca hover:underline">
              Abrir moderação
            </Link>
          </Aviso>
        )}

        <Cartao titulo={editando ? 'Editar aviso do Gente Informa' : 'Novo aviso do Gente Informa'} apoio="Novidades, informações e assuntos do RH. Só o admin publica; o colaborador apenas vê.">
          <FormInforma
            key={editando?.id ?? 'novo'}
            inicial={editando}
            aoSalvar={() => {
              setEditando(null)
              recarregar()
            }}
            aoCancelar={editando ? () => setEditando(null) : undefined}
          />
        </Cartao>

        <Cartao titulo={`Gente Informa (${informa.length})`} apoio="Seus avisos publicados e rascunhos">
          {carregando ? (
            <p className="text-sm text-tinta-3">Carregando…</p>
          ) : informa.length === 0 ? (
            <p className="text-sm text-tinta-3">Nenhum aviso ainda. Crie o primeiro acima.</p>
          ) : (
            <ul className="space-y-2">
              {informa.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-md border border-borda px-3 py-2.5">
                  <Megaphone size={15} className="flex-none text-marca" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-tinta">{p.titulo}</span>
                  {p.publicado ? <Chip faixa="baixo">Publicado</Chip> : <Chip faixa="neutro">Rascunho</Chip>}
                  <span className="text-xs text-tinta-3">{fmtData(p.data)}</span>
                  <button type="button" onClick={() => definirPublicadoPost(p.id, !p.publicado).then(recarregar)} title={p.publicado ? 'Despublicar' : 'Publicar'} className="rounded p-1 text-tinta-3 hover:bg-superficie-2 hover:text-tinta">
                    {p.publicado ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                  </button>
                  <button type="button" onClick={() => setEditando(p)} title="Editar" className="rounded p-1 text-tinta-3 hover:bg-superficie-2 hover:text-marca">
                    <Pencil size={15} aria-hidden />
                  </button>
                  <button type="button" onClick={() => { if (confirm('Remover este aviso?')) excluirPost(p.id).then(recarregar) }} title="Remover" className="rounded p-1 text-tinta-3 hover:bg-plano hover:text-critico">
                    <Trash2 size={15} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo={`Reconhecimentos no mural (${reconhecimentos.length})`} apoio="Aprovados e publicados. Você pode despublicar ou remover.">
          {reconhecimentos.length === 0 ? (
            <p className="text-sm text-tinta-3">Nenhum reconhecimento publicado ainda. Aprove os pendentes na moderação.</p>
          ) : (
            <ul className="space-y-2">
              {reconhecimentos.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-md border border-borda px-3 py-2.5">
                  <Award size={15} className="flex-none text-[#0b5d3a]" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-tinta">{p.titulo}</span>
                  {p.area && <Chip faixa="marca">{p.area}</Chip>}
                  {p.publicado ? <Chip faixa="baixo">No ar</Chip> : <Chip faixa="neutro">Fora do ar</Chip>}
                  <button type="button" onClick={() => definirPublicadoPost(p.id, !p.publicado).then(recarregar)} title={p.publicado ? 'Tirar do ar' : 'Publicar'} className="rounded p-1 text-tinta-3 hover:bg-superficie-2 hover:text-tinta">
                    {p.publicado ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                  </button>
                  <button type="button" onClick={() => { if (confirm('Remover este reconhecimento do mural?')) excluirPost(p.id).then(recarregar) }} title="Remover" className="rounded p-1 text-tinta-3 hover:bg-plano hover:text-critico">
                    <Trash2 size={15} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </>
  )
}

function FormInforma({
  inicial,
  aoSalvar,
  aoCancelar,
}: {
  inicial: any | null
  aoSalvar: () => void
  aoCancelar?: () => void
}) {
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, setPendente] = useState(false)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setPendente(true)
    const f = new FormData(e.currentTarget)
    try {
      await salvarPostInforma({
        id: inicial?.id,
        titulo: String(f.get('titulo') ?? ''),
        corpo: String(f.get('corpo') ?? ''),
        autor: String(f.get('autor') ?? ''),
        publicado: f.get('publicado') === 'on',
      })
      if (!inicial) (e.target as HTMLFormElement).reset()
      aoSalvar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui salvar.')
    }
    setPendente(false)
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      <Campo rotulo="Título" obrigatorio>
        <input name="titulo" required minLength={3} defaultValue={inicial?.titulo ?? ''} className={ENTRADA} placeholder="Ex.: Campanha de vacinação da gripe" />
      </Campo>
      <Campo rotulo="Conteúdo" obrigatorio>
        <textarea name="corpo" required minLength={5} rows={5} defaultValue={inicial?.corpo ?? ''} className={ENTRADA} placeholder="Escreva a novidade, informação ou comunicado do RH…" />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Assinatura" ajuda="Quem publica (aparece como “por …”).">
          <input name="autor" defaultValue={inicial?.autor ?? 'Gente & Cultura'} className={ENTRADA} />
        </Campo>
        <label className="flex items-center gap-2.5 self-end pb-2.5">
          <input type="checkbox" name="publicado" defaultChecked={inicial ? inicial.publicado : true} className="h-4 w-4 accent-[#2a7897]" />
          <span className="text-sm text-tinta">Publicar no mural agora</span>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Botao type="submit" disabled={pendente}>
          <Plus size={15} aria-hidden /> {pendente ? 'Salvando…' : inicial ? 'Salvar alterações' : 'Publicar aviso'}
        </Botao>
        {aoCancelar && (
          <button type="button" onClick={aoCancelar} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-superficie-2">
            <X size={15} aria-hidden /> Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
