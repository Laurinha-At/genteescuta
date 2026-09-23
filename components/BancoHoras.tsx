'use client'

// =============================================================
// Banco de Horas — visão por papel.
//  - Master: sobe a planilha do mês, vê tudo e exporta.
//  - Gestor: vê e exporta só o próprio centro de custo.
//  - Colaborador: vê o próprio saldo do mês atual.
// A segurança de verdade está nas Regras do Firestore.
// =============================================================
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Upload, Download, Printer, CheckCircle2, Loader2, Search } from 'lucide-react'
import {
  lerBancoHoras, formatSaldo, mesAtualRef, mesRefLabel, mesesRecentes, type LinhaBH,
} from '@/lib/bancoHoras'
import {
  importarBancoHoras, listarBancoHoras, meuSaldo, type RegistroBH,
} from '@/lib/fb/bancoHoras'
import type { Perfil } from '@/lib/fb/funcionarios'
import { Campo, ENTRADA, Botao, Aviso, Chip } from '@/components/ui'

export function BancoHorasApp({ perfil }: { perfil: Perfil }) {
  const master = perfil.papeis.includes('master')
  const gestor = perfil.papeis.includes('gestor')
  const gerencia = master || gestor

  return (
    <>
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-3 transition-colors hover:text-marca">
        <ArrowLeft size={15} aria-hidden /> Início
      </Link>

      <div className="mt-6 flex items-start gap-3">
        <span className="mt-1 flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-marca-clara text-marca">
          <Clock size={22} aria-hidden />
        </span>
        <div>
          <h1 className="titulo-hero text-[1.875rem] text-tinta">Banco de Horas</h1>
          <p className="mt-2 max-w-xl text-[0.9688rem] leading-7 text-tinta-2">
            {gerencia
              ? 'Acompanhe o saldo de horas por mês. O saldo negativo aparece em vermelho.'
              : 'Seu saldo de horas do mês, atualizado pela equipe de Gente & Cultura.'}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {gerencia ? <Gestao perfil={perfil} master={master} /> : <MeuSaldo />}
      </div>
    </>
  )
}

/** Resumo compacto do próprio saldo (para embutir em Informações Administrativas). */
export function MeuBancoHorasResumo() {
  const mesRef = mesAtualRef()
  const [reg, setReg] = useState<RegistroBH | null | undefined>(undefined)
  useEffect(() => { meuSaldo(mesRef).then(setReg).catch(() => setReg(null)) }, [mesRef])

  if (reg === undefined) return null
  return (
    <Link href="/banco-horas" className="cartao-g flex items-center gap-3 p-4 transition-colors hover:border-marca">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-marca-clara text-marca">
        <Clock size={19} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-tinta">Seu banco de horas</span>
        <span className="block text-xs text-tinta-3">{mesRefLabel(mesRef)}</span>
      </span>
      <span className={`text-lg font-[680] ${reg && reg.saldo_min != null ? (reg.saldo_min < 0 ? 'text-critico' : 'text-verde-escuro') : 'text-tinta-3'}`}>
        {reg && reg.saldo_min != null ? formatSaldo(reg.saldo_min) : '—'}
      </span>
    </Link>
  )
}

// -------------------------------------------------------------
// Colaborador: só o próprio saldo
// -------------------------------------------------------------
function MeuSaldo() {
  const mesRef = mesAtualRef()
  const [reg, setReg] = useState<RegistroBH | null | undefined>(undefined)
  useEffect(() => { meuSaldo(mesRef).then(setReg).catch(() => setReg(null)) }, [mesRef])

  return (
    <div className="cartao-g max-w-md p-6 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-tinta-3">{mesRefLabel(mesRef)}</p>
      {reg === undefined ? (
        <p className="mt-4 text-sm text-tinta-3">Carregando…</p>
      ) : reg && reg.saldo_min != null ? (
        <p className={`mt-2 text-[2.5rem] font-[680] tracking-tight ${reg.saldo_min < 0 ? 'text-critico' : 'text-verde-escuro'}`}>
          {formatSaldo(reg.saldo_min)}
        </p>
      ) : (
        <p className="mt-4 text-sm text-tinta-2">Sem saldo registrado para este mês.</p>
      )}
      <p className="mt-2 text-xs text-tinta-3">Dúvidas sobre o cálculo? Fale com Gente &amp; Cultura.</p>
    </div>
  )
}

