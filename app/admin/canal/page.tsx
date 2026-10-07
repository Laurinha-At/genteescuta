'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from '@/components/LinkSemPrefetch'
import { UserX, CheckCircle2, XCircle, Check, X as XIcon, Loader2 } from 'lucide-react'
import { listarManifestacoes, triarManifestacao } from '@/lib/fb/admin'
import { usuarioAtual } from '@/lib/fb/auth'
import { CabecalhoPagina, Cartao, Chip, Scorecard, Vazio, Botao } from '@/components/ui'
import { BarraFiltros } from '@/components/BarraFiltros'
import { StatusChip } from '@/components/StatusManifestacao'
import {
  STATUS_MANIFESTACAO_LABEL,
  TIPO_MANIFESTACAO_LABEL,
  TRIAGEM_LABEL,
  AREAS_SUGESTAO,
  IMPACTOS,
  type ManifestacaoStatus,
  type ManifestacaoTipo,
  type Triagem,
} from '@/lib/types'
import { fmtRelativo } from '@/lib/format'

const STATUS: ManifestacaoStatus[] = ['recebida', 'em_analise', 'analisada', 'em_implementacao', 'implementada', 'nao_aplicavel', 'arquivada']
const TIPOS: ManifestacaoTipo[] = ['contribuicao', 'reconhecimento']
const TRIAGENS: Triagem[] = ['pendente', 'aprovada', 'reprovada']

