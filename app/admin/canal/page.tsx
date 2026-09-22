'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { UserX } from 'lucide-react'
import { listarManifestacoes } from '@/lib/fb/admin'
import { CabecalhoPagina, Cartao, Chip, Scorecard, Vazio } from '@/components/ui'
import { StatusChip } from '@/components/StatusManifestacao'
import {
  STATUS_MANIFESTACAO_LABEL,
  TIPO_MANIFESTACAO_LABEL,
  PRIORIDADE_LABEL,
  type ManifestacaoStatus,
  type ManifestacaoTipo,
} from '@/lib/types'
import { fmtRelativo } from '@/lib/format'

const STATUS: ManifestacaoStatus[] = ['recebida', 'em_analise', 'analisada', 'em_implementacao', 'implementada', 'nao_aplicavel', 'arquivada']
const TIPOS: ManifestacaoTipo[] = ['contribuicao', 'sugestao', 'reclamacao', 'ideia', 'melhoria', 'reconhecimento']

export default function CanalAdmin() {
  const [todas, setTodas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [fStatus, setFStatus] = useState<string>('')
  const [fTipo, setFTipo] = useState<string>('')

  useEffect(() => {
    listarManifestacoes().then(setTodas).catch(() => {}).finally(() => setCarregando(false))
  }, [])

  const filtradas = useMemo(
    () => todas.filter((m) => (!fStatus || m.status === fStatus) && (!fTipo || m.tipo === fTipo)),
    [todas, fStatus, fTipo],
  )

  const novas = todas.filter((m) => m.status === 'recebida').length
  const emAndamento = todas.filter((m) => ['em_analise', 'analisada', 'em_implementacao'].includes(m.status)).length
  const implementadas = todas.filter((m) => m.status === 'implementada').length

  return (
    <>
      <CabecalhoPagina titulo="Canal Gente Cultura" descricao="Tudo o que chegou pelo canal permanente. Cada movimentação vira retorno para quem enviou." />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Scorecard rotulo="Total recebido" valor={todas.length} />
          <Scorecard rotulo="Aguardando primeira análise" valor={novas} destaque={novas > 0 ? <Chip faixa="alto">Requer ação</Chip> : undefined} />
          <Scorecard rotulo="Em andamento" valor={emAndamento} />
          <Scorecard rotulo="Implementadas" valor={implementadas} apoio={todas.length > 0 ? `${Math.round((implementadas / todas.length) * 100)}% do total` : undefined} />
        </div>

        <Cartao titulo="Filtros">
          <div className="space-y-3">
            <FiltroLinha rotulo="Status">
              <Pilula ativo={!fStatus} onClick={() => setFStatus('')}>Todos</Pilula>
              {STATUS.map((s) => (
                <Pilula key={s} ativo={fStatus === s} onClick={() => setFStatus(s)}>{STATUS_MANIFESTACAO_LABEL[s]}</Pilula>
              ))}
            </FiltroLinha>
            <FiltroLinha rotulo="Tipo">
              <Pilula ativo={!fTipo} onClick={() => setFTipo('')}>Todos</Pilula>
              {TIPOS.map((t) => (
                <Pilula key={t} ativo={fTipo === t} onClick={() => setFTipo(t)}>{TIPO_MANIFESTACAO_LABEL[t]}</Pilula>
              ))}
            </FiltroLinha>
          </div>
        </Cartao>

        <Cartao titulo={`${filtradas.length} ${filtradas.length === 1 ? 'manifestação' : 'manifestações'}`} padding={false}>
          {carregando ? (
            <div className="p-6 text-sm text-tinta-3">Carregando…</div>
          ) : filtradas.length === 0 ? (
            <div className="p-4"><Vazio titulo="Nada por aqui" descricao="Nenhuma manifestação corresponde aos filtros." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <thead>
                  <tr className="border-b border-borda text-left text-xs font-semibold text-tinta-3">
                    <th className="px-4 py-2.5 font-semibold">Quem enviou</th>
                    <th className="px-4 py-2.5 font-semibold">Assunto</th>
                    <th className="px-4 py-2.5 font-semibold">Tipo</th>
                    <th className="px-4 py-2.5 font-semibold">Área</th>
                    <th className="px-4 py-2.5 font-semibold">Prioridade</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Recebida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {filtradas.map((m) => (
                    <tr key={m.id} className="hover:bg-superficie-2">
                      <td className="px-4 py-2.5">
                        {m.anonima ? (
                          <span className="inline-flex items-center gap-1.5 text-tinta-3"><UserX size={13} aria-hidden /> Anônimo</span>
                        ) : (
                          <span className="block max-w-[11rem] truncate font-medium text-tinta">{m.nome ?? '—'}</span>
                        )}
                      </td>
                      <td className="max-w-[22rem] px-4 py-2.5">
                        <Link href={`/admin/canal/ver?id=${m.id}`} className="block truncate font-medium text-tinta hover:text-marca">{m.titulo}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-tinta-2">{TIPO_MANIFESTACAO_LABEL[m.tipo as ManifestacaoTipo]}</td>
                      <td className="px-4 py-2.5 text-tinta-2">{m.area ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <Chip faixa={m.prioridade === 'alta' ? 'alto' : m.prioridade === 'media' ? 'moderado' : 'neutro'}>{PRIORIDADE_LABEL[m.prioridade as keyof typeof PRIORIDADE_LABEL]}</Chip>
                      </td>
                      <td className="px-4 py-2.5"><StatusChip status={m.status} /></td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-tinta-3">{fmtRelativo(m.criado_em)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>
      </div>
    </>
  )
}

function FiltroLinha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 w-14 flex-none text-xs font-semibold text-tinta-3">{rotulo}</span>
      {children}
    </div>
  )
}

function Pilula({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${ativo ? 'border-marca bg-marca-clara text-marca-escura' : 'border-borda-forte bg-white text-tinta-2 hover:bg-superficie-2'}`}
    >
      {children}
    </button>
  )
}
