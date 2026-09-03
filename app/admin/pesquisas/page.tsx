'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, BarChart3 } from 'lucide-react'
import { listarPesquisas } from '@/lib/fb/admin'
import { minhaConta, type Conta } from '@/lib/fb/usuarios'
import { BotaoLink, CabecalhoPagina, Cartao, Chip, Vazio, Aviso } from '@/components/ui'
import { fmtData } from '@/lib/format'
import type { PesquisaStatus } from '@/lib/types'

const CHIP: Record<PesquisaStatus, { faixa: 'neutro' | 'marca' | 'baixo'; rotulo: string }> = {
  rascunho: { faixa: 'neutro', rotulo: 'Rascunho' },
  aberta: { faixa: 'marca', rotulo: 'Aberta' },
  encerrada: { faixa: 'baixo', rotulo: 'Encerrada' },
}

export default function Pesquisas() {
  const [eu, setEu] = useState<Conta | null | undefined>(undefined)
  const [pesquisas, setPesquisas] = useState<any[]>([])
  const [contagem, setContagem] = useState<Record<string, number>>({})
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    minhaConta().then(setEu).catch(() => setEu(null))
    listarPesquisas().then((r) => { setPesquisas(r.pesquisas); setContagem(r.contagem) }).catch(() => {}).finally(() => setCarregando(false))
  }, [])

  const souSuper = !!eu?.ativo && eu?.nivel === 'super'

  if (eu === undefined) {
    return (
      <>
        <CabecalhoPagina titulo="Pesquisas" />
        <p className="p-6 text-sm text-tinta-3">Carregando…</p>
      </>
    )
  }
  if (!souSuper) {
    return (
      <>
        <CabecalhoPagina titulo="Pesquisas" />
        <div className="p-4 sm:p-6">
          <Aviso tom="alerta" titulo="Acesso restrito">
            Apenas o <strong>Super Admin</strong> cria e gerencia pesquisas. Os resultados ficam em{' '}
            <strong>Clima e NR-1</strong>.
          </Aviso>
        </div>
      </>
    )
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Pesquisas"
        descricao="Avaliações de risco psicossocial (NR-1), pulsos e medições de clima."
        acoes={<BotaoLink href="/admin/pesquisas/nova"><Plus size={15} aria-hidden /> Nova pesquisa</BotaoLink>}
      />

      <div className="p-4 sm:p-6">
        {carregando ? (
          <p className="text-sm text-tinta-3">Carregando…</p>
        ) : pesquisas.length === 0 ? (
          <Vazio
            titulo="Nenhuma pesquisa criada ainda"
            descricao="Comece pelo modelo NR-1 completo: já vem com as 12 dimensões de risco psicossocial prontas."
            acao={<BotaoLink href="/admin/pesquisas/nova"><Plus size={15} aria-hidden /> Criar a primeira pesquisa</BotaoLink>}
          />
        ) : (
          <Cartao titulo={`${pesquisas.length} pesquisas`} padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-sm">
                <thead>
                  <tr className="border-b border-borda text-left text-xs font-semibold text-tinta-3">
                    <th className="px-4 py-2.5 font-semibold">Título</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Respostas</th>
                    <th className="px-4 py-2.5 font-semibold">Participação</th>
                    <th className="px-4 py-2.5 font-semibold">Prazo</th>
                    <th className="px-4 py-2.5 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {pesquisas.map((p) => {
                    const n = contagem[p.id] ?? 0
                    const chip = CHIP[p.status as PesquisaStatus]
                    const taxa = p.publico_alvo && p.publico_alvo > 0 ? Math.min(100, Math.round((n / p.publico_alvo) * 100)) : null
                    return (
                      <tr key={p.id} className="hover:bg-superficie-2">
                        <td className="px-4 py-2.5">
                          <Link href={`/admin/pesquisas/ver?id=${p.id}`} className="font-medium text-tinta hover:text-marca">{p.titulo}</Link>
                          <span className="block text-xs text-tinta-3">criada em {fmtData(p.criado_em)}</span>
                        </td>
                        <td className="px-4 py-2.5"><Chip faixa={chip.faixa}>{chip.rotulo}</Chip></td>
                        <td className="px-4 py-2.5 font-medium text-tinta tabular">{n}</td>
                        <td className="px-4 py-2.5 text-tinta-2 tabular">{taxa === null ? '—' : `${taxa}%`}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-tinta-2">{p.fecha_em ? fmtData(p.fecha_em) : 'sem prazo'}</td>
                        <td className="px-4 py-2.5 text-right">
                          <Link href={`/admin/pesquisas/painel?id=${p.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-marca hover:underline"><BarChart3 size={13} aria-hidden /> Painel</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Cartao>
        )}
      </div>
    </>
  )
}
