'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { UploadCloud, ShieldCheck, Users, CalendarRange, Hash, Save, Trash2, Printer, Download, Building2 } from 'lucide-react'
import { CabecalhoPagina, Cartao, Vazio } from '@/components/ui'
import {
  listarRegistrosHumor,
  salvarRegistrosHumor,
  limparRegistrosHumor,
  getClassificacaoHumor,
  salvarClassificacaoHumor,
} from '@/lib/fb/humor'
import {
  decodificar,
  parseHumorCsv,
  resumo,
  distribuicao,
  termometro,
  porSetor,
  porCargo,
  mesesDisponiveis,
  rotuloMes,
  CLASSIFICACAO_PADRAO,
  COR_HUMOR,
  COR_CATEGORIA,
  HUMORES,
  type Categoria,
  type Humor,
  type RegistroHumor,
} from '@/lib/humor'

function fmtData(ts: number | null): string {
  if (ts === null) return '—'
  return new Date(ts).toLocaleDateString('pt-BR')
}
export default function HumorEquipe() {
  const [registros, setRegistros] = useState<RegistroHumor[]>([])
  const [classif, setClassif] = useState<Record<Humor, Categoria>>({ ...CLASSIFICACAO_PADRAO })
  const [carregando, setCarregando] = useState(true)
  const [importando, setImportando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvandoClass, setSalvandoClass] = useState(false)
  const [classSalva, setClassSalva] = useState(false)
  const [limpando, setLimpando] = useState(false)
  const [periodo, setPeriodo] = useState('geral')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([listarRegistrosHumor(), getClassificacaoHumor()])
      .then(([regs, cls]) => {
        setRegistros(regs)
        setClassif(cls)
      })
      .catch(() => setErro('Não consegui carregar os dados de humor do banco.'))
      .finally(() => setCarregando(false))
  }, [])

  async function importar(file: File) {
    setErro(null)
    setAviso(null)
    setImportando(true)
    try {
      const buf = await file.arrayBuffer()
      const texto = decodificar(buf)
      const { registros: lidos, lidas, ignoradas, setoresDesconhecidos } = parseHumorCsv(texto)
      if (lidos.length === 0) {
        throw new Error('Nenhum registro válido encontrado. Confira se o arquivo é o CSV de humor.')
      }
      const existentes = new Set(registros.map((r) => r.id))
      const novos = lidos.filter((r) => !existentes.has(r.id))
      const gravados = await salvarRegistrosHumor(novos)
      setRegistros((atual) => {
        const mapa = new Map(atual.map((r) => [r.id, r]))
        for (const r of novos) mapa.set(r.id, r)
        return Array.from(mapa.values())
      })
      const dupli = lidos.length - novos.length
      setAviso(
        `Importados ${gravados} novos registros de ${file.name}. ` +
          `${dupli > 0 ? `${dupli} já existiam (não duplicados). ` : ''}` +
          `${ignoradas > 0 ? `${ignoradas} linhas ignoradas. ` : ''}` +
          `(${lidas} linhas com data lidas no total.)` +
          (setoresDesconhecidos.length > 0
            ? ` ⚠️ Setores não reconhecidos (agrupados em "Outros"): ${setoresDesconhecidos.join(', ')}.`
            : ''),
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui ler este arquivo.')
    }
    setImportando(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function mudarClasse(h: Humor, c: Categoria) {
    setClassif((atual) => ({ ...atual, [h]: c }))
    setClassSalva(false)
  }
  async function salvarClasse() {
    setSalvandoClass(true)
    try {
      await salvarClassificacaoHumor(classif)
      setClassSalva(true)
    } catch {
      setErro('Não consegui salvar a classificação.')
    }
    setSalvandoClass(false)
  }

  async function limparTudo() {
    if (
      !confirm(
        'Isto APAGA todos os registros de humor do banco, de forma permanente. ' +
          'Depois você poderá importar uma planilha nova do zero. Tem certeza?',
      )
    )
      return
    setErro(null)
    setAviso(null)
    setLimpando(true)
    try {
      const n = await limparRegistrosHumor()
      setRegistros([])
      if (inputRef.current) inputRef.current.value = ''
      setAviso(`Pronto: ${n} registro(s) apagado(s). Agora é só importar uma planilha nova do zero.`)
    } catch {
      setErro('Não consegui limpar os registros.')
    }
    setLimpando(false)
  }

  const meses = useMemo(() => mesesDisponiveis(registros), [registros])
  const periodoAtual = periodo === 'geral' || meses.includes(periodo) ? periodo : 'geral'
  const rotuloPeriodo = periodoAtual === 'geral' ? 'Geral' : rotuloMes(periodoAtual)

  const regsP = useMemo(
    () => (periodoAtual === 'geral' ? registros : registros.filter((x) => x.dia.startsWith(periodoAtual))),
    [registros, periodoAtual],
  )

  const r = useMemo(() => resumo(regsP), [regsP])
  const term = useMemo(() => termometro(regsP, classif), [regsP, classif])
  const dist = useMemo(() => distribuicao(regsP), [regsP])
  const setores = useMemo(() => porSetor(regsP, classif), [regsP, classif])
  const cargos = useMemo(() => porCargo(regsP, classif), [regsP, classif])

  const participacao = useMemo(() => [...setores].sort((a, b) => b.total - a.total), [setores])

  function baixar(conteudo: string, arquivo: string, tipo: string) {
    const blob = new Blob([conteudo], { type: tipo })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = arquivo
    a.click()
    URL.revokeObjectURL(url)
  }

  function baixarPdf() {
    window.print()
  }

  function baixarCsv() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const linha = (arr: unknown[]) => arr.map(esc).join(';')
    const pctHumor = (n: number) => `${Math.round((n / (r.total || 1)) * 100)}%`
    const L: string[] = []
    L.push(esc(`Relatório de Humor — ${rotuloPeriodo}`))
    L.push('')
    L.push(esc('Resumo'))
    L.push(linha(['Registros', r.total]))
    L.push(linha(['Pessoas participantes', r.pessoas]))
    L.push(linha(['Período coberto', `${fmtData(r.inicio)} a ${fmtData(r.fim)}`]))
    L.push('')
    L.push(esc('Termômetro (categoria; quantidade; percentual)'))
    L.push(linha(['Positivos', term.pos, `${term.pctPos}%`]))
    L.push(linha(['Neutros', term.neu, `${term.pctNeu}%`]))
    L.push(linha(['Negativos', term.neg, `${term.pctNeg}%`]))
    L.push('')
    L.push(esc('Por humor (humor; quantidade; percentual)'))
    for (const d of dist) L.push(linha([d.humor, d.n, pctHumor(d.n)]))
    L.push('')
    L.push(esc('Por setor (setor; registros; participação; positivos; neutros; negativos; índice de clima)'))
    for (const s of participacao) L.push(linha([s.setor, s.total, `${s.pct}%`, s.pos, s.neu, s.neg, s.indice]))
    const csv = '﻿' + L.join('\r\n')
    baixar(csv, `humor-${periodoAtual === 'geral' ? 'geral' : periodoAtual}.csv`, 'text/csv;charset=utf-8')
  }

  const botaoImportar = (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3.5 py-2 text-sm font-medium text-tinta transition-colors hover:bg-superficie-2">
      <UploadCloud size={15} aria-hidden />
      {importando ? 'Importando…' : 'Importar humor (CSV)'}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) importar(f)
        }}
      />
    </label>
  )

  return (
    <>
      <CabecalhoPagina
        titulo="Humor da equipe (clima)"
        descricao="Importe o CSV de humor e veja os indicadores agregados. Nomes e matrículas ficam só no banco — nunca aparecem aqui."
        acoes={
          registros.length > 0 ? (
            <>
              {botaoImportar}
              <button
                type="button"
                onClick={limparTudo}
                disabled={limpando}
                className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3.5 py-2 text-sm font-medium text-tinta transition-colors hover:border-[#e2b4b4] hover:bg-plano hover:text-critico disabled:opacity-60"
              >
                <Trash2 size={15} aria-hidden /> {limpando ? 'Limpando…' : 'Limpar tudo'}
              </button>
            </>
          ) : undefined
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        {aviso && (
          <p className="rounded-lg border border-[#bfe3bf] bg-[#eff8ef] px-4 py-3 text-sm text-[#0b5d0b]">
            {aviso}
          </p>
        )}
        {erro && (
          <p className="rounded-lg border border-[#f0c2c2] bg-[#fdeaea] px-4 py-3 text-sm text-[#8a1f1f]">
            {erro}
          </p>
        )}

        {carregando ? (
          <p className="p-2 text-sm text-tinta-3">Carregando…</p>
        ) : registros.length === 0 ? (
          <>
            <label
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-borda-forte bg-white px-6 py-16 text-center transition-colors hover:bg-superficie-2"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-marca-clara text-marca">
                <UploadCloud size={26} aria-hidden />
              </span>
              <span className="mt-4 text-[0.9375rem] font-semibold text-tinta">
                {importando ? 'Importando…' : 'Importar humor (CSV)'}
              </span>
              <span className="mt-1 text-xs text-tinta-3">
                Arquivo separado por ponto-e-vírgula, no formato padrão de humor.
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) importar(f)
                }}
              />
            </label>
            <NotaPrivacidade />
          </>
        ) : (
          <>
            {/* Barra de período + downloads (não sai no PDF) */}
            <div className="sem-impressao flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                <span className="font-medium text-tinta-2">Período:</span>
                <select
                  value={periodoAtual}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className="rounded-lg border border-borda-forte bg-white px-3 py-1.5 text-sm text-tinta focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
                >
                  <option value="geral">Geral (todos os meses)</option>
                  {meses.map((m) => (
                    <option key={m} value={m}>
                      {rotuloMes(m)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={baixarPdf}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3.5 py-2 text-sm font-medium text-tinta hover:bg-superficie-2"
                >
                  <Printer size={15} aria-hidden /> Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={baixarCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3.5 py-2 text-sm font-medium text-tinta hover:bg-superficie-2"
                >
                  <Download size={15} aria-hidden /> Baixar CSV
                </button>
              </div>
            </div>

            {/* Título do relatório (aparece no PDF/impressão) */}
            <div className="print-only">
              <h2 className="text-lg font-bold text-tinta">Relatório de Humor da equipe — {rotuloPeriodo}</h2>
              <p className="text-xs text-tinta-3">
                {r.total} registros · {r.pessoas} pessoas · {fmtData(r.inicio)} a {fmtData(r.fim)}
              </p>
            </div>

            {/* 1) Resumo geral */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat icone={<Hash size={16} aria-hidden />} rotulo="Registros" valor={String(r.total)} />
              <Stat icone={<Users size={16} aria-hidden />} rotulo="Pessoas participantes" valor={String(r.pessoas)} />
              <Stat
                icone={<CalendarRange size={16} aria-hidden />}
                rotulo="Período coberto"
                valor={`${fmtData(r.inicio)} – ${fmtData(r.fim)}`}
                pequeno
              />
            </div>

            {/* 5) Termômetro geral + classificação editável */}
            <Cartao titulo="Termômetro geral do clima">
              <Termometro term={term} />

              <div className="sem-impressao mt-5 border-t border-borda pt-4">
                <p className="text-xs font-semibold text-tinta-2">
                  Classificação dos humores — ajuste se quiser e salve
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {HUMORES.map((h) => (
                    <div key={h} className="flex items-center justify-between gap-2 rounded-lg border border-borda bg-white px-3 py-2">
                      <span className="flex items-center gap-2 text-sm text-tinta">
                        <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: COR_HUMOR[h] }} aria-hidden />
                        {h}
                      </span>
                      <select
                        value={classif[h]}
                        onChange={(e) => mudarClasse(h, e.target.value as Categoria)}
                        className="rounded-md border border-borda-forte bg-white px-2 py-1 text-xs text-tinta focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
                      >
                        <option value="positivo">Positivo</option>
                        <option value="neutro">Neutro</option>
                        <option value="negativo">Negativo</option>
                      </select>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={salvarClasse}
                    disabled={salvandoClass}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-1.5 text-xs font-semibold text-tinta hover:bg-superficie-2 disabled:opacity-60"
                  >
                    <Save size={13} aria-hidden /> {salvandoClass ? 'Salvando…' : 'Salvar classificação'}
                  </button>
                  {classSalva && <span className="text-xs font-medium text-[#0b5d0b]">Classificação salva.</span>}
                </div>
              </div>
            </Cartao>

            {/* 2) Distribuição dos humores */}
            <Cartao titulo="Distribuição dos humores" apoio="Quantos registros de cada humor no período.">
              <BarrasHumor dados={dist} total={r.total} />
            </Cartao>

            {/* 3) Setores */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Cartao titulo="Participação por setor" apoio="Percentual de registros de humor por setor — quais setores mais participam.">
                <BarrasParticipacao dados={participacao} />
              </Cartao>
              <Cartao titulo="Clima por setor" apoio="Índice de clima de cada setor (do melhor ao pior). n = registros do setor.">
                <BarrasCargo
                  dados={[...setores]
                    .sort((a, b) => b.indice - a.indice)
                    .map((s) => ({ cargo: s.setor, total: s.total, pos: s.pos, neu: s.neu, neg: s.neg, indice: s.indice }))}
                />
              </Cartao>
            </div>

            {/* 4) Humor por cargo */}
            <Cartao titulo="Clima por cargo" apoio="Índice de clima de cada cargo (ordenado do melhor ao pior). n = registros do grupo.">
              <BarrasCargo dados={cargos} />
            </Cartao>

            <NotaPrivacidade />
          </>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------
function NotaPrivacidade() {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-borda bg-white px-4 py-3">
      <ShieldCheck size={16} className="mt-0.5 flex-none text-marca" aria-hidden />
      <p className="text-xs leading-4 text-tinta-2">
        <strong className="font-semibold text-tinta">Privacidade:</strong> o CSV é lido no seu
        navegador e o dado bruto (incluindo nome e matrícula) é guardado no Firestore com acesso
        restrito ao administrador. Estas telas mostram <strong>apenas números agregados</strong> —
        nenhum nome ou matrícula é exibido.
      </p>
    </div>
  )
}

function Stat({
  icone,
  rotulo,
  valor,
  pequeno,
}: {
  icone: React.ReactNode
  rotulo: string
  valor: string
  pequeno?: boolean
}) {
  return (
    <div className="cartao px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-tinta-3">
        <span className="text-marca">{icone}</span>
        {rotulo}
      </p>
      <p className={`mt-1.5 font-[650] tracking-[-0.02em] text-tinta ${pequeno ? 'text-lg' : 'text-[2rem] leading-[1.05]'}`}>
        {valor}
      </p>
    </div>
  )
}

function Termometro({
  term,
}: {
  term: ReturnType<typeof termometro>
}) {
  const rotulo =
    term.indice >= 25 ? 'Clima positivo' : term.indice <= -25 ? 'Clima de atenção' : 'Clima neutro'
  const emoji = term.indice >= 25 ? '😄' : term.indice <= -25 ? '😟' : '🙂'
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="text-3xl leading-none" aria-hidden>{emoji}</span>
        <span className="text-lg font-semibold text-tinta">{rotulo}</span>
      </div>

      <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-plano">
        {term.pctPos > 0 && <span style={{ width: `${term.pctPos}%`, background: COR_CATEGORIA.positivo }} />}
        {term.pctNeu > 0 && <span style={{ width: `${term.pctNeu}%`, background: COR_CATEGORIA.neutro }} />}
        {term.pctNeg > 0 && <span style={{ width: `${term.pctNeg}%`, background: COR_CATEGORIA.negativo }} />}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        <Legenda cor={COR_CATEGORIA.positivo} rotulo="Positivos" n={term.pos} pct={term.pctPos} />
        <Legenda cor={COR_CATEGORIA.neutro} rotulo="Neutros" n={term.neu} pct={term.pctNeu} />
        <Legenda cor={COR_CATEGORIA.negativo} rotulo="Negativos" n={term.neg} pct={term.pctNeg} />
      </div>
    </div>
  )
}

function Legenda({ cor, rotulo, n, pct }: { cor: string; rotulo: string; n: number; pct: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-tinta-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: cor }} aria-hidden />
      {rotulo}: <strong className="font-semibold text-tinta tabular">{n}</strong>
      <span className="text-tinta-3">({pct}%)</span>
    </span>
  )
}

function BarrasHumor({ dados, total }: { dados: { humor: Humor; n: number }[]; total: number }) {
  const maximo = Math.max(...dados.map((d) => d.n), 1)
  return (
    <ul className="space-y-1.5">
      {dados.map((d) => (
        <li key={d.humor} className="grid grid-cols-[minmax(6rem,8rem)_1fr_5rem] items-center gap-3">
          <span className="flex items-center gap-2 truncate text-xs text-tinta-2">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: COR_HUMOR[d.humor] }} aria-hidden />
            {d.humor}
          </span>
          <span className="relative block h-3.5 rounded-sm bg-plano">
            <span
              className="absolute inset-y-0 left-0 rounded-r-[4px]"
              style={{ width: `${Math.max((d.n / maximo) * 100, 2)}%`, background: COR_HUMOR[d.humor] }}
            />
          </span>
          <span className="text-right text-xs text-tinta-2 tabular">
            <strong className="font-semibold text-tinta">{d.n}</strong>
            <span className="ml-1 text-tinta-3">{total > 0 ? `${Math.round((d.n / total) * 100)}%` : ''}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function BarrasCargo({
  dados,
}: {
  dados: { cargo: string; indice: number; total: number; pos: number; neu: number; neg: number }[]
}) {
  if (dados.length === 0) return <p className="text-sm text-tinta-3">Sem dados.</p>
  return (
    <ul className="space-y-1.5">
      {dados.map((d) => {
        const cor = d.indice >= 25 ? COR_CATEGORIA.positivo : d.indice <= -25 ? COR_CATEGORIA.negativo : COR_CATEGORIA.neutro
        // barra divergente: 0 no centro
        const largura = Math.min(Math.abs(d.indice) / 2, 50) // 0..50% de cada lado
        return (
          <li key={d.cargo} className="grid grid-cols-[minmax(7rem,12rem)_1fr_5.5rem] items-center gap-3">
            <span className="truncate text-xs text-tinta-2" title={d.cargo}>
              {d.cargo}
            </span>
            <span className="relative block h-3.5 rounded-sm bg-plano">
              <span className="absolute inset-y-0 left-1/2 w-px bg-borda-forte" aria-hidden />
              <span
                className="absolute inset-y-0 rounded-sm"
                style={
                  d.indice >= 0
                    ? { left: '50%', width: `${largura}%`, background: cor }
                    : { right: '50%', width: `${largura}%`, background: cor }
                }
              />
            </span>
            <span className="text-right text-xs text-tinta-2 tabular">
              <strong className="font-semibold text-tinta">{d.indice > 0 ? `+${d.indice}` : d.indice}</strong>
              <span className="ml-1 text-tinta-3">n={d.total}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function BarrasParticipacao({ dados }: { dados: { setor: string; total: number; pct: number }[] }) {
  if (dados.length === 0) return <p className="text-sm text-tinta-3">Sem dados.</p>
  const maxPct = Math.max(...dados.map((d) => d.pct), 1)
  return (
    <ul className="space-y-1.5">
      {dados.map((d) => (
        <li key={d.setor} className="grid grid-cols-[minmax(7rem,12rem)_1fr_5.5rem] items-center gap-3">
          <span className="flex items-center gap-2 truncate text-xs text-tinta-2" title={d.setor}>
            <Building2 size={13} className="flex-none text-marca" aria-hidden />
            {d.setor}
          </span>
          <span className="relative block h-3.5 rounded-sm bg-plano">
            <span
              className="absolute inset-y-0 left-0 rounded-r-[4px]"
              style={{ width: `${Math.max((d.pct / maxPct) * 100, 2)}%`, background: 'var(--color-marca)' }}
            />
          </span>
          <span className="text-right text-xs text-tinta-2 tabular">
            <strong className="font-semibold text-tinta">{d.pct}%</strong>
            <span className="ml-1 text-tinta-3">n={d.total}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
