'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import { BarChart3, Play, Square, Undo2, ExternalLink, Trash2, Pencil } from 'lucide-react'
import { getPesquisa, contarRespostas, mudarStatusPesquisa, excluirPesquisa } from '@/lib/fb/admin'
import { BotaoLink, CabecalhoPagina, Cartao, Chip, Aviso } from '@/components/ui'
import { CopiarTexto } from '@/components/CopiarTexto'
import { fmtData } from '@/lib/format'
import { ROTULO_DIMENSAO } from '@/lib/nr1-template'
import type { PesquisaStatus } from '@/lib/types'

const CHIP: Record<PesquisaStatus, { faixa: 'neutro' | 'marca' | 'baixo'; rotulo: string }> = {
  rascunho: { faixa: 'neutro', rotulo: 'Rascunho' },
  aberta: { faixa: 'marca', rotulo: 'Aberta para respostas' },
  encerrada: { faixa: 'baixo', rotulo: 'Encerrada' },
}
const ROTULO_TIPO: Record<string, string> = {
  likert5: 'escala 1 a 5', enps: 'eNPS 0 a 10', nota10: 'nota 0 a 10', escolha_unica: 'escolha única',
  escolha_multipla: 'múltipla escolha', texto: 'texto curto', texto_longo: 'texto livre', sim_nao: 'sim ou não',
}
const IDENT: Record<string, string> = {
  confidencial: 'Confidencial — e-mail só para evitar duplicidade',
  identificada: 'Identificada — e-mail visível para a administração',
  anonima: 'Anônima — nenhum dado de identificação',
}