// -------------------------------------------------------------
// Master / Gestor: tabela, resumo, exportação e (Master) upload
// -------------------------------------------------------------
function Gestao({ perfil, master }: { perfil: Perfil; master: boolean }) {
  const [mesRef, setMesRef] = useState(mesAtualRef())
  const [registros, setRegistros] = useState<RegistroBH[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [fCentro, setFCentro] = useState('')

  async function recarregar() {
    setCarregando(true)
    try { setRegistros(await listarBancoHoras(perfil, mesRef)) }
    catch { setRegistros([]) }
    finally { setCarregando(false) }
  }
  useEffect(() => { recarregar() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mesRef])

  // Centros de custo presentes nos dados carregados (para o filtro).
  const centros = useMemo(
    () => Array.from(new Set(registros.map((r) => r.centro_custo).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [registros],
  )

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return registros.filter((r) =>
      (!fCentro || r.centro_custo === fCentro) &&
      (!q || `${r.funcionario ?? ''} ${r.matricula ?? ''}`.toLowerCase().includes(q)),
    )
  }, [registros, busca, fCentro])

  const resumo = useMemo(() => {
    let pos = 0, neg = 0, sem = 0
    for (const r of filtrados) {
      if (r.saldo_min == null) sem++
      else if (r.saldo_min < 0) neg++
      else pos++
    }
    return { total: filtrados.length, pos, neg, sem }
  }, [filtrados])

  const escopo = master ? 'todos os centros de custo' : `centro ${perfil.centro_custo || '—'}`

  return (
    <div className="space-y-5">
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {aviso && !erro && <Aviso tom="sucesso">{aviso}</Aviso>}

      {master && (
        <UploadMes onImportado={(msg, mes) => { setAviso(msg); setErro(null); setMesRef(mes) }} setErro={setErro} />
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Campo rotulo="Mês de referência">
          <select value={mesRef} onChange={(e) => setMesRef(e.target.value)} className={ENTRADA}>
            {mesesRecentes().map((m) => <option key={m} value={m}>{mesRefLabel(m)}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Buscar por nome ou matrícula">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-3" aria-hidden />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} className={`${ENTRADA} pl-9`} placeholder="Ex.: Maria ou 00123" />
          </div>
        </Campo>
        <Campo rotulo="Centro de custo">
          <select value={fCentro} onChange={(e) => setFCentro(e.target.value)} className={ENTRADA}>
            <option value="">Todos</option>
            {centros.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Campo>
        <div className="flex gap-2">
          <button type="button" onClick={() => baixarCSV(filtrados, mesRef)} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-2.5 text-sm font-medium text-tinta-2 hover:border-marca hover:text-marca-texto">
            <Download size={15} aria-hidden /> CSV
          </button>
          <button type="button" onClick={() => imprimirPDF(filtrados, mesRef, escopo)} className="inline-flex items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-3 py-2.5 text-sm font-medium text-tinta-2 hover:border-marca hover:text-marca-texto">
            <Printer size={15} aria-hidden /> PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Chip faixa="neutro">{resumo.total} pessoa(s)</Chip>
        <Chip faixa="baixo">{resumo.pos} positivo(s)</Chip>
        <Chip faixa="critico">{resumo.neg} negativo(s)</Chip>
        {resumo.sem > 0 && <Chip faixa="neutro">{resumo.sem} sem saldo</Chip>}
      </div>
      <p className="text-xs text-tinta-3">Você enxerga {escopo}.</p>

      {carregando ? (
        <p className="text-sm text-tinta-3">Carregando…</p>
      ) : filtrados.length === 0 ? (
        <div className="cartao-g p-6 text-center text-sm text-tinta-3">
          {registros.length === 0 ? `Sem registros para ${mesRefLabel(mesRef)} no seu escopo.` : 'Nenhum resultado para o filtro.'}
        </div>
      ) : (
        <div className="cartao-g overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-borda text-left text-xs font-semibold text-tinta-3">
                <th className="px-4 py-2.5">Funcionário</th>
                <th className="px-4 py-2.5">Matrícula</th>
                <th className="px-4 py-2.5">Centro de custo</th>
                <th className="px-4 py-2.5">Cargo</th>
                <th className="px-4 py-2.5">Falta</th>
                <th className="px-4 py-2.5 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {filtrados.map((r) => (
                <tr key={r.id} className="hover:bg-superficie-2">
                  <td className="px-4 py-2.5 text-tinta">{r.funcionario || '—'}</td>
                  <td className="px-4 py-2.5 text-tinta-2">{r.matricula || '—'}</td>
                  <td className="px-4 py-2.5 text-tinta-2">{r.centro_custo || '—'}</td>
                  <td className="px-4 py-2.5 text-tinta-2">{r.cargo || '—'}</td>
                  <td className="px-4 py-2.5 text-tinta-2">{r.falta || '—'}</td>
                  <td className={`whitespace-nowrap px-4 py-2.5 text-right font-semibold ${r.saldo_min == null ? 'text-tinta-3' : r.saldo_min < 0 ? 'text-critico' : 'text-verde-escuro'}`}>
                    {formatSaldo(r.saldo_min)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------
// Upload da planilha do mês (Master)
// -------------------------------------------------------------
function UploadMes({ onImportado, setErro }: { onImportado: (msg: string, mes: string) => void; setErro: (s: string | null) => void }) {
  const [linhas, setLinhas] = useState<LinhaBH[] | null>(null)
  const [mes, setMes] = useState(mesAtualRef())
  const [nome, setNome] = useState('')
  const [lendo, setLendo] = useState(false)
  const [importando, setImportando] = useState(false)

  async function aoEscolher(file: File | null) {
    if (!file) return
    setErro(null); setLinhas(null); setLendo(true); setNome(file.name)
    try {
      const { linhas, mesDetectado } = await lerBancoHoras(file)
      if (linhas.length === 0) setErro('Não encontrei as colunas (Matrícula … Saldo acumulado). Confira a planilha.')
      if (mesDetectado) setMes(mesDetectado)
      setLinhas(linhas)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui ler a planilha.')
    }
    setLendo(false)
  }

  async function confirmar() {
    if (!linhas) return
    setImportando(true); setErro(null)
    try {
      const r = await importarBancoHoras(mes, linhas)
      setLinhas(null); setNome('')
      onImportado(
        `Importado ${mesRefLabel(mes)}: ${r.gravados} linha(s)` +
        (r.semFuncionario ? `, ${r.semFuncionario} sem funcionário casado (matrícula)` : '') +
        (r.semMatricula ? `, ${r.semMatricula} sem matrícula (ignoradas)` : '') + '.',
        mes,
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui importar.')
    }
    setImportando(false)
  }

  return (
    <div className="cartao-g space-y-3 p-5">
      <h2 className="text-[0.9375rem] font-semibold text-tinta">Subir planilha do mês</h2>
      <p className="text-xs leading-5 text-tinta-3">
        Colunas: Matrícula, Funcionário, Empresa, Cargo, Centro de custo, Falta, Saldo acumulado.
        O saldo aceita negativos (ex.: −19:31) e “−” = sem saldo. Reenviar o mesmo mês atualiza (não duplica).
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-borda-forte bg-white px-4 py-2.5 text-sm font-semibold text-tinta transition-colors hover:border-marca hover:text-marca-texto">
          <Upload size={15} aria-hidden /> {lendo ? 'Lendo…' : 'Escolher planilha'}
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => aoEscolher(e.target.files?.[0] ?? null)} />
        </label>
        {nome && <span className="text-xs text-tinta-3">{nome}</span>}
      </div>

      {linhas && linhas.length > 0 && (
        <div className="space-y-3 border-t border-borda pt-3">
          <div className="flex flex-wrap items-end gap-3">
            <Campo rotulo="Mês desta planilha">
              <select value={mes} onChange={(e) => setMes(e.target.value)} className={ENTRADA}>
                {mesesRecentes().map((m) => <option key={m} value={m}>{mesRefLabel(m)}</option>)}
              </select>
            </Campo>
            <p className="text-sm text-tinta-2">{linhas.length} linha(s) na planilha.</p>
          </div>
          <Botao type="button" onClick={confirmar} disabled={importando}>
            {importando ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Importando…</> : <><CheckCircle2 size={15} aria-hidden /> Confirmar {mesRefLabel(mes)}</>}
          </Botao>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------
// Exportações
// -------------------------------------------------------------
function linhasExport(rs: RegistroBH[]) {
  return rs.map((r) => ({
    Funcionário: r.funcionario, Matrícula: r.matricula, 'Centro de custo': r.centro_custo,
    Cargo: r.cargo, Falta: r.falta, Saldo: formatSaldo(r.saldo_min),
  }))
}

function baixarCSV(rs: RegistroBH[], mesRef: string) {
  const linhas = linhasExport(rs)
  if (linhas.length === 0) return
  const cab = Object.keys(linhas[0])
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [cab.join(';'), ...linhas.map((l) => cab.map((c) => esc((l as any)[c])).join(';'))].join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `banco-horas-${mesRef}.csv`; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function imprimirPDF(rs: RegistroBH[], mesRef: string, escopo: string) {
  const linhas = linhasExport(rs)
  const cab = linhas.length ? Object.keys(linhas[0]) : []
  const w = window.open('', '_blank')
  if (!w) return
  const body = linhas.map((l) => `<tr>${cab.map((c) => `<td>${String((l as any)[c] ?? '')}</td>`).join('')}</tr>`).join('')
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Banco de Horas</title>
    <style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#1a1714;margin:32px}
    h1{font-size:18px;margin:0 0 4px}p{color:#57514a;margin:0 0 16px;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #d6d0c7;padding:6px 8px;text-align:left}th{background:#eaf3f7;color:#1f5c73}</style>
    </head><body><h1>Banco de Horas — ${mesRefLabel(mesRef)}</h1>
    <p>Escopo: ${escopo} · Gerado em ${new Date().toLocaleString('pt-BR')} · ${linhas.length} registro(s)</p>
    <table><thead><tr>${cab.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
    <script>window.onload=function(){window.print()}</script></body></html>`)
  w.document.close()
}
