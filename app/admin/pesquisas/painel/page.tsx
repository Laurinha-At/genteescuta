'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, Download, ThumbsUp, TriangleAlert } from 'lucide-react'
import { painelPesquisa, exportarCsv } from '@/lib/fb/admin'
import { classificarENPS } from '@/lib/scoring'
import { CabecalhoPagina, Cartao, Chip, Scorecard, Vazio, BotaoLink } from '@/components/ui'
import { BarrasRisco } from '@/components/charts/BarrasRisco'
import { MapaCalor } from '@/components/charts/MapaCalor'
import { BarraENPS } from '@/components/charts/BarraENPS'
import { BotaoImprimir } from '@/components/BotaoImprimir'
import { FAIXA_LABEL } from '@/lib/types'
import { fmtData, fmtPercentual } from '@/lib/format'

function baixarCsv(csv: string, arquivo: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = arquivo
  a.click()
  URL.revokeObjectURL(url)
}

function Painel() {
  const params = useSearchParams()
  const id = params.get('id') ?? ''
  const [dados, setDados] = useState<{ pesquisa: any; analise: any } | null>(null)
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'nao'>('carregando')

  useEffect(() => {
    if (!id) return setEstado('nao')
    painelPesquisa(id).then((d) => { setDados(d); setEstado('ok') }).catch(() => setEstado('nao'))
  }, [id])

  if (estado === 'carregando') return <div className="p-6 text-sm text-tinta-3">Carregando…</div>
  if (estado === 'nao' || !dados) return <CabecalhoPagina titulo="Pesquisa não encontrada" voltar={{ href: '/admin/pesquisas', rotulo: 'Voltar' }} />

  const { pesquisa, analise: a } = dados

  if (a.totalRespostas === 0) {
    return (
      <>
        <CabecalhoPagina titulo={`Painel — ${pesquisa.titulo}`} voltar={{ href: `/admin/pesquisas/ver?id=${id}`, rotulo: 'Voltar à pesquisa' }} />
        <div className="p-4 sm:p-6">
          <Vazio titulo="Nenhuma resposta ainda" descricao="O painel se monta sozinho conforme as respostas chegam." acao={<BotaoLink href={`/admin/pesquisas/ver?id=${id}`} variante="secundario">Ver o link de divulgação</BotaoLink>} />
        </div>
      </>
    )
  }

  const classENPS = a.enps ? classificarENPS(a.enps.enps) : null
  const linhasMapa = a.dimensoes.map((d: any) => ({ chave: d.dimensao, rotulo: d.rotulo }))
  const colunasMapa = a.porArea.map((r: any) => ({ chave: r.chave, rotulo: r.rotulo, n: r.n, suprimido: r.suprimido, valores: r.porDimensao }))

  async function exportar() {
    const { csv, arquivo } = await exportarCsv(id)
    baixarCsv(csv, arquivo)
  }

  return (
    <>
      <CabecalhoPagina
        titulo={`Painel — ${pesquisa.titulo}`}
        voltar={{ href: `/admin/pesquisas/ver?id=${id}`, rotulo: 'Voltar à pesquisa' }}
        descricao={`${a.totalRespostas} respostas${pesquisa.fecha_em ? ` · prazo ${fmtData(pesquisa.fecha_em)}` : ''}`}
        acoes={
          <>
            <button type="button" onClick={exportar} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3.5 py-2 text-sm font-medium text-tinta hover:bg-superficie-2">
              <Download size={15} aria-hidden /> Exportar CSV
            </button>
            <BotaoImprimir />
          </>
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Scorecard rotulo="Índice geral de risco" valor={a.indiceGeral} sufixo="/100" faixa={a.faixaGeral} apoio="Média das 12 dimensões avaliadas" />
          <Scorecard rotulo="Respostas recebidas" valor={a.totalRespostas} apoio={a.taxaParticipacao !== null ? `${fmtPercentual(a.taxaParticipacao)} de ${a.publicoAlvo} convidados` : 'Informe o público-alvo para ver a participação'} />
          {a.enps ? (
            <Scorecard rotulo="eNPS" valor={a.enps.enps > 0 ? `+${a.enps.enps}` : a.enps.enps} faixa={classENPS?.faixa} destaque={classENPS ? <Chip faixa="neutro">{classENPS.rotulo}</Chip> : undefined} apoio={`${a.enps.percentualPromotores}% promotores · ${a.enps.percentualDetratores}% detratores`} />
          ) : (
            <Scorecard rotulo="eNPS" valor="—" apoio="Não medido nesta pesquisa" />
          )}
          <Scorecard rotulo="Índice de satisfação" valor={a.satisfacao ?? '—'} sufixo={a.satisfacao !== null ? '/100' : undefined} apoio="Satisfação geral declarada, de 0 a 100" />
        </div>

        {a.alertas.length > 0 && (
          <Cartao titulo="Alertas de assédio, violência e discriminação" apoio="Situações relatadas ao menos uma vez. Exigem apuração formal.">
            <ul className="space-y-2.5">
              {a.alertas.map((alerta: any) => (
                <li key={alerta.perguntaId} className={`flex items-start gap-3 rounded-md border p-3 ${alerta.gravidade === 'grave' ? 'border-[#f0c2c2] bg-[#fdeaea]' : 'border-[#f2dfae] bg-[#fdf7e7]'}`}>
                  <AlertTriangle size={16} className={`mt-0.5 flex-none ${alerta.gravidade === 'grave' ? 'text-critico' : 'text-[#6b4a00]'}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-5 text-tinta">{alerta.enunciado}</p>
                    <p className="mt-1 text-xs text-tinta-2"><strong className="font-semibold tabular">{alerta.ocorrencias} {alerta.ocorrencias === 1 ? 'pessoa relatou' : 'pessoas relataram'}</strong> ({alerta.percentual}% de quem respondeu este item)</p>
                  </div>
                  <Chip faixa={alerta.gravidade === 'grave' ? 'critico' : 'alto'}>{alerta.gravidade === 'grave' ? 'Grave' : 'Atenção'}</Chip>
                </li>
              ))}
            </ul>
          </Cartao>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Cartao titulo="Principais pontos positivos" apoio="Dimensões com menor exposição ao risco">
            <ul className="space-y-2.5">
              {a.pontosPositivos.map((d: any) => (
                <li key={d.dimensao} className="flex items-start gap-2.5">
                  <ThumbsUp size={15} className="mt-0.5 flex-none text-[#0b5d0b]" aria-hidden />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium text-tinta">{d.rotulo}</p><p className="text-xs text-tinta-3">Índice {d.indice} — {FAIXA_LABEL[d.faixa as keyof typeof FAIXA_LABEL]}</p></div>
                  <Chip faixa={d.faixa}>{d.indice}</Chip>
                </li>
              ))}
            </ul>
          </Cartao>
          <Cartao titulo="Principais pontos de atenção" apoio="Dimensões que devem entrar primeiro no plano de ação do PGR">
            <ul className="space-y-2.5">
              {a.pontosAtencao.map((d: any) => (
                <li key={d.dimensao} className="flex items-start gap-2.5">
                  <TriangleAlert size={15} className="mt-0.5 flex-none text-critico" aria-hidden />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium text-tinta">{d.rotulo}</p><p className="text-xs text-tinta-3">Pior item: {d.itens[0]?.enunciado ?? '—'}</p></div>
                  <Chip faixa={d.faixa}>{d.indice}</Chip>
                </li>
              ))}
            </ul>
          </Cartao>
        </div>

        <Cartao titulo="Índice de risco por dimensão" apoio="Ordenado da maior para a menor exposição">
          <BarrasRisco dados={a.dimensoes.map((d: any) => ({ rotulo: d.rotulo, indice: d.indice, faixa: d.faixa, respondentes: d.respondentes, detalhe: d.itens[0] ? `Pior item: ${d.itens[0].enunciado}` : undefined }))} />
        </Cartao>

        <Cartao titulo="Mapa de risco por área" apoio="Onde cada fator pesa mais. É este cruzamento que direciona a ação por setor.">
          <MapaCalor linhas={linhasMapa} colunas={colunasMapa} minGrupo={a.minGrupo} rotuloColuna="Área" />
        </Cartao>

        {a.enps && a.enps.total > 0 && (
          <Cartao titulo="Composição do eNPS" apoio="O quanto as pessoas recomendariam a empresa como lugar para trabalhar">
            <BarraENPS enps={a.enps} />
          </Cartao>
        )}

        <Cartao titulo="Os 15 itens de maior risco" apoio="Perguntas individuais — o nível em que se escreve a medida de controle" padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-borda text-left text-xs font-semibold text-tinta-3">
                  <th className="px-4 py-2.5 font-semibold">Pergunta</th>
                  <th className="px-4 py-2.5 font-semibold">Dimensão</th>
                  <th className="px-4 py-2.5 font-semibold">Índice</th>
                  <th className="px-4 py-2.5 font-semibold">Faixa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {a.dimensoes
                  .flatMap((d: any) => d.itens.map((i: any) => ({ ...i, dimensao: d.rotulo })))
                  .filter((i: any) => i.respondentes > 0)
                  .sort((x: any, y: any) => y.indice - x.indice)
                  .slice(0, 15)
                  .map((i: any) => (
                    <tr key={i.perguntaId} className="hover:bg-superficie-2">
                      <td className="max-w-[26rem] px-4 py-2.5 text-tinta-2">{i.enunciado}</td>
                      <td className="px-4 py-2.5 text-xs text-tinta-3">{i.dimensao}</td>
                      <td className="px-4 py-2.5 font-semibold text-tinta tabular">{i.indice}</td>
                      <td className="px-4 py-2.5"><Chip faixa={i.faixa}>{FAIXA_LABEL[i.faixa as keyof typeof FAIXA_LABEL]}</Chip></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Cartao>

        {a.abertas.map((bloco: any) => (
          <Cartao key={bloco.perguntaId} titulo={bloco.enunciado} apoio={`${bloco.textos.length} ${bloco.textos.length === 1 ? 'resposta' : 'respostas'} — leia antes de fechar o plano de ação`}>
            <ul className="space-y-2.5">
              {bloco.textos.slice(0, 40).map((t: any, i: number) => (
                <li key={i} className="rounded-md border border-borda bg-superficie-2 px-3 py-2.5">
                  <p className="whitespace-pre-line text-sm leading-5 text-tinta-2">{t.texto}</p>
                  {t.area && <p className="mt-1.5 text-xs text-tinta-3">{t.area}</p>}
                </li>
              ))}
            </ul>
          </Cartao>
        ))}
      </div>
    </>
  )
}

export default function PainelPesquisa() {
  return (
    <Suspense fallback={null}>
      <Painel />
    </Suspense>
  )
}
