'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { UploadCloud, Hash, Users, Building2, CheckCircle2, Loader2 } from 'lucide-react'
import { CabecalhoPagina, Cartao, Scorecard, Vazio, Aviso, Botao } from '@/components/ui'
import { minhaConta, ehGerente, type Conta } from '@/lib/fb/usuarios'
import { lerInconsistencias, type LeituraInconsistencias } from '@/lib/inconsistencias'
import { salvarInconsistencias, listarInconsistencias, type DocInconsistencias } from '@/lib/fb/inconsistencias'

const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
function rotuloMes(ref: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ref ?? '')
  if (!m) return ref ?? ''
  const nome = MESES_PT[Number(m[2]) - 1] ?? m[2]
  return `${nome[0].toUpperCase()}${nome.slice(1)}/${m[1]}`
}
function mesAtual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Paleta oficial por setor (alto contraste); fallback para os demais.
const PALETA = ['#0ea5e9', '#65a30d', '#b45309', '#7c3aed', '#be123c', '#0891b2', '#4f46e5', '#15803d']
function chaveSetor(s: string): string {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' e ').replace(/\//g, ' ').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase()
}
const COR_SETOR = new Map(Object.entries({
  'Administrativo/Financeiro': '#2563EB',
  'Atração & Seleção': '#16A34A',
  'Gente & Cultura/Cadastro e Suprimentos': '#F59E0B',
  'Thomas': '#DC2626',
  'Suporte e Dados': '#06B6D4',
  'Marketing': '#9333EA',
}).map(([k, v]) => [chaveSetor(k), v]))
function corDoSetor(setor: string, idx: number): string {
  return COR_SETOR.get(chaveSetor(setor)) ?? PALETA[idx % PALETA.length]
}