function triagemFaixa(t?: string) {
  return t === 'aprovada' ? 'baixo' : t === 'reprovada' ? 'critico' : 'moderado'
}
const semAcento = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function CanalAdmin() {
  const [todas, setTodas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fCategoria, setFCategoria] = useState('')
  const [fTriagem, setFTriagem] = useState('')
  const [acaoBusy, setAcaoBusy] = useState('')         // id em ação
  const [reprovando, setReprovando] = useState<any | null>(null) // manifestação sendo reprovada
  const [erroAcao, setErroAcao] = useState<string | null>(null)

  useEffect(() => {
    listarManifestacoes().then(setTodas).catch(() => {}).finally(() => setCarregando(false))
  }, [])

  function aplicar(id: string, triagem: string, autor: string) {
    setTodas((ts) => ts.map((x) => (x.id === id ? { ...x, triagem, triado_por: autor } : x)))
  }

  async function aprovar(m: any) {
    setErroAcao(null); setAcaoBusy(m.id)
    try {
      const autor = usuarioAtual()?.email ?? 'Equipe'
      await triarManifestacao(m.id, { triagem: 'aprovada', autor })
      aplicar(m.id, 'aprovada', autor)
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : 'Não consegui aprovar.')
    }
    setAcaoBusy('')
  }

  async function confirmarReprovacao(motivo: string) {
    if (!reprovando) return
    setErroAcao(null); setAcaoBusy(reprovando.id)
    try {
      const autor = usuarioAtual()?.email ?? 'Equipe'
      await triarManifestacao(reprovando.id, { triagem: 'reprovada', resposta_privada: motivo, autor })
      aplicar(reprovando.id, 'reprovada', autor)
      setReprovando(null)
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : 'Não consegui reprovar.')
    }
    setAcaoBusy('')
  }

  const termo = semAcento(busca.trim())
  const filtradas = useMemo(
    () => todas.filter((m) => {
      if (fStatus && m.status !== fStatus) return false
      if (fTipo && m.tipo !== fTipo) return false
      if (fCategoria && (m.categoria ?? m.area) !== fCategoria) return false
      if (fTriagem && (m.triagem ?? 'pendente') !== fTriagem) return false
      if (termo) {
        const alvo = semAcento([m.titulo, m.nome, m.descricao, m.problema, m.sugestao, m.categoria, m.area, m.departamento].join(' '))
        if (!alvo.includes(termo)) return false
      }
      return true
    }),
    [todas, fStatus, fTipo, fCategoria, fTriagem, termo],
  )

  const novas = todas.filter((m) => m.status === 'recebida').length
  const pendentesTriagem = todas.filter((m) => (m.triagem ?? 'pendente') === 'pendente').length
  const aprovadas = todas.filter((m) => m.triagem === 'aprovada').length
  const contribuicoes = todas.filter((m) => m.tipo === 'contribuicao')

  // ---- Indicadores ----
  const porCategoria = AREAS_SUGESTAO.map((a) => ({ rotulo: a, n: contribuicoes.filter((m) => (m.categoria ?? m.area) === a).length })).filter((x) => x.n > 0)
  const porImpacto = IMPACTOS.map((imp) => ({ rotulo: imp, n: contribuicoes.filter((m) => Array.isArray(m.impactos) && m.impactos.includes(imp)).length })).filter((x) => x.n > 0)
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const noMes = todas.filter((m) => (m.criado_em ?? '') >= inicioMes).length

  return (
    <>
      <CabecalhoPagina titulo="Canal Gente Cultura" descricao="Tudo o que chegou pelo canal permanente. Cada movimentação vira retorno para quem enviou." />

      <div className="space-y-4 p-4 sm:p-6">
        {erroAcao && (
          <p className="rounded-lg border border-[#f0c2c2] bg-[#fdeaea] px-4 py-3 text-sm text-[#8a1f1f]">{erroAcao}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Scorecard rotulo="Total recebido" valor={todas.length} apoio={`${noMes} neste mês`} />
          <Scorecard rotulo="Pendentes de triagem" valor={pendentesTriagem} destaque={pendentesTriagem > 0 ? <Chip faixa="alto">Requer ação</Chip> : undefined} />
          <Scorecard rotulo="Aprovadas" valor={aprovadas} />
          <Scorecard rotulo="Aguardando 1ª análise" valor={novas} />
        </div>

        <BarraFiltros
          busca={busca}
          onBusca={setBusca}
          buscaPlaceholder="Buscar por assunto, nome, setor ou texto…"
          grupos={[
            { rotulo: 'Triagem', valor: fTriagem, onChange: setFTriagem, opcoes: TRIAGENS.map((t) => ({ valor: t, rotulo: TRIAGEM_LABEL[t] })) },
            { rotulo: 'Status', valor: fStatus, onChange: setFStatus, opcoes: STATUS.map((s) => ({ valor: s, rotulo: STATUS_MANIFESTACAO_LABEL[s] })) },
            { rotulo: 'Tipo', valor: fTipo, onChange: setFTipo, opcoes: TIPOS.map((t) => ({ valor: t, rotulo: TIPO_MANIFESTACAO_LABEL[t] })) },
            { rotulo: 'Área da sugestão', valor: fCategoria, onChange: setFCategoria, opcoes: AREAS_SUGESTAO.map((a) => ({ valor: a, rotulo: a })) },
          ]}
        />

        {(porCategoria.length > 0 || porImpacto.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-2">
            {porCategoria.length > 0 && (
              <Cartao titulo="Sugestões por área" apoio="Contagem por categoria (só contribuições).">
                <ul className="space-y-2">
                  {porCategoria.map((c) => <BarraIndicador key={c.rotulo} rotulo={c.rotulo} n={c.n} total={contribuicoes.length} />)}
                </ul>
              </Cartao>
            )}
            {porImpacto.length > 0 && (
              <Cartao titulo="Impacto principal esperado" apoio="Quantas sugestões apontam cada impacto.">
                <ul className="space-y-2">
                  {porImpacto.map((c) => <BarraIndicador key={c.rotulo} rotulo={c.rotulo} n={c.n} total={contribuicoes.length} />)}
                </ul>
              </Cartao>
            )}
          </div>
        )}

        <Cartao titulo={`${filtradas.length} ${filtradas.length === 1 ? 'manifestação' : 'manifestações'}`} padding={false}>
          {carregando ? (
            <div className="p-6 text-sm text-tinta-3">Carregando…</div>
          ) : filtradas.length === 0 ? (
            <div className="p-4"><Vazio titulo="Nada por aqui" descricao="Nenhuma manifestação corresponde aos filtros." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] text-sm">
                <thead>
                  <tr className="border-b border-borda text-left text-xs font-semibold text-tinta-3">
                    <th className="px-4 py-2.5 font-semibold">Quem enviou</th>
                    <th className="px-4 py-2.5 font-semibold">Assunto</th>
                    <th className="px-4 py-2.5 font-semibold">Tipo</th>
                    <th className="px-4 py-2.5 font-semibold">Área / categoria</th>
                    <th className="px-4 py-2.5 font-semibold">Triagem</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Aprovar / Reprovar</th>
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
                          <span className="block max-w-[11rem] truncate font-medium text-tinta">{m.nome ?? '-'}</span>
                        )}
                      </td>
                      <td className="max-w-[22rem] px-4 py-2.5">
                        <Link href={`/admin/canal/ver?id=${m.id}`} className="block truncate font-medium text-tinta hover:text-marca">{m.titulo}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-tinta-2">{TIPO_MANIFESTACAO_LABEL[m.tipo as ManifestacaoTipo] ?? m.tipo}</td>
                      <td className="max-w-[16rem] px-4 py-2.5 text-tinta-2"><span className="block truncate">{m.categoria ?? m.area ?? '-'}</span></td>
                      <td className="px-4 py-2.5"><Chip faixa={triagemFaixa(m.triagem)}>{TRIAGEM_LABEL[(m.triagem ?? 'pendente') as Triagem]}</Chip></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title="Aprovar"
                            disabled={acaoBusy === m.id || m.triagem === 'aprovada'}
                            onClick={() => aprovar(m)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${m.triagem === 'aprovada' ? 'bg-[#eef7e3] text-verde-escuro' : 'border border-[#cfe6b8] bg-white text-verde-escuro hover:bg-[#f4faec]'}`}
                          >
                            {acaoBusy === m.id ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <CheckCircle2 size={14} aria-hidden />}
                            {m.triagem === 'aprovada' ? 'Aprovada' : 'Aprovar'}
                          </button>
                          <button
                            type="button"
                            title="Reprovar"
                            disabled={acaoBusy === m.id || m.triagem === 'reprovada'}
                            onClick={() => { setErroAcao(null); setReprovando(m) }}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${m.triagem === 'reprovada' ? 'bg-[#fdeaea] text-critico' : 'border border-[#f0c2c2] bg-white text-critico hover:bg-[#fdeaea]'}`}
                          >
                            <XCircle size={14} aria-hidden />
                            {m.triagem === 'reprovada' ? 'Reprovada' : 'Reprovar'}
                          </button>
                        </div>
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

      {reprovando && (
        <ModalReprovar
          m={reprovando}
          busy={acaoBusy === reprovando.id}
          onConfirmar={confirmarReprovacao}
          onFechar={() => setReprovando(null)}
        />
      )}
    </>
  )
}

