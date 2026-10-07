'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Download, Printer, X } from 'lucide-react'
import { BotaoVoltar } from '@/components/BotaoVoltar'
import { configurado } from '@/lib/firebase'
import { getConfig } from '@/lib/fb/publico'
import { aniversariantesDoMes, mesAtualSP, NOMES_MESES, type AniversariantesMes, type PessoaMes } from '@/lib/fb/aniversarios'
import { CabecalhoPublico, RodapePublico } from '@/components/CabecalhoPublico'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'

function pad2(n: number) { return String(n).padStart(2, '0') }
function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

/** Remove acentos e caixa para uma busca tolerante. */
function normalizar(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Dispara o download de um texto (CSV) como arquivo. */
function baixarTexto(conteudo: string, arquivo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = arquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Escapa um campo para CSV (aspas + separador + quebra de linha). */
function csvCampo(v: string) {
  const s = String(v ?? '')
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function Avatar({ pessoa }: { pessoa: PessoaMes }) {
  if (pessoa.foto) {
    return <img src={pessoa.foto} alt="" className="h-10 w-10 flex-none rounded-full object-cover" />
  }
  return (
    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-marca-clara text-sm font-semibold text-marca-escura">
      {iniciais(pessoa.nome)}
    </span>
  )
}

function TagHoje() {
  return <span className="rounded-full bg-[#eef7e3] px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-verde-escuro">Hoje</span>
}

export default function Aniversariantes() {
  const [empresa, setEmpresa] = useState('Soulan Recursos Humanos')
  const [dados, setDados] = useState<AniversariantesMes | null>(null)
  const [mesSel, setMesSel] = useState(mesAtualSP())
  const [busca, setBusca] = useState('')
  const [areaSel, setAreaSel] = useState('')
  const mesAtual = mesAtualSP()

  useEffect(() => {
    if (!configurado()) return
    getConfig().then((c) => setEmpresa(c.empresa_nome)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!configurado()) return
    setDados(null)
    aniversariantesDoMes(mesSel).then(setDados).catch(() => setDados(null))
  }, [mesSel])

  // Áreas presentes no mês selecionado (para o filtro por área).
  const areas = useMemo(() => {
    if (!dados) return []
    const set = new Set<string>()
    for (const p of [...dados.aniversarios, ...dados.tempos]) {
      if (p.area) set.add(p.area)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [dados])

  const temFiltro = busca.trim() !== '' || areaSel !== ''
  const filtra = useMemo(() => {
    const q = normalizar(busca)
    return (p: PessoaMes) => {
      if (areaSel && (p.area ?? '') !== areaSel) return false
      if (!q) return true
      return normalizar(p.nome).includes(q) || normalizar(p.area ?? '').includes(q)
    }
  }, [busca, areaSel])

  if (!configurado()) return <TelaConfiguracao />

  const mesNome = NOMES_MESES[mesSel - 1] ?? ''
  const mesTitulo = mesNome ? mesNome[0].toUpperCase() + mesNome.slice(1) : ''
  const mes = mesSel
  const ehMesAtual = mesSel === mesAtual
  const hojeAniv = dados?.aniversarios.filter((p) => p.hoje) ?? []
  const hojeTempo = dados?.tempos.filter((p) => p.hoje) ?? []
  const anterior = () => setMesSel((m) => (m === 1 ? 12 : m - 1))
  const proximo = () => setMesSel((m) => (m === 12 ? 1 : m + 1))

  const aniversarios = (dados?.aniversarios ?? []).filter(filtra)
  const tempos = (dados?.tempos ?? []).filter(filtra)
  const totalFiltrado = aniversarios.length + tempos.length
  const totalMes = (dados?.aniversarios.length ?? 0) + (dados?.tempos.length ?? 0)

  function limparFiltros() { setBusca(''); setAreaSel('') }

  function exportarCsv() {
    const linhas = [['Tipo', 'Nome', 'Área', 'Dia', 'Anos de casa'].map(csvCampo).join(';')]
    for (const p of aniversarios) {
      linhas.push(['Aniversário', p.nome, p.area ?? '', `${pad2(p.dia)}/${pad2(mes)}`, ''].map(csvCampo).join(';'))
    }
    for (const p of tempos) {
      linhas.push(['Tempo de casa', p.nome, p.area ?? '', `${pad2(p.dia)}/${pad2(mes)}`, String(p.anos ?? '')].map(csvCampo).join(';'))
    }
    // BOM p/ acentos abrirem certo no Excel; CRLF entre linhas.
    baixarTexto('﻿' + linhas.join('\r\n'), `aniversariantes-${mesNome}.csv`, 'text/csv;charset=utf-8')
  }

  return (
    <div className="min-h-screen">
      <div className="sem-impressao">
        <CabecalhoPublico empresa={empresa} />
      </div>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <div className="sem-impressao"><BotaoVoltar /></div>

        {/* Título do relatório (aparece na impressão/PDF) */}
        <div className="print-only mb-4">
          <p className="text-lg font-bold">🎂 Aniversariantes de {mesTitulo}: {empresa}</p>
          {temFiltro && <p className="text-sm">Filtro: {[busca.trim() && `“${busca.trim()}”`, areaSel].filter(Boolean).join(' · ')}</p>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 sem-impressao">
          <h1 className="titulo-hero text-[1.75rem] text-tinta">🎂 Aniversariantes de {mesTitulo}</h1>
          {ehMesAtual && (
            <span className="rounded-full bg-[#eef7e3] px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-verde-escuro">Mês atual</span>
          )}
        </div>

        {/* Seletor de mês */}
        <div className="mt-4 flex items-center gap-2 sem-impressao">
          <button type="button" onClick={anterior} aria-label="Mês anterior" className="flex h-9 w-9 items-center justify-center rounded-lg border border-borda-forte bg-white text-tinta-2 transition-colors hover:border-marca hover:text-marca">
            <ChevronLeft size={18} aria-hidden />
          </button>
          <select value={mesSel} onChange={(e) => setMesSel(Number(e.target.value))} className="rounded-lg border border-borda-forte bg-white px-3 py-2 text-sm font-medium text-tinta focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca">
            {NOMES_MESES.map((nome, i) => (
              <option key={i} value={i + 1}>
                {nome[0].toUpperCase() + nome.slice(1)}{i + 1 === mesAtual ? ' • atual' : ''}
              </option>
            ))}
          </select>
          <button type="button" onClick={proximo} aria-label="Próximo mês" className="flex h-9 w-9 items-center justify-center rounded-lg border border-borda-forte bg-white text-tinta-2 transition-colors hover:border-marca hover:text-marca">
            <ChevronRight size={18} aria-hidden />
          </button>
          {!ehMesAtual && (
            <button type="button" onClick={() => setMesSel(mesAtual)} className="ml-1 text-xs font-medium text-marca-texto hover:text-marca-escura">
              Voltar ao mês atual
            </button>
          )}
        </div>

        {/* Busca + filtro por área + exportar */}
        <div className="mt-4 flex flex-wrap items-center gap-2 sem-impressao">
          <div className="relative min-w-[12rem] flex-1">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tinta-3" aria-hidden />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar por nome ou área"
              className="w-full rounded-lg border border-borda-forte bg-white py-2 pl-8 pr-3 text-sm text-tinta placeholder:text-tinta-3 focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
            />
          </div>
          {areas.length > 0 && (
            <select
              value={areaSel}
              onChange={(e) => setAreaSel(e.target.value)}
              className="rounded-lg border border-borda-forte bg-white px-3 py-2 text-sm font-medium text-tinta focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
            >
              <option value="">Todas as áreas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          {temFiltro && (
            <button type="button" onClick={limparFiltros} className="inline-flex items-center gap-1 rounded-lg border border-borda-forte bg-white px-2.5 py-2 text-sm text-tinta-2 hover:border-marca hover:text-marca">
              <X size={14} aria-hidden /> Limpar
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={exportarCsv} disabled={totalFiltrado === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-2 text-sm font-medium text-tinta hover:bg-superficie-2 disabled:opacity-50">
              <Download size={15} aria-hidden /> CSV
            </button>
            <button type="button" onClick={() => window.print()} disabled={totalFiltrado === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-2 text-sm font-medium text-tinta hover:bg-superficie-2 disabled:opacity-50">
              <Printer size={15} aria-hidden /> PDF
            </button>
          </div>
        </div>

        {temFiltro && dados !== null && (
          <p className="mt-2 text-xs text-tinta-3 sem-impressao">
            {totalFiltrado} de {totalMes} {totalMes === 1 ? 'pessoa' : 'pessoas'} em {mesNome}.
          </p>
        )}

        {dados === null ? (
          <p className="mt-6 text-sm text-tinta-3">Carregando…</p>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Faixa "Hoje": só sem filtro ativo, para não confundir a busca */}
            {dados.temHoje && !temFiltro && (
              <section className="overflow-hidden rounded-2xl border border-[#cfe6b8] bg-[#f4faec] sem-impressao">
                <div className="p-5 sm:p-6">
                  <h2 className="text-[0.9375rem] font-bold text-verde-escuro">É hoje! 🎉</h2>
                  <ul className="mt-3 space-y-2.5">
                    {hojeAniv.map((p, i) => (
                      <li key={`a${i}`} className="flex items-center gap-3">
                        <Avatar pessoa={p} />
                        <span className="flex-1 text-[0.9375rem] text-tinta"><strong className="font-semibold">{p.nome}</strong> faz aniversário 🎂</span>
                        <TagHoje />
                      </li>
                    ))}
                    {hojeTempo.map((p, i) => (
                      <li key={`t${i}`} className="flex items-center gap-3">
                        <Avatar pessoa={p} />
                        <span className="flex-1 text-[0.9375rem] text-tinta"><strong className="font-semibold">{p.nome}</strong> completa {p.anos} {p.anos === 1 ? 'ano' : 'anos'} de Soulan 🎉</span>
                        <TagHoje />
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Lista de aniversários do mês */}
            {aniversarios.length > 0 && (
              <section>
                <h2 className="titulo-secao text-tinta">🎂 Aniversários</h2>
                <ul className="mt-3 divide-y divide-borda overflow-hidden rounded-2xl border border-borda bg-white">
                  {aniversarios.map((p, i) => (
                    <li key={i} className={`flex items-center gap-3 px-4 py-3 ${p.hoje ? 'bg-[#f4faec]' : ''}`}>
                      <Avatar pessoa={p} />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate font-medium text-tinta">{p.nome}</span>
                        {p.area && <span className="block truncate text-xs text-tinta-3">{p.area}</span>}
                      </span>
                      {p.hoje && <TagHoje />}
                      <span className="flex-none text-sm text-tinta-3">{pad2(p.dia)}/{pad2(mes)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Lista de tempo de casa do mês */}
            {tempos.length > 0 && (
              <section>
                <h2 className="titulo-secao text-tinta">🎉 Tempo de casa</h2>
                <ul className="mt-3 divide-y divide-borda overflow-hidden rounded-2xl border border-borda bg-white">
                  {tempos.map((p, i) => (
                    <li key={i} className={`flex items-center gap-3 px-4 py-3 ${p.hoje ? 'bg-[#f4faec]' : ''}`}>
                      <Avatar pessoa={p} />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate font-medium text-tinta">
                          {p.nome} <span className="font-normal text-tinta-3">· {p.anos} {p.anos === 1 ? 'ano' : 'anos'}</span>
                        </span>
                        {p.area && <span className="block truncate text-xs text-tinta-3">{p.area}</span>}
                      </span>
                      {p.hoje && <TagHoje />}
                      <span className="flex-none text-sm text-tinta-3">{pad2(p.dia)}/{pad2(mes)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {totalFiltrado === 0 && (
              <div className="rounded-2xl border border-dashed border-borda-forte bg-white/60 px-6 py-12 text-center">
                {temFiltro ? (
                  <>
                    <p className="text-[0.9375rem] font-semibold text-tinta">Nenhum resultado</p>
                    <p className="mt-1 text-sm text-tinta-3">Ninguém em {mesNome} corresponde ao filtro. <button type="button" onClick={limparFiltros} className="font-medium text-marca-texto hover:text-marca-escura">Limpar filtro</button>.</p>
                  </>
                ) : (
                  <>
                    <p className="text-[0.9375rem] font-semibold text-tinta">Ninguém em {mesNome}</p>
                    <p className="mt-1 text-sm text-tinta-3">Não há aniversários nem tempo de casa a comemorar neste mês.</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <div className="sem-impressao">
        <RodapePublico />
      </div>
    </div>
  )
}