export default function Inconsistencias() {
  const [eu, setEu] = useState<Conta | null | undefined>(undefined)
  const [docs, setDocs] = useState<DocInconsistencias[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mesSel, setMesSel] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  function recarregar() {
    listarInconsistencias().then((d) => {
      setDocs(d)
      setMesSel((atual) => (atual && d.some((x) => x.mes_ref === atual) ? atual : d[0]?.mes_ref ?? ''))
    }).catch(() => {}).finally(() => setCarregando(false))
  }
  useEffect(() => {
    minhaConta().then(setEu).catch(() => setEu(null))
    recarregar()
  }, [])

  const souGerente = ehGerente(eu ?? null)
  const dadoMes = useMemo(() => docs.find((d) => d.mes_ref === mesSel) ?? null, [docs, mesSel])

  if (eu === undefined) {
    return <><CabecalhoPagina titulo="Inconsistências" /><p className="p-6 text-sm text-tinta-3">Carregando…</p></>
  }
  if (!souGerente) {
    return (
      <>
        <CabecalhoPagina titulo="Inconsistências" />
        <div className="p-4 sm:p-6">
          <Aviso tom="alerta" titulo="Acesso restrito">Esta área é da equipe de Gente &amp; Cultura (Master / Super Admin).</Aviso>
        </div>
      </>
    )
  }

  return (
    <>
      <CabecalhoPagina titulo="Inconsistências" descricao="Importe a planilha do mês e acompanhe por setor e funcionário. Números agregados." />

      <div className="space-y-4 p-4 sm:p-6">
        {aviso && <Aviso tom="sucesso">{aviso}</Aviso>}
        {erro && <Aviso tom="erro">{erro}</Aviso>}

        <UploadInconsistencias onSalvo={(msg) => { setAviso(msg); setErro(null); recarregar() }} setErro={setErro} />

        {carregando ? (
          <p className="text-sm text-tinta-3">Carregando…</p>
        ) : docs.length === 0 ? (
          <Vazio titulo="Nenhuma inconsistência importada" descricao="Envie a primeira planilha acima para montar o painel." />
        ) : (
          <>
            {/* Filtro de mês */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-tinta-2">Mês:</span>
              <select value={mesSel} onChange={(e) => setMesSel(e.target.value)} className="rounded-lg border border-borda-forte bg-white px-3 py-1.5 text-sm text-tinta focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca">
                {docs.map((d) => <option key={d.mes_ref} value={d.mes_ref}>{rotuloMes(d.mes_ref)}</option>)}
              </select>
            </div>

            {dadoMes && <PainelMes dado={dadoMes} />}

            {/* Evolução (todos os meses com dados) */}
            <Cartao titulo="Evolução — total de inconsistências por mês" apoio="Considera todos os meses com dados.">
              <LinhaEvolucao dados={[...docs].sort((a, b) => a.mes_ref.localeCompare(b.mes_ref))} />
            </Cartao>
          </>
        )}
      </div>
    </>
  )
}

// -------------------------------------------------------------
// Painel do mês selecionado
// -------------------------------------------------------------
function PainelMes({ dado }: { dado: DocInconsistencias }) {
  const porSetor = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of dado.itens) m.set(i.setor, (m.get(i.setor) ?? 0) + i.quantidade)
    return Array.from(m, ([setor, total]) => ({ setor, total })).sort((a, b) => b.total - a.total)
  }, [dado])
  const porFuncionario = useMemo(() => {
    const m = new Map<string, { funcionario: string; setor: string; total: number }>()
    for (const i of dado.itens) {
      const k = i.funcionario.toLowerCase()
      const e = m.get(k)
      if (e) e.total += i.quantidade
      else m.set(k, { funcionario: i.funcionario, setor: i.setor, total: i.quantidade })
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total)
  }, [dado])

  const media = dado.funcionarios > 0 ? Math.round((dado.total / dado.funcionarios) * 10) / 10 : 0
  const topSetor = porSetor[0]
  const maxSetor = Math.max(...porSetor.map((s) => s.total), 1)
  const maxFunc = Math.max(...porFuncionario.map((f) => f.total), 1)

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Scorecard rotulo="Total de inconsistências" valor={dado.total} />
        <Scorecard rotulo="Funcionários envolvidos" valor={dado.funcionarios} />
        <Scorecard rotulo="Setor com mais" valor={topSetor ? topSetor.total : 0} apoio={topSetor?.setor ?? '—'} />
        <Scorecard rotulo="Média por funcionário" valor={media} />
      </div>

      <Cartao titulo="Inconsistências por setor" apoio="Do maior para o menor. Passe o mouse para ver a quantidade.">
        {porSetor.length === 0 ? <p className="text-sm text-tinta-3">Sem dados.</p> : (
          <ul className="space-y-1.5">
            {porSetor.map((s, i) => (
              <li key={s.setor} className="grid grid-cols-[minmax(7rem,13rem)_1fr_3rem] items-center gap-3" title={`${s.setor}: ${s.total}`}>
                <span className="truncate text-xs text-tinta-2">{s.setor}</span>
                <span className="relative block h-4 rounded-sm bg-plano">
                  <span className="absolute inset-y-0 left-0 rounded-sm" style={{ width: `${Math.max((s.total / maxSetor) * 100, s.total > 0 ? 3 : 0)}%`, background: corDoSetor(s.setor, i) }} />
                </span>
                <strong className="text-right text-xs font-semibold text-tinta tabular">{s.total}</strong>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao titulo="Ranking de funcionários" apoio="Quem teve mais inconsistências no mês." padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-borda text-left text-xs font-semibold text-tinta-3">
                <th className="px-4 py-2.5 font-semibold">#</th>
                <th className="px-4 py-2.5 font-semibold">Funcionário</th>
                <th className="px-4 py-2.5 font-semibold">Setor</th>
                <th className="px-4 py-2.5 font-semibold">Qtd.</th>
                <th className="px-4 py-2.5 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {porFuncionario.map((f, i) => (
                <tr key={f.funcionario} className="hover:bg-superficie-2" title={`${f.funcionario}: ${f.total}`}>
                  <td className="px-4 py-2.5 text-tinta-3 tabular">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-tinta">{f.funcionario}</td>
                  <td className="px-4 py-2.5 text-tinta-2">{f.setor}</td>
                  <td className="px-4 py-2.5 font-semibold text-tinta tabular">{f.total}</td>
                  <td className="px-4 py-2.5">
                    <span className="block h-2.5 w-full min-w-[4rem] rounded-full bg-plano">
                      <span className="block h-full rounded-full" style={{ width: `${(f.total / maxFunc) * 100}%`, background: corDoSetor(f.setor, 0) }} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </>
  )
}

// -------------------------------------------------------------
// Gráfico de linha — evolução por mês
// -------------------------------------------------------------
function LinhaEvolucao({ dados }: { dados: DocInconsistencias[] }) {
  if (dados.length === 0) return <p className="text-sm text-tinta-3">Sem dados.</p>
  const w = 640, h = 180, padL = 36, padR = 12, padT = 12, padB = 28
  const maxY = Math.max(...dados.map((d) => d.total), 1)
  const x = (i: number) => padL + (dados.length === 1 ? (w - padL - padR) / 2 : (i * (w - padL - padR)) / (dados.length - 1))
  const y = (v: number) => padT + (1 - v / maxY) * (h - padT - padB)
  const pontos = dados.map((d, i) => ({ x: x(i), y: y(d.total), d }))
  const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Evolução das inconsistências por mês">
      {[0, 0.5, 1].map((t) => {
        const yy = padT + t * (h - padT - padB)
        return <g key={t}>
          <line x1={padL} y1={yy} x2={w - padR} y2={yy} stroke="#e7e2d8" strokeWidth={1} />
          <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize="10" fill="#8a847a">{Math.round(maxY * (1 - t))}</text>
        </g>
      })}
      <path d={linha} fill="none" stroke="#2a7897" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pontos.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="#2a7897" stroke="#fff" strokeWidth={1.5}>
            <title>{`${rotuloMes(p.d.mes_ref)}: ${p.d.total} inconsistência(s)`}</title>
          </circle>
          <text x={p.x} y={h - 10} textAnchor="middle" fontSize="10" fill="#57514a">{rotuloMes(p.d.mes_ref).slice(0, 3)}</text>
        </g>
      ))}
    </svg>
  )
}