function ModalReprovar({ m, busy, onConfirmar, onFechar }: {
  m: any; busy: boolean; onConfirmar: (motivo: string) => void; onFechar: () => void
}) {
  const [motivo, setMotivo] = useState('')
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-tinta">Reprovar manifestação</h3>
            <p className="mt-0.5 text-xs text-tinta-3">Escreva um motivo para o autor. Fica guardado no histórico.</p>
          </div>
          <button type="button" onClick={onFechar} className="rounded-lg p-1.5 text-tinta-3 hover:bg-superficie-2" aria-label="Fechar"><XIcon size={18} aria-hidden /></button>
        </div>
        <p className="mt-3 truncate rounded-lg bg-superficie-2 px-3 py-2 text-sm text-tinta-2" title={m.titulo}>{m.titulo}</p>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Explique o motivo e o que pode ser ajustado…"
          className="mt-3 block w-full rounded-lg border border-borda-forte bg-white px-3 py-2 text-sm text-tinta focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Botao type="button" variante="secundario" onClick={onFechar} disabled={busy}>Cancelar</Botao>
          <Botao type="button" variante="perigo" onClick={() => onConfirmar(motivo)} disabled={busy || motivo.trim().length < 5}>
            {busy ? 'Reprovando…' : <><Check size={15} aria-hidden /> Confirmar reprovação</>}
          </Botao>
        </div>
      </div>
    </div>
  )
}

function BarraIndicador({ rotulo, n, total }: { rotulo: string; n: number; total: number }) {
  const pct = total > 0 ? Math.round((n / total) * 100) : 0
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-tinta-2">{rotulo}</span>
        <span className="flex-none font-semibold text-tinta tabular">{n} <span className="text-xs font-normal text-tinta-3">({pct}%)</span></span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-superficie-2">
        <div className="h-full rounded-full bg-marca" style={{ width: `${pct}%` }} />
      </div>
    </li>
  )
}
