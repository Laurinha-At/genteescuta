'use client'

import { useEffect, useRef, useState } from 'react'
import Link from '@/components/LinkSemPrefetch'
import { Megaphone, Award, Plus, Pencil, Trash2, Eye, EyeOff, ShieldQuestion, X, ArrowUpToLine } from 'lucide-react'
import { RichTextEditor, type RichHandle } from '@/components/RichText'
import {
  listarPosts,
  salvarPostInforma,
  excluirPost,
  definirPublicadoPost,
  repostarPost,
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

      <div className="space-y-5 p-4 sm:p-6">
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

        {/* Formulário no topo, largura total */}
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

        {/* Duas listas lado a lado em telas largas; empilham no celular */}
        <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
          <Cartao titulo={`Gente Informa (${informa.length})`} apoio="Seus avisos publicados e rascunhos">
            {carregando ? (
              <p className="text-sm text-tinta-3">Carregando…</p>
            ) : informa.length === 0 ? (
              <p className="text-sm text-tinta-3">Nenhum aviso ainda. Crie o primeiro acima.</p>
            ) : (
              <ul className="space-y-2.5">
                {informa.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start gap-x-3 gap-y-2.5 rounded-lg border border-borda px-3 py-3">
                    <Megaphone size={17} className="mt-0.5 flex-none text-marca" aria-hidden />
                    <div className="min-w-[12rem] flex-1">
                      <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-tinta">{p.titulo}</p>
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      {p.publicado ? <Chip faixa="baixo">Publicado</Chip> : <Chip faixa="neutro">Rascunho</Chip>}
                      <span className="whitespace-nowrap text-xs text-tinta-3">{fmtData(p.data)}</span>
                    </div>
                    <div className="flex w-full flex-wrap gap-1.5 sm:w-auto">
                      <BtnAcao onClick={() => definirPublicadoPost(p.id, !p.publicado).then(recarregar)} Icone={p.publicado ? EyeOff : Eye}>{p.publicado ? 'Ocultar' : 'Publicar'}</BtnAcao>
                      <BtnAcao onClick={() => { if (confirm('Repostar este aviso? Ele vai para o topo do mural com a data de hoje.')) repostarPost(p.id).then(recarregar) }} Icone={ArrowUpToLine}>Repostar</BtnAcao>
                      <BtnAcao onClick={() => setEditando(p)} Icone={Pencil}>Editar</BtnAcao>
                      <BtnAcao onClick={() => { if (confirm('Remover este aviso?')) excluirPost(p.id).then(recarregar) }} Icone={Trash2} perigo>Excluir</BtnAcao>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <Cartao titulo={`Reconhecimentos no mural (${reconhecimentos.length})`} apoio="Aprovados e publicados. Você pode despublicar ou remover.">
            {reconhecimentos.length === 0 ? (
              <p className="text-sm text-tinta-3">Nenhum reconhecimento publicado ainda. Aprove os pendentes na moderação.</p>
            ) : (
              <ul className="space-y-2.5">
                {reconhecimentos.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start gap-x-3 gap-y-2.5 rounded-lg border border-borda px-3 py-3">
                    <Award size={17} className="mt-0.5 flex-none text-[#0b5d3a]" aria-hidden />
                    <div className="min-w-[12rem] flex-1">
                      <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-tinta">{p.titulo}</p>
                      {p.area && <p className="mt-0.5 text-xs text-tinta-3">Setor: {p.area}</p>}
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      {p.publicado ? <Chip faixa="baixo">No ar</Chip> : <Chip faixa="neutro">Fora do ar</Chip>}
                      <span className="whitespace-nowrap text-xs text-tinta-3">{fmtData(p.data)}</span>
                    </div>
                    <div className="flex w-full flex-wrap gap-1.5 sm:w-auto">
                      <BtnAcao onClick={() => definirPublicadoPost(p.id, !p.publicado).then(recarregar)} Icone={p.publicado ? EyeOff : Eye}>{p.publicado ? 'Ocultar' : 'Publicar'}</BtnAcao>
                      <BtnAcao onClick={() => { if (confirm('Repostar este reconhecimento? Ele vai para o topo do mural com a data de hoje.')) repostarPost(p.id).then(recarregar) }} Icone={ArrowUpToLine}>Repostar</BtnAcao>
                      <BtnAcao onClick={() => { if (confirm('Remover este reconhecimento do mural?')) excluirPost(p.id).then(recarregar) }} Icone={Trash2} perigo>Excluir</BtnAcao>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </div>
      </div>
    </>
  )
}

function BtnAcao({
  onClick,
  Icone,
  children,
  perigo = false,
}: {
  onClick: () => void
  Icone: typeof Pencil
  children: React.ReactNode
  perigo?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        perigo
          ? 'border-borda text-critico hover:border-critico hover:bg-plano'
          : 'border-borda text-tinta-2 hover:bg-superficie-2 hover:text-tinta'
      }`}
    >
      <Icone size={14} aria-hidden /> {children}
    </button>
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
  const corpoRef = useRef<RichHandle>(null)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setPendente(true)
    const f = new FormData(e.currentTarget)
    try {
      await salvarPostInforma({
        id: inicial?.id,
        titulo: String(f.get('titulo') ?? ''),
        corpo: corpoRef.current?.getHtml() ?? '',
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
      <Campo rotulo="Conteúdo" obrigatorio ajuda="Use o botão de link para transformar um texto em link clicável (ex.: selecione “clique aqui” e cole o endereço).">
        <RichTextEditor ref={corpoRef} valorInicial={inicial?.corpo ?? ''} placeholder="Escreva a novidade, informação ou comunicado do RH…" minHeight={280} />
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