// -------------------------------------------------------------
// Upload + confirmação
// -------------------------------------------------------------
function UploadInconsistencias({ onSalvo, setErro }: { onSalvo: (msg: string) => void; setErro: (s: string | null) => void }) {
  const [mes, setMes] = useState(mesAtual())
  const [leitura, setLeitura] = useState<LeituraInconsistencias | null>(null)
  const [nome, setNome] = useState('')
  const [lendo, setLendo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function aoEscolher(file: File | null) {
    if (!file) return
    setErro(null); setLeitura(null); setLendo(true); setNome(file.name)
    try {
      const r = await lerInconsistencias(file)
      if (r.itens.length === 0) setErro('Não encontrei as colunas (Setor/Área · Funcionário · Quantidade). Confira a planilha.')
      setLeitura(r)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui ler a planilha.')
    }
    setLendo(false)
  }

  const funcionarios = leitura ? new Set(leitura.itens.map((i) => i.funcionario.toLowerCase())).size : 0
  const setores = leitura ? new Set(leitura.itens.map((i) => i.setor)).size : 0
  const total = leitura ? leitura.itens.reduce((s, i) => s + i.quantidade, 0) : 0

  async function confirmar() {
    if (!leitura) return
    setSalvando(true); setErro(null)
    try {
      await salvarInconsistencias(mes, leitura.itens)
      setLeitura(null); setNome('')
      if (inputRef.current) inputRef.current.value = ''
      onSalvo(`Importado ${rotuloMes(mes)}: ${total} inconsistência(s) em ${funcionarios} funcionário(s). (Substituiu os dados anteriores do mês.)`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui salvar.')
    }
    setSalvando(false)
  }

  return (
    <div className="cartao-g space-y-4 p-5">
      <div>
        <h2 className="text-[0.9375rem] font-semibold text-tinta">Importar inconsistências</h2>
        <p className="mt-1 text-xs leading-5 text-tinta-3">
          Planilha .xlsx com 3 colunas: <strong>Setor/Área</strong>, <strong>Funcionário</strong> e <strong>Quantidade de Inconsistências</strong>.
          Reimportar a mesma competência substitui os dados daquele mês.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-tinta">Mês de referência</span>
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value || mesAtual())} className="rounded-lg border border-borda-forte bg-white px-3 py-2 text-sm text-tinta focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca" />
        </label>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-4 py-2.5 text-sm font-semibold text-tinta transition-colors hover:border-marca hover:text-marca-texto">
          <UploadCloud size={15} aria-hidden /> {lendo ? 'Lendo…' : 'Escolher planilha (.xlsx)'}
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => aoEscolher(e.target.files?.[0] ?? null)} />
        </label>
        {nome && <span className="text-xs text-tinta-3">{nome}</span>}
      </div>

      {leitura && leitura.itens.length > 0 && (
        <div className="space-y-3 border-t border-borda pt-4">
          <p className="text-sm font-semibold text-tinta">Confira antes de salvar — {rotuloMes(mes)}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat Icone={Hash} rotulo="Total de inconsistências" valor={total} />
            <MiniStat Icone={Users} rotulo="Funcionários" valor={funcionarios} />
            <MiniStat Icone={Building2} rotulo="Setores" valor={setores} />
          </div>

          {leitura.desconhecidos.length > 0 && (
            <Aviso tom="alerta" titulo="Setores não reconhecidos">
              Estes setores não casaram com a lista oficial e serão salvos como estão:{' '}
              <strong>{leitura.desconhecidos.join(', ')}</strong>. Confira a grafia na planilha, se preferir corrigir antes.
            </Aviso>
          )}

          <Botao type="button" onClick={confirmar} disabled={salvando}>
            {salvando ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Salvando…</> : <><CheckCircle2 size={15} aria-hidden /> Salvar {rotuloMes(mes)}</>}
          </Botao>
        </div>
      )}
    </div>
  )
}

function MiniStat({ Icone, rotulo, valor }: { Icone: typeof Hash; rotulo: string; valor: number }) {
  return (
    <div className="rounded-lg border border-borda bg-white px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-tinta-3"><Icone size={14} className="text-marca" aria-hidden /> {rotulo}</p>
      <p className="mt-1 text-[1.5rem] font-[680] leading-none text-tinta tabular">{valor}</p>
    </div>
  )
}
