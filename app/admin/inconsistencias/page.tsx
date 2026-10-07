'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { UploadCloud, Hash, Users, Building2, CheckCircle2, Loader2, Download, Printer, X, FileSpreadsheet } from 'lucide-react'
import { CabecalhoPagina, Cartao, Scorecard, Vazio, Aviso, Botao } from '@/components/ui'
import { minhaConta, ehGerente, type Conta } from '@/lib/fb/usuarios'
import { lerInconsistencias, type LeituraInconsistencias } from '@/lib/inconsistencias'
import { salvarInconsistencias, listarInconsistencias, type DocInconsistencias } from '@/lib/fb/inconsistencias'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function rotuloMes(ref: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ref ?? '')
  if (!m) return ref ?? ''
  const nome = MESES[Number(m[2]) - 1] ?? m[2]
  return `${nome[0].toUpperCase()}${nome.slice(1)}/${m[1]}`
}
function mesCurto(ref: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ref ?? '')
  return m ? `${MESES_ABREV[Number(m[2]) - 1] ?? m[2]}/${m[1].slice(2)}` : ref
}
function mesAtual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

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

type ItemMes = { mes: string; setor: string; funcionario: string; quantidade: number }

export default function Inconsistencias() {
  const [eu, setEu] = useState<Conta | null | undefined>(undefined)
  const [docs, setDocs] = useState<DocInconsistencias[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mesSel, setMesSel] = useState('')
  const [fSetor, setFSetor] = useState('')
  const [fFunc, setFFunc] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  function recarregar() {
    listarInconsistencias().then((d) => {
      setDocs(d)
      setMesSel((atual) => (atual && d.some((x) => x.mes_ref === atual) ? atual : d[0]?.mes_ref ?? ''))
    }).catch(() => {}).finally(() => setCarregando(false))
  }
  useEffect(() => { minhaConta().then(setEu).catch(() => setEu(null)); recarregar() }, [])

  const souGerente = ehGerente(eu ?? null)

  // Todos os itens (achatados com o mês), e as listas de setores/funcionários.
  const todos = useMemo<ItemMes[]>(() => docs.flatMap((d) => d.itens.map((i) => ({ mes: d.mes_ref, ...i }))), [docs])
  const setoresDisp = useMemo(() => Array.from(new Set(todos.map((i) => i.setor))).sort((a, b) => a.localeCompare(b)), [todos])
  const funcsDisp = useMemo(() => Array.from(new Set(todos.map((i) => i.funcionario))).sort((a, b) => a.localeCompare(b)), [todos])

  // Recorte pelos filtros de setor/funcionário (independe do mês).
  const filtrados = useMemo(
    () => todos.filter((i) => (!fSetor || i.setor === fSetor) && (!fFunc || i.funcionario === fFunc)),
    [todos, fSetor, fFunc],
  )
  // Itens do mês selecionado (para cartões/barras/ranking).
  const itensMes = useMemo(() => filtrados.filter((i) => i.mes === mesSel), [filtrados, mesSel])
  // Série de evolução: todos os meses, respeitando setor/funcionário.
  const serie = useMemo(() => {
    const ordem = [...docs].map((d) => d.mes_ref).sort((a, b) => a.localeCompare(b))
    return ordem.map((mes) => ({ mes, total: filtrados.filter((i) => i.mes === mes).reduce((s, i) => s + i.quantidade, 0) }))
  }, [docs, filtrados])

  const temFiltro = !!(fSetor || fFunc)

  const [gerandoXlsx, setGerandoXlsx] = useState(false)

  function baixarBlob(blob: Blob, nome: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = nome; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  // CSV — só os dados, sem logo (para importar em outras ferramentas).
  function baixarCsv() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const L = [['Mês', 'Setor', 'Funcionário', 'Quantidade'].map(esc).join(';')]
    for (const i of itensMes) L.push([rotuloMes(i.mes), i.setor, i.funcionario, i.quantidade].map(esc).join(';'))
    baixarBlob(new Blob(['﻿' + L.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `inconsistencias_${mesSel || 'geral'}.csv`)
  }

  // Planilha .xlsx com a identidade visual (logo + cabeçalho), via ExcelJS.
  async function baixarXlsx() {
    setGerandoXlsx(true)
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Inconsistências')
      ws.columns = [{ width: 16 }, { width: 36 }, { width: 30 }, { width: 13 }]

      // Logo no topo (primeiras linhas).
      try {
        const buf = await (await fetch('/logo-soulan.png')).arrayBuffer()
        const bytes = new Uint8Array(buf)
        let bin = ''
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)))
        const imgId = wb.addImage({ base64: btoa(bin), extension: 'png' })
        ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 200, height: 56 } })
      } catch { /* sem logo se o fetch falhar */ }

      // Título, filtros e data (abaixo do logo).
      ws.mergeCells('A5:D5')
      Object.assign(ws.getCell('A5'), { value: `Inconsistências — ${rotuloMes(mesSel)}`, font: { bold: true, size: 14 } })
      ws.mergeCells('A6:D6')
      Object.assign(ws.getCell('A6'), { value: `${filtroTexto} · Gerado em ${new Date().toLocaleString('pt-BR')}`, font: { size: 10, color: { argb: 'FF6B6B6B' } } })

      // Cabeçalho das colunas.
      const hr = ws.getRow(8)
      hr.values = ['Mês', 'Setor', 'Funcionário', 'Quantidade']
      hr.eachCell((c) => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A7897' } }
        c.alignment = { vertical: 'middle' }
      })

      // Dados (respeitando os filtros do recorte atual).
      let r = 9
      for (const i of itensMes) {
        ws.getRow(r).values = [rotuloMes(i.mes), i.setor, i.funcionario, i.quantidade]
        r++
      }
      ws.getColumn(4).alignment = { horizontal: 'center' }

      const out = await wb.xlsx.writeBuffer()
      baixarBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `inconsistencias_${mesSel || 'geral'}.xlsx`)
    } finally {
      setGerandoXlsx(false)
    }
  }

  if (eu === undefined) return <><CabecalhoPagina titulo="Inconsistências" /><p className="p-6 text-sm text-tinta-3">Carregando…</p></>
  if (!souGerente) {
    return (
      <>
        <CabecalhoPagina titulo="Inconsistências" />
        <div className="p-4 sm:p-6"><Aviso tom="alerta" titulo="Acesso restrito">Esta área é da equipe de Gente &amp; Cultura (Master / Super Admin).</Aviso></div>
      </>
    )
  }

  const filtroTexto = [fSetor && `Setor: ${fSetor}`, fFunc && `Funcionário: ${fFunc}`].filter(Boolean).join(' · ') || 'Sem filtros'

  return (
    <>
      <CabecalhoPagina titulo="Inconsistências" descricao="Importe a planilha do mês e acompanhe por setor e funcionário. Números agregados." />

      <div className="space-y-4 p-4 sm:p-6">
        {aviso && <Aviso tom="sucesso">{aviso}</Aviso>}
        {erro && <Aviso tom="erro">{erro}</Aviso>}

        <div className="sem-impressao">
          <UploadInconsistencias onSalvo={(msg) => { setAviso(msg); setErro(null); recarregar() }} setErro={setErro} />
        </div>

        {carregando ? (
          <p className="text-sm text-tinta-3">Carregando…</p>
        ) : docs.length === 0 ? (
          <Vazio titulo="Nenhuma inconsistência importada" descricao="Envie a primeira planilha acima para montar o painel." />
        ) : (
          <>
            {/* Barra de filtros + exportação (não sai no PDF) */}
            <div className="sem-impressao flex flex-wrap items-end gap-3 rounded-xl border border-borda bg-white p-3">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-tinta-3">Mês (cartões/barras/ranking)</span>
                <select value={mesSel} onChange={(e) => setMesSel(e.target.value)} className={ENTRADA_SEL}>
                  {docs.map((d) => <option key={d.mes_ref} value={d.mes_ref}>{rotuloMes(d.mes_ref)}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-tinta-3">Centro de custo / setor</span>
                <select value={fSetor} onChange={(e) => setFSetor(e.target.value)} className={ENTRADA_SEL}>
                  <option value="">Todos os setores</option>
                  {setoresDisp.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-tinta-3">Funcionário</span>
                <input list="lista-funcs" value={fFunc} onChange={(e) => setFFunc(e.target.value)} placeholder="Buscar / todos" className={`${ENTRADA_SEL} min-w-[12rem]`} />
                <datalist id="lista-funcs">{funcsDisp.map((f) => <option key={f} value={f} />)}</datalist>
              </label>
              {temFiltro && (
                <button type="button" onClick={() => { setFSetor(''); setFFunc('') }} className="inline-flex items-center gap-1 rounded-lg border border-borda-forte bg-white px-2.5 py-2 text-xs font-medium text-tinta-2 hover:border-critico hover:text-critico">
                  <X size={13} aria-hidden /> Limpar filtros
                </button>
              )}
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={baixarXlsx} disabled={gerandoXlsx} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-2 text-sm font-medium text-tinta hover:bg-superficie-2 disabled:opacity-60">
                  {gerandoXlsx ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <FileSpreadsheet size={15} aria-hidden />} Planilha
                </button>
                <button type="button" onClick={baixarCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-2 text-sm font-medium text-tinta hover:bg-superficie-2"><Download size={15} aria-hidden /> CSV</button>
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-2 text-sm font-medium text-tinta hover:bg-superficie-2"><Printer size={15} aria-hidden /> PDF</button>
              </div>
            </div>

            {/* Cabeçalho só do PDF (com logo) */}
            <div className="print-only mb-3 border-b border-borda pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-soulan.png" alt="Soulan" style={{ height: 44, width: 'auto' }} />
              <h2 className="mt-2 text-lg font-bold text-tinta">Inconsistências — {rotuloMes(mesSel)}</h2>
              <p className="text-xs text-tinta-3">{filtroTexto} · Gerado em {new Date().toLocaleString('pt-BR')}</p>
            </div>

            <PainelMes itens={itensMes} />

            <Cartao titulo="Evolução — total por mês" apoio={temFiltro ? `Recorte: ${filtroTexto}` : 'Todos os meses com dados.'}>
              <LinhaEvolucao serie={serie} />
            </Cartao>
          </>
        )}
      </div>
    </>
  )
}

const ENTRADA_SEL = 'rounded-lg border border-borda-forte bg-white px-3 py-2 text-sm text-tinta focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca'

// -------------------------------------------------------------
// Painel do mês selecionado (recebe já os itens filtrados do mês)
// -------------------------------------------------------------
function PainelMes({ itens }: { itens: { setor: string; funcionario: string; quantidade: number }[] }) {
  const total = itens.reduce((s, i) => s + i.quantidade, 0)
  const funcionarios = new Set(itens.map((i) => i.funcionario.toLowerCase())).size
  const setoresN = new Set(itens.map((i) => i.setor)).size
  const media = funcionarios > 0 ? Math.round((total / funcionarios) * 10) / 10 : 0

  const porSetor = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of itens) m.set(i.setor, (m.get(i.setor) ?? 0) + i.quantidade)
    return Array.from(m, ([setor, t]) => ({ setor, total: t })).sort((a, b) => b.total - a.total)
  }, [itens])
  const porFunc = useMemo(() => {
    const m = new Map<string, { funcionario: string; setor: string; total: number }>()
    for (const i of itens) {
      const k = i.funcionario.toLowerCase(); const e = m.get(k)
      if (e) e.total += i.quantidade; else m.set(k, { funcionario: i.funcionario, setor: i.setor, total: i.quantidade })
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total)
  }, [itens])

  if (itens.length === 0) return <Cartao titulo="Sem dados para este recorte"><p className="text-sm text-tinta-3">Nenhuma inconsistência no mês/filtros selecionados.</p></Cartao>

  const topSetor = porSetor[0]
  const maxSetor = Math.max(...porSetor.map((s) => s.total), 1)
  const maxFunc = Math.max(...porFunc.map((f) => f.total), 1)

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Scorecard rotulo="Total de inconsistências" valor={total} />
        <Scorecard rotulo="Funcionários envolvidos" valor={funcionarios} />
        <Scorecard rotulo="Setor com mais" valor={topSetor ? topSetor.total : 0} apoio={topSetor?.setor ?? '—'} />
        <Scorecard rotulo="Média por funcionário" valor={media} />
      </div>

      <Cartao titulo="Inconsistências por setor" apoio="Do maior para o menor. Passe o mouse para ver a quantidade.">
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
      </Cartao>

      <Cartao titulo="Ranking de funcionários" apoio="Quem teve mais inconsistências no recorte." padding={false}>
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
              {porFunc.map((f, i) => (
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
// Gráfico de linha — evolução por mês (área + média + rótulos)
// -------------------------------------------------------------
function LinhaEvolucao({ serie }: { serie: { mes: string; total: number }[] }) {
  if (serie.length === 0) return <p className="text-sm text-tinta-3">Sem dados.</p>

  const media = Math.round(serie.reduce((s, p) => s + p.total, 0) / serie.length)
  const primeiro = serie[0], ultimo = serie[serie.length - 1]
  let frase = ''
  if (serie.length >= 2) {
    const delta = ultimo.total - primeiro.total
    const pctv = primeiro.total > 0 ? Math.round((delta / primeiro.total) * 100) : (ultimo.total > 0 ? 100 : 0)
    const dir = delta < 0 ? 'caiu' : delta > 0 ? 'subiu' : 'manteve'
    frase = `De ${mesCurto(primeiro.mes)} a ${mesCurto(ultimo.mes)}: ${dir} de ${primeiro.total} para ${ultimo.total} (${pctv > 0 ? '+' : ''}${pctv}% no período). Média do período: ${media}.`
  } else {
    frase = `${mesCurto(serie[0].mes)}: ${serie[0].total}. Média do período: ${media}.`
  }

  const w = 640, h = 220, padL = 34, padR = 16, padT = 26, padB = 30
  const maxY = Math.max(...serie.map((d) => d.total), media, 1)
  const x = (i: number) => padL + (serie.length === 1 ? (w - padL - padR) / 2 : (i * (w - padL - padR)) / (serie.length - 1))
  const y = (v: number) => padT + (1 - v / maxY) * (h - padT - padB)
  const pts = serie.map((d, i) => ({ x: x(i), y: y(d.total), d }))
  const linha = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${linha} L${pts[pts.length - 1].x.toFixed(1)},${(h - padB).toFixed(1)} L${pts[0].x.toFixed(1)},${(h - padB).toFixed(1)} Z`
  const yMedia = y(media)

  return (
    <div>
      <p className="mb-3 rounded-lg bg-superficie-2 px-3 py-2 text-sm text-tinta-2">{frase}</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Evolução das inconsistências por mês">
        {[0, 0.5, 1].map((t) => {
          const yy = padT + t * (h - padT - padB)
          return <g key={t}>
            <line x1={padL} y1={yy} x2={w - padR} y2={yy} stroke="#ece8df" strokeWidth={1} />
            <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize="10" fill="#8a847a">{Math.round(maxY * (1 - t))}</text>
          </g>
        })}
        {/* Área preenchida */}
        <path d={area} fill="#2a7897" fillOpacity={0.1} />
        {/* Linha de média (tracejada) */}
        <line x1={padL} y1={yMedia} x2={w - padR} y2={yMedia} stroke="#8a6d00" strokeWidth={1.5} strokeDasharray="5 4" />
        <text x={w - padR} y={yMedia - 4} textAnchor="end" fontSize="10" fill="#8a6d00">média {media}</text>
        {/* Linha principal */}
        <path d={linha} fill="none" stroke="#2a7897" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="11" fontWeight="600" fill="#1a1714">{p.d.total}</text>
            <circle cx={p.x} cy={p.y} r={4.5} fill="#2a7897" stroke="#fff" strokeWidth={2}>
              <title>{`${rotuloMes(p.d.mes)}: ${p.d.total} inconsistência(s)`}</title>
            </circle>
            <text x={p.x} y={h - 10} textAnchor="middle" fontSize="10" fill="#57514a">{mesCurto(p.d.mes)}</text>
          </g>
        ))}
      </svg>
    </div>
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
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value || mesAtual())} className={ENTRADA_SEL} />
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
