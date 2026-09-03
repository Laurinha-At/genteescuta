'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ThumbsUp, TriangleAlert, Megaphone, Plus } from 'lucide-react'
import { listarManifestacoes, indicadoresCanal, indicadoresClima } from '@/lib/fb/admin'
import { minhaConta } from '@/lib/fb/usuarios'
import { classificarENPS } from '@/lib/scoring'
import { BotaoLink, CabecalhoPagina, Cartao, Chip, Scorecard, Vazio } from '@/components/ui'
import { Funil } from '@/components/charts/Funil'
import { BarrasCategorias } from '@/components/charts/BarrasCategorias'
import { BarrasArea } from '@/components/charts/BarrasArea'
import { StatusChip } from '@/components/StatusManifestacao'
import { TIPO_MANIFESTACAO_LABEL, FAIXA_LABEL, type ManifestacaoTipo } from '@/lib/types'
import { fmtRelativo, fmtPercentual } from '@/lib/format'

export default function VisaoGeral() {
  const [canal, setCanal] = useState<any>(null)
  const [clima, setClima] = useState<any>(null)
  const [souSuper, setSouSuper] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    minhaConta().then((c) => setSouSuper(!!c?.ativo && c?.nivel === 'super')).catch(() => {})
    Promise.all([listarManifestacoes(), indicadoresClima()])
      .then(([ms, cl]) => {
        setCanal(indicadoresCanal(ms))
        setClima(cl)
      })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  if (carregando || !canal || !clima) {
    return (
      <>
        <CabecalhoPagina titulo="Visão geral" descricao="O que a empresa está dizendo — e o que foi feito a respeito." />
        <div className="p-6 text-sm text-tinta-3">Carregando…</div>
      </>
    )
  }

  const enps = clima.atual?.analise.enps ?? null
  const classENPS = enps ? classificarENPS(enps.enps) : null
  const participacao = clima.atual?.analise.taxaParticipacao ?? null
  const semNada = canal.total === 0 && clima.medicoes.length === 0

  return (
    <>
      <CabecalhoPagina
        titulo="Visão geral"
        descricao="O que a empresa está dizendo — e o que foi feito a respeito."
        acoes={
          souSuper ? (
            <BotaoLink href="/admin/pesquisas/nova">
              <Plus size={15} aria-hidden /> Nova pesquisa
            </BotaoLink>
          ) : undefined
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        {semNada ? (
          <Vazio
            titulo="Ainda não há dados para mostrar"
            descricao="Divulgue o canal para a empresa e crie a primeira pesquisa NR-1. Assim que as respostas chegarem, os indicadores aparecem aqui."
            acao={
              <div className="flex flex-wrap justify-center gap-2">
                {souSuper && <BotaoLink href="/admin/pesquisas/nova">Criar pesquisa NR-1</BotaoLink>}
                <BotaoLink href="/" variante="secundario">Ver o canal público</BotaoLink>
              </div>
            }
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Scorecard rotulo="Manifestações recebidas" valor={canal.total} apoio={`${canal.publicadasNoMural} publicadas no mural`} />
              <Scorecard
                rotulo="Taxa de implementação"
                valor={canal.taxaImplementacao}
                sufixo="%"
                apoio={canal.tempoMedioImplementacao !== null ? `${canal.tempoMedioImplementacao} dias em média até concluir` : 'Nenhuma concluída ainda'}
                destaque={canal.aguardando > 0 ? <Chip faixa="alto">{canal.aguardando} aguardando análise</Chip> : undefined}
              />
              {enps ? (
                <Scorecard
                  rotulo="eNPS"
                  valor={enps.enps > 0 ? `+${enps.enps}` : enps.enps}
                  faixa={classENPS?.faixa}
                  destaque={clima.variacaoENPS !== null ? <Chip faixa="neutro">{clima.variacaoENPS > 0 ? '↑' : clima.variacaoENPS < 0 ? '↓' : '='} {Math.abs(clima.variacaoENPS)} vs. anterior</Chip> : undefined}
                  apoio={classENPS ? classENPS.rotulo : undefined}
                />
              ) : (
                <Scorecard rotulo="eNPS" valor="—" apoio="Sem medição de clima ainda" />
              )}
              <Scorecard
                rotulo="Participação na última pesquisa"
                valor={participacao !== null ? participacao : '—'}
                sufixo={participacao !== null ? '%' : undefined}
                apoio={clima.atual ? `${clima.atual.analise.totalRespostas} respostas em "${clima.atual.pesquisa.titulo}"` : 'Nenhuma pesquisa respondida ainda'}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Cartao titulo="Funil do canal" apoio="Recebidas → analisadas → implementadas" acao={<Link href="/admin/canal" className="text-xs font-medium text-marca hover:underline">Abrir o canal</Link>}>
                <Funil etapas={canal.funil} />
                {canal.tempoMedioAnalise !== null && (
                  <p className="mt-4 border-t border-borda pt-3 text-xs text-tinta-3">
                    Tempo médio até a primeira análise: <strong className="font-semibold text-tinta-2 tabular">{canal.tempoMedioAnalise} dias</strong>
                  </p>
                )}
              </Cartao>
              <Cartao titulo="O que as pessoas mandam" apoio="Distribuição por tipo">
                <BarrasCategorias dados={canal.porTipo} />
              </Cartao>
            </div>

            <Cartao titulo="De onde vêm as manifestações" apoio="Por área — inclusive as anônimas, que registram a área mesmo sem identificar quem enviou">
              <BarrasArea dados={canal.porArea} />
            </Cartao>

            {clima.atual && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Cartao titulo="Principais pontos positivos" apoio="Dimensões com menor exposição ao risco na última medição" acao={<Link href="/admin/clima" className="text-xs font-medium text-marca hover:underline">Ver clima</Link>}>
                  {clima.pontosPositivos.length === 0 ? (
                    <p className="text-sm text-tinta-3">Ainda não há dimensões avaliadas. Rode uma pesquisa NR-1 ou pulso.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {clima.pontosPositivos.map((d: any) => (
                        <li key={d.dimensao} className="flex items-start gap-2.5">
                          <ThumbsUp size={15} className="mt-0.5 flex-none text-[#0b5d0b]" aria-hidden />
                          <span className="min-w-0 flex-1 text-sm text-tinta-2">{d.rotulo}</span>
                          <Chip faixa={d.faixa}>{d.indice}</Chip>
                        </li>
                      ))}
                    </ul>
                  )}
                </Cartao>
                <Cartao titulo="Principais pontos de atenção" apoio="Prioridades para o plano de ação do PGR">
                  {clima.pontosAtencao.length === 0 ? (
                    <p className="text-sm text-tinta-3">Ainda não há dimensões avaliadas. Rode uma pesquisa NR-1 ou pulso.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {clima.pontosAtencao.map((d: any) => (
                        <li key={d.dimensao} className="flex items-start gap-2.5">
                          <TriangleAlert size={15} className="mt-0.5 flex-none text-critico" aria-hidden />
                          <span className="min-w-0 flex-1 text-sm text-tinta-2">
                            {d.rotulo}
                            <span className="block text-xs text-tinta-3">{FAIXA_LABEL[d.faixa as keyof typeof FAIXA_LABEL]}</span>
                          </span>
                          <Chip faixa={d.faixa}>{d.indice}</Chip>
                        </li>
                      ))}
                    </ul>
                  )}
                </Cartao>
              </div>
            )}

            {canal.recentes.length > 0 && (
              <Cartao titulo="Últimas manifestações" acao={<Link href="/admin/canal" className="inline-flex items-center gap-1 text-xs font-medium text-marca hover:underline">Ver todas <ArrowRight size={12} aria-hidden /></Link>} padding={false}>
                <ul className="divide-y divide-borda">
                  {canal.recentes.map((m: any) => (
                    <li key={m.id}>
                      <Link href={`/admin/canal/ver?id=${m.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-superficie-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-tinta">{m.titulo}</span>
                        <Chip faixa="neutro">{TIPO_MANIFESTACAO_LABEL[m.tipo as ManifestacaoTipo]}</Chip>
                        <StatusChip status={m.status} />
                        <span className="w-20 text-right text-xs text-tinta-3">{fmtRelativo(m.criado_em)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Cartao>
            )}

            {canal.publicadasNoMural === 0 && canal.total > 0 && (
              <div className="cartao flex flex-wrap items-center gap-3 border-[#f2dfae] bg-[#fdf7e7] p-4">
                <Megaphone size={18} className="flex-none text-[#6b4a00]" aria-hidden />
                <p className="min-w-0 flex-1 text-sm leading-5 text-[#6b4a00]">
                  <strong className="font-semibold">Nada publicado no mural ainda.</strong> Escutar sem devolver esvazia o canal — publique o que já foi feito.
                </p>
                <BotaoLink href="/admin/mural" variante="secundario">Ir para o mural</BotaoLink>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
