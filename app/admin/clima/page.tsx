'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ThumbsUp, TriangleAlert, Users } from 'lucide-react'
import { indicadoresClima } from '@/lib/fb/admin'
import { classificarENPS } from '@/lib/scoring'
import { BotaoLink, CabecalhoPagina, Cartao, Chip, Scorecard, Vazio } from '@/components/ui'
import { BarraENPS } from '@/components/charts/BarraENPS'
import { EvolucaoENPS } from '@/components/charts/EvolucaoENPS'
import { BarrasRisco } from '@/components/charts/BarrasRisco'
import { BotaoImprimir } from '@/components/BotaoImprimir'
import { FAIXA_LABEL } from '@/lib/types'
import { fmtData, fmtPercentual } from '@/lib/format'

export default function Clima() {
  const [clima, setClima] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    indicadoresClima().then(setClima).catch(() => {}).finally(() => setCarregando(false))
  }, [])

  if (carregando || !clima) {
    return (
      <>
        <CabecalhoPagina titulo="Clima e NR-1" descricao="eNPS, participação, satisfação e os fatores de risco psicossocial." />
        <div className="p-6 text-sm text-tinta-3">Carregando…</div>
      </>
    )
  }

  if (!clima.atual) {
    return (
      <>
        <CabecalhoPagina titulo="Clima e NR-1" descricao="eNPS, participação, satisfação e os fatores de risco psicossocial." />
        <div className="p-4 sm:p-6">
          <Vazio titulo="Nenhuma pesquisa respondida ainda" descricao="Os indicadores de clima se montam a partir das respostas. Crie uma pesquisa e abra para as pessoas." acao={<BotaoLink href="/admin/pesquisas/nova">Criar a primeira pesquisa</BotaoLink>} />
        </div>
      </>
    )
  }

  const a = clima.atual.analise
  const enps = a.enps
  const classENPS = enps ? classificarENPS(enps.enps) : null
  const pontosENPS = clima.medicoes.filter((m: any) => m.analise.enps && m.analise.enps.total > 0).map((m: any) => ({ rotulo: m.pesquisa.titulo, enps: m.analise.enps.enps, respostas: m.analise.enps.total }))

  return (
    <>
      <CabecalhoPagina titulo="Clima e NR-1" descricao={`Última medição: ${clima.atual.pesquisa.titulo} · ${a.totalRespostas} respostas`} acoes={<BotaoImprimir />} />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {enps ? (
            <Scorecard rotulo="eNPS" valor={enps.enps > 0 ? `+${enps.enps}` : enps.enps} faixa={classENPS?.faixa} destaque={clima.variacaoENPS !== null ? <Chip faixa="neutro">{clima.variacaoENPS > 0 ? '↑' : clima.variacaoENPS < 0 ? '↓' : '='} {Math.abs(clima.variacaoENPS)} vs. anterior</Chip> : undefined} apoio={classENPS?.rotulo} />
          ) : <Scorecard rotulo="eNPS" valor="—" apoio="Não medido nesta pesquisa" />}
          <Scorecard rotulo="Participação" valor={a.taxaParticipacao !== null ? a.taxaParticipacao : '—'} sufixo={a.taxaParticipacao !== null ? '%' : undefined} apoio={a.publicoAlvo ? `${a.totalRespostas} de ${a.publicoAlvo} convidados` : 'Informe o público-alvo'} />
          <Scorecard rotulo="Índice de satisfação" valor={a.satisfacao ?? '—'} sufixo={a.satisfacao !== null ? '/100' : undefined} destaque={clima.variacaoSatisfacao !== null ? <Chip faixa="neutro">{clima.variacaoSatisfacao > 0 ? '↑' : clima.variacaoSatisfacao < 0 ? '↓' : '='} {Math.abs(clima.variacaoSatisfacao)} pts</Chip> : undefined} apoio="Satisfação geral declarada" />
          <Scorecard rotulo="Índice geral de risco" valor={a.indiceGeral} sufixo="/100" faixa={a.faixaGeral} apoio="Média das dimensões psicossociais" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {enps && enps.total > 0 && <Cartao titulo="Composição do eNPS" apoio="Quem recomendaria a empresa como lugar para trabalhar"><BarraENPS enps={enps} /></Cartao>}
          <Cartao titulo="Evolução do eNPS" apoio="Uma barra por medição, da mais antiga à mais recente"><EvolucaoENPS pontos={pontosENPS} /></Cartao>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Cartao titulo="Principais pontos positivos" apoio="O que está sustentando o clima — vale proteger">
            {clima.pontosPositivos.length === 0 ? <p className="text-sm text-tinta-3">Rode uma pesquisa NR-1 ou pulso.</p> : (
              <ul className="space-y-3">{clima.pontosPositivos.map((d: any) => (
                <li key={d.dimensao} className="flex items-start gap-2.5"><ThumbsUp size={15} className="mt-0.5 flex-none text-[#0b5d0b]" aria-hidden /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-tinta">{d.rotulo}</p><p className="mt-0.5 text-xs leading-4 text-tinta-3">Melhor item: {d.itens[d.itens.length - 1]?.enunciado ?? '—'}</p></div><Chip faixa={d.faixa}>{d.indice}</Chip></li>
              ))}</ul>
            )}
          </Cartao>
          <Cartao titulo="Principais pontos de atenção" apoio="Entram primeiro no plano de ação do PGR">
            {clima.pontosAtencao.length === 0 ? <p className="text-sm text-tinta-3">Rode uma pesquisa NR-1 ou pulso.</p> : (
              <ul className="space-y-3">{clima.pontosAtencao.map((d: any) => (
                <li key={d.dimensao} className="flex items-start gap-2.5"><TriangleAlert size={15} className="mt-0.5 flex-none text-critico" aria-hidden /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-tinta">{d.rotulo}</p><p className="mt-0.5 text-xs leading-4 text-tinta-3">Pior item: {d.itens[0]?.enunciado ?? '—'}</p></div><Chip faixa={d.faixa}>{d.indice}</Chip></li>
              ))}</ul>
            )}
          </Cartao>
        </div>

        {a.dimensoes.length > 0 && (
          <Cartao titulo="Fatores de risco psicossocial na última medição" apoio={clima.atual.pesquisa.titulo} acao={<Link href={`/admin/pesquisas/painel?id=${clima.atual.pesquisa.id}`} className="text-xs font-medium text-marca hover:underline">Abrir o painel completo</Link>}>
            <BarrasRisco dados={a.dimensoes.map((d: any) => ({ rotulo: d.rotulo, indice: d.indice, faixa: d.faixa, respondentes: d.respondentes, detalhe: d.itens[0] ? `Pior item: ${d.itens[0].enunciado}` : undefined }))} />
          </Cartao>
        )}

        <Cartao titulo="Histórico de medições" apoio="Todas as pesquisas com resposta" padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-borda text-left text-xs font-semibold text-tinta-3">
                  <th className="px-4 py-2.5 font-semibold">Pesquisa</th><th className="px-4 py-2.5 font-semibold">Respostas</th><th className="px-4 py-2.5 font-semibold">Participação</th><th className="px-4 py-2.5 font-semibold">eNPS</th><th className="px-4 py-2.5 font-semibold">Satisfação</th><th className="px-4 py-2.5 font-semibold">Risco geral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {clima.medicoes.map((m: any) => (
                  <tr key={m.pesquisa.id} className="hover:bg-superficie-2">
                    <td className="px-4 py-2.5"><Link href={`/admin/pesquisas/painel?id=${m.pesquisa.id}`} className="font-medium text-tinta hover:text-marca">{m.pesquisa.titulo}</Link><span className="block text-xs text-tinta-3">{fmtData(m.pesquisa.criado_em)}</span></td>
                    <td className="px-4 py-2.5 text-tinta-2 tabular">{m.analise.totalRespostas}</td>
                    <td className="px-4 py-2.5 text-tinta-2 tabular">{m.analise.taxaParticipacao !== null ? fmtPercentual(m.analise.taxaParticipacao) : '—'}</td>
                    <td className="px-4 py-2.5 font-medium text-tinta tabular">{m.analise.enps && m.analise.enps.total > 0 ? (m.analise.enps.enps > 0 ? `+${m.analise.enps.enps}` : m.analise.enps.enps) : '—'}</td>
                    <td className="px-4 py-2.5 text-tinta-2 tabular">{m.analise.satisfacao ?? '—'}</td>
                    <td className="px-4 py-2.5">{m.analise.dimensoes.length > 0 ? <Chip faixa={m.analise.faixaGeral}>{m.analise.indiceGeral} · {FAIXA_LABEL[m.analise.faixaGeral as keyof typeof FAIXA_LABEL]}</Chip> : <span className="text-tinta-3">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>

        <div className="flex items-start gap-2.5 rounded-md border border-borda bg-white px-4 py-3">
          <Users size={16} className="mt-0.5 flex-none text-tinta-3" aria-hidden />
          <p className="text-xs leading-4 text-tinta-2">Todos os números são agregados. Recortes com menos de {a.minGrupo} respostas ficam ocultos para preservar o anonimato.</p>
        </div>
      </div>
    </>
  )
}
