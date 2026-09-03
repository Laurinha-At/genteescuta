'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Award, Megaphone, MessageCircle, Send, LogIn } from 'lucide-react'
import { REACOES, reagir, getMinhaReacao, getComentarios, enviarComentario } from '@/lib/fb/publico'
import type { Perfil } from '@/lib/fb/funcionarios'
import { fmtData } from '@/lib/format'

type Post = {
  id: string
  categoria: 'reconhecimento' | 'informa'
  titulo: string
  corpo: string
  area?: string | null
  autor?: string | null
  data: string
  reacoes?: Record<string, number>
}

type Filtro = 'tudo' | 'reconhecimento' | 'informa'

function ehParticipante(perfil: Perfil | null): boolean {
  return !!perfil && perfil.ativo && (perfil.tipo === 'admin' || perfil.tipo === 'funcionario')
}
function nomeDe(perfil: Perfil | null): string {
  if (!perfil) return ''
  return perfil.nome || (perfil.email ? perfil.email.split('@')[0] : 'Colaborador(a)')
}

export function MuralFeed({ posts, perfil }: { posts: Post[]; perfil: Perfil | null }) {
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const visiveis = posts.filter((p) => filtro === 'tudo' || p.categoria === filtro)

  const abas: { id: Filtro; rotulo: string }[] = [
    { id: 'tudo', rotulo: 'Tudo' },
    { id: 'reconhecimento', rotulo: 'Reconhecimentos' },
    { id: 'informa', rotulo: 'Gente Informa' },
  ]

  return (
    <div>
      {!ehParticipante(perfil) && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-[#cfe0e8] bg-marca-clara px-4 py-3">
          <LogIn size={16} className="flex-none text-marca" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-marca-escura">
            Para <strong>reagir</strong> e <strong>comentar</strong>, entre como funcionário.
          </p>
          <Link href="/entrar" className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-marca-escura hover:bg-superficie-2">
            Entrar
          </Link>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-1.5">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setFiltro(a.id)}
            aria-pressed={filtro === a.id}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filtro === a.id ? 'bg-marca text-white' : 'border border-borda-forte bg-white text-tinta-2 hover:bg-superficie-2'
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <div className="cartao-g px-6 py-14 text-center">
          <p className="text-sm font-medium text-tinta">Ainda não há publicações por aqui.</p>
          <p className="mt-1 text-xs text-tinta-3">Reconhecimentos aprovados e avisos do Gente Informa aparecem neste feed.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {visiveis.map((p) => (
            <li key={p.id}>
              <CartaoPost post={p} perfil={perfil} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CartaoPost({ post, perfil }: { post: Post; perfil: Perfil | null }) {
  const reconhecimento = post.categoria === 'reconhecimento'
  return (
    <article className="post-cartao">
      <div className={`post-barra ${reconhecimento ? 'post-barra-rec' : 'post-barra-info'}`} aria-hidden />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              reconhecimento ? 'bg-[#e7f4ec] text-[#0b5d3a]' : 'bg-marca-clara text-marca-escura'
            }`}
          >
            {reconhecimento ? <Award size={13} aria-hidden /> : <Megaphone size={13} aria-hidden />}
            {reconhecimento ? 'Reconhecimento' : 'Gente Informa'}
          </span>
          {reconhecimento && post.area && (
            <span className="rounded-full bg-superficie-2 px-2.5 py-1 text-xs text-tinta-2">{post.area}</span>
          )}
          {!reconhecimento && post.autor && <span className="text-xs text-tinta-3">por {post.autor}</span>}
          <span className="ml-auto text-xs text-tinta-3">{fmtData(post.data)}</span>
        </div>

        <h2 className="mt-3 text-lg font-semibold leading-6 text-tinta">{post.titulo}</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-tinta-2">{post.corpo}</p>

        <Reacoes postId={post.id} iniciais={post.reacoes} perfil={perfil} />
        <Comentarios postId={post.id} perfil={perfil} />
      </div>
    </article>
  )
}

function Reacoes({
  postId,
  iniciais,
  perfil,
}: {
  postId: string
  iniciais?: Record<string, number>
  perfil: Perfil | null
}) {
  const participante = ehParticipante(perfil)
  const [contagem, setContagem] = useState<Record<string, number>>({ ...iniciais })
  const [minha, setMinha] = useState<string | null>(null)
  const [aviso, setAviso] = useState(false)

  useEffect(() => {
    if (participante) getMinhaReacao(postId).then(setMinha).catch(() => {})
  }, [participante, postId])

  async function reagirEmoji(chave: string) {
    if (!participante) {
      setAviso(true)
      return
    }
    const anterior = minha
    // otimista
    setContagem((c) => {
      const n = { ...c }
      if (anterior === chave) n[chave] = Math.max(0, (n[chave] ?? 1) - 1)
      else {
        n[chave] = (n[chave] ?? 0) + 1
        if (anterior) n[anterior] = Math.max(0, (n[anterior] ?? 1) - 1)
      }
      return n
    })
    setMinha(anterior === chave ? null : chave)
    try {
      await reagir(postId, chave, { nome: nomeDe(perfil), email: perfil?.email ?? '' })
    } catch {
      // reverte recarregando o estado real
      getMinhaReacao(postId).then(setMinha).catch(() => {})
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {REACOES.map((r) => {
          const n = contagem[r.chave] ?? 0
          const ativo = minha === r.chave
          return (
            <button
              key={r.chave}
              type="button"
              onClick={() => reagirEmoji(r.chave)}
              aria-pressed={ativo}
              aria-label={r.rotulo}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                ativo ? 'border-marca bg-marca-clara text-marca-escura' : 'border-borda-forte bg-white text-tinta-2 hover:bg-superficie-2'
              }`}
            >
              <span aria-hidden>{r.emoji}</span>
              {n > 0 && <span className="text-xs font-semibold tabular">{n}</span>}
            </button>
          )
        })}
      </div>
      {aviso && !participante && (
        <p className="mt-2 text-xs text-tinta-3">
          <Link href="/entrar" className="font-medium text-marca hover:underline">
            Entre como funcionário
          </Link>{' '}
          para reagir.
        </p>
      )}
    </div>
  )
}

function Comentarios({ postId, perfil }: { postId: string; perfil: Perfil | null }) {
  const participante = ehParticipante(perfil)
  const [aberto, setAberto] = useState(false)
  const [lista, setLista] = useState<any[] | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function abrir() {
    const novo = !aberto
    setAberto(novo)
    if (novo && lista === null) {
      getComentarios(postId).then(setLista).catch(() => setLista([]))
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await enviarComentario(postId, texto, { nome: nomeDe(perfil), email: perfil?.email ?? '' })
      setTexto('')
      setEnviado(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui enviar.')
    }
    setEnviando(false)
  }

  return (
    <div className="mt-4 border-t border-borda pt-3">
      <button type="button" onClick={abrir} className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-2 hover:text-marca">
        <MessageCircle size={15} aria-hidden />
        Comentários
        {lista && lista.length > 0 && <span className="text-tinta-3">({lista.length})</span>}
      </button>

      {aberto && (
        <div className="mt-3 space-y-3">
          {lista === null ? (
            <p className="text-xs text-tinta-3">Carregando…</p>
          ) : lista.length === 0 ? (
            <p className="text-xs text-tinta-3">Ainda não há comentários. Seja o primeiro.</p>
          ) : (
            <ul className="space-y-2">
              {lista.map((c) => (
                <li key={c.id} className="rounded-lg bg-superficie-2 px-3 py-2">
                  <p className="whitespace-pre-line text-sm leading-5 text-tinta-2">{c.texto}</p>
                  <p className="mt-1 text-[11px] text-tinta-3">
                    {c.nome || 'Colega'} · {fmtData(c.criado_em)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {!participante ? (
            <p className="rounded-lg border border-borda bg-white px-3 py-2 text-xs text-tinta-2">
              <Link href="/entrar" className="font-medium text-marca hover:underline">
                Entre como funcionário
              </Link>{' '}
              para comentar.
            </p>
          ) : enviado ? (
            <p className="rounded-lg border border-[#bfe3bf] bg-[#eff8ef] px-3 py-2 text-xs text-[#0b5d0b]">
              Comentário enviado! Ele aparece assim que a equipe aprovar.
            </p>
          ) : (
            <form onSubmit={enviar} className="space-y-2">
              {erro && <p className="text-xs font-medium text-critico">{erro}</p>}
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={2}
                maxLength={800}
                required
                placeholder="Escreva um comentário…"
                className="block w-full rounded-lg border border-borda-forte bg-white px-3 py-2 text-sm text-tinta placeholder:text-tinta-3 focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={enviando}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-marca px-3 py-1.5 text-xs font-semibold text-white hover:bg-marca-escura disabled:opacity-60"
                >
                  <Send size={13} aria-hidden /> {enviando ? 'Enviando…' : 'Comentar'}
                </button>
                <span className="text-[11px] text-tinta-3">Comentários passam por aprovação antes de aparecer.</span>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