function Detalhe() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get('id') ?? ''
  const [p, setP] = useState<any>(null)
  const [respostas, setRespostas] = useState(0)
  const [qr, setQr] = useState('')
  const [link, setLink] = useState('')
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'nao'>('carregando')

  function recarregar() {
    if (!id) {
      setEstado('nao')
      return
    }
    getPesquisa(id)
      .then((d) => {
        if (!d) {
          setEstado('nao')
          return
        }
        setP(d)
        setEstado('ok')
        contarRespostas(id).then(setRespostas).catch(() => {})
        const url = `${window.location.origin}/p?slug=${d.slug}`
        setLink(url)
        QRCode.toString(url, { type: 'svg', margin: 1, width: 180, color: { dark: '#1a1714', light: '#ffffff' } })
          .then(setQr)
          .catch(() => {})
      })
      .catch(() => setEstado('nao'))
  }
  useEffect(recarregar, [id])

  if (estado === 'carregando') return <div className="p-6 text-sm text-tinta-3">Carregando…</div>
  if (estado === 'nao' || !p)
    return <CabecalhoPagina titulo="Pesquisa não encontrada" voltar={{ href: '/admin/pesquisas', rotulo: 'Voltar' }} />

  const chip = CHIP[p.status as PesquisaStatus]
  const secoes = (p.secoes ?? []).slice().sort((a: any, b: any) => a.ordem - b.ordem)
  const perguntas = p.perguntas ?? []

  async function mudar(status: string) {
    await mudarStatusPesquisa(id, status)
    recarregar()
  }
  async function excluir() {
    if (!confirm('Excluir esta pesquisa? Não dá para desfazer.')) return
    await excluirPesquisa(id)
    router.push('/admin/pesquisas')
  }

  return (
    <>
      <CabecalhoPagina
        titulo={p.titulo}
        voltar={{ href: '/admin/pesquisas', rotulo: 'Voltar às pesquisas' }}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <Chip faixa={chip.faixa}>{chip.rotulo}</Chip>
            <span className="text-xs text-tinta-3">
              {perguntas.length} perguntas · {respostas} {respostas === 1 ? 'resposta' : 'respostas'}
            </span>
          </span>
        }
        acoes={
          <>
            <BotaoLink href={`/admin/pesquisas/editar?id=${id}`} variante="secundario">
              <Pencil size={15} aria-hidden /> Editar
            </BotaoLink>
            <BotaoLink href={`/admin/pesquisas/painel?id=${id}`} variante="secundario">
              <BarChart3 size={15} aria-hidden /> Ver painel
            </BotaoLink>
            {p.status === 'rascunho' && (
              <button type="button" onClick={() => mudar('aberta')} className="botao-gradiente inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white">
                <Play size={15} aria-hidden /> Abrir para respostas
              </button>
            )}
            {p.status === 'aberta' && (
              <button type="button" onClick={() => mudar('encerrada')} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3.5 py-2 text-sm font-medium text-tinta hover:bg-superficie-2">
                <Square size={15} aria-hidden /> Encerrar
              </button>
            )}
            {p.status === 'encerrada' && (
              <button type="button" onClick={() => mudar('aberta')} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3.5 py-2 text-sm font-medium text-tinta hover:bg-superficie-2">
                <Undo2 size={15} aria-hidden /> Reabrir
              </button>
            )}
          </>
        }
      />

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          {p.status === 'rascunho' && (
            <Aviso tom="alerta" titulo="Esta pesquisa ainda é um rascunho">
              O link já existe, mas não aceita respostas enquanto você não clicar em <strong>Abrir para respostas</strong>.
            </Aviso>
          )}
          {secoes.map((secao: any) => {
            const doBloco = perguntas.filter((q: any) => q.secao_id === secao.id).sort((a: any, b: any) => a.ordem - b.ordem)
            return (
              <Cartao key={secao.id} titulo={secao.titulo} apoio={secao.descricao ?? undefined} acao={secao.dimensao ? <Chip faixa="neutro">{ROTULO_DIMENSAO[secao.dimensao] ?? secao.dimensao}</Chip> : undefined}>
                <ol className="space-y-2.5">
                  {doBloco.map((q: any, i: number) => (
                    <li key={q.id} className="flex gap-2.5 text-sm">
                      <span className="w-5 flex-none text-right text-tinta-3 tabular">{i + 1}.</span>
                      <span className="min-w-0">
                        <span className="text-tinta-2">{q.enunciado}</span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          <Chip faixa="neutro">{ROTULO_TIPO[q.tipo] ?? q.tipo}</Chip>
                          {q.invertida && <Chip faixa="neutro">item protetivo</Chip>}
                          {q.critica && <Chip faixa="critico">gera alerta</Chip>}
                          {!q.obrigatoria && <Chip faixa="neutro">opcional</Chip>}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Cartao>
            )
          })}
        </div>

        <div className="space-y-4">
          <Cartao titulo="Link para enviar às pessoas">
            <div className="rounded-md border border-borda bg-superficie-2 p-2.5">
              <p className="break-all font-mono text-xs leading-5 text-tinta-2">{link}</p>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <CopiarTexto texto={link} rotulo="Copiar link" />
              <Link href={`/p?slug=${p.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-md border border-borda-forte bg-white px-2.5 py-1.5 text-xs font-medium text-tinta-2 hover:bg-superficie-2">
                <ExternalLink size={13} aria-hidden /> Abrir
              </Link>
            </div>
            <div className="mt-4 border-t border-borda pt-4">
              <p className="mb-2 text-xs font-medium text-tinta-3">QR code — para cartaz, mural ou tela de fábrica</p>
              <div className="inline-block rounded-md border border-borda bg-white p-2 [&_svg]:block [&_svg]:h-40 [&_svg]:w-40" dangerouslySetInnerHTML={{ __html: qr }} />
            </div>
          </Cartao>

          <Cartao titulo="Configuração">
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-tinta-3">Identificação</dt><dd className="font-medium text-tinta">{IDENT[p.identificacao] ?? p.identificacao}</dd></div>
              <div><dt className="text-xs text-tinta-3">Pessoas convidadas</dt><dd className="font-medium text-tinta">{p.publico_alvo ?? 'não informado'}</dd></div>
              <div><dt className="text-xs text-tinta-3">Prazo</dt><dd className="font-medium text-tinta">{p.fecha_em ? fmtData(p.fecha_em) : 'sem prazo definido'}</dd></div>
              <div><dt className="text-xs text-tinta-3">Grupo mínimo no painel</dt><dd className="font-medium text-tinta">{p.min_grupo} respostas</dd></div>
            </dl>
          </Cartao>

          {respostas === 0 && (
            <Cartao titulo="Zona de risco">
              <p className="text-xs leading-4 text-tinta-2">Enquanto não houver respostas, esta pesquisa pode ser excluída sem perder nada.</p>
              <button type="button" onClick={excluir} className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[#f0c2c2] bg-white px-3 py-1.5 text-xs font-medium text-critico hover:bg-[#fdeaea]">
                <Trash2 size={13} aria-hidden /> Excluir pesquisa
              </button>
            </Cartao>
          )}
        </div>
      </div>
    </>
  )
}

export default function DetalhePesquisa() {
  return (
    <Suspense fallback={null}>
      <Detalhe />
    </Suspense>
  )
}
