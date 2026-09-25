'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

  if (!configurado()) return <TelaConfiguracao />

  const mesNome = NOMES_MESES[mesSel - 1] ?? ''
  const mesTitulo = mesNome ? mesNome[0].toUpperCase() + mesNome.slice(1) : ''
  const mes = mesSel
  const ehMesAtual = mesSel === mesAtual
  const hojeAniv = dados?.aniversarios.filter((p) => p.hoje) ?? []
  const hojeTempo = dados?.tempos.filter((p) => p.hoje) ?? []
  const anterior = () => setMesSel((m) => (m === 1 ? 12 : m - 1))
  const proximo = () => setMesSel((m) => (m === 12 ? 1 : m + 1))

  return (
    <div className="min-h-screen">
      <CabecalhoPublico empresa={empresa} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <BotaoVoltar />
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="titulo-hero text-[1.75rem] text-tinta">🎂 Aniversariantes de {mesTitulo}</h1>
          {ehMesAtual && (
            <span className="rounded-full bg-[#eef7e3] px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-verde-escuro">Mês atual</span>
          )}
        </div>

        {/* Seletor de mês */}
        <div className="mt-4 flex items-center gap-2">
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

        {dados === null ? (
          <p className="mt-6 text-sm text-tinta-3">Carregando…</p>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Faixa "Hoje" */}
            {dados.temHoje && (
              <section className="overflow-hidden rounded-2xl border border-[#cfe6b8] bg-[#f4faec]">
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
            {dados.aniversarios.length > 0 && (
              <section>
                <h2 className="titulo-secao text-tinta">🎂 Aniversários</h2>
                <ul className="mt-3 divide-y divide-borda overflow-hidden rounded-2xl border border-borda bg-white">
                  {dados.aniversarios.map((p, i) => (
                    <li key={i} className={`flex items-center gap-3 px-4 py-3 ${p.hoje ? 'bg-[#f4faec]' : ''}`}>
                      <Avatar pessoa={p} />
                      <span className="flex-1 font-medium text-tinta">{p.nome}</span>
                      {p.hoje && <TagHoje />}
                      <span className="text-sm text-tinta-3">{pad2(p.dia)}/{pad2(mes)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Lista de tempo de casa do mês */}
            {dados.tempos.length > 0 && (
              <section>
                <h2 className="titulo-secao text-tinta">🎉 Tempo de casa</h2>
                <ul className="mt-3 divide-y divide-borda overflow-hidden rounded-2xl border border-borda bg-white">
                  {dados.tempos.map((p, i) => (
                    <li key={i} className={`flex items-center gap-3 px-4 py-3 ${p.hoje ? 'bg-[#f4faec]' : ''}`}>
                      <Avatar pessoa={p} />
                      <span className="flex-1 font-medium text-tinta">
                        {p.nome} <span className="font-normal text-tinta-3">· {p.anos} {p.anos === 1 ? 'ano' : 'anos'}</span>
                      </span>
                      {p.hoje && <TagHoje />}
                      <span className="text-sm text-tinta-3">{pad2(p.dia)}/{pad2(mes)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {dados.aniversarios.length === 0 && dados.tempos.length === 0 && (
              <div className="rounded-2xl border border-dashed border-borda-forte bg-white/60 px-6 py-12 text-center">
                <p className="text-[0.9375rem] font-semibold text-tinta">Ninguém em {mesNome}</p>
                <p className="mt-1 text-sm text-tinta-3">Não há aniversários nem tempo de casa a comemorar neste mês.</p>
              </div>
            )}
          </div>
        )}
      </main>
      <RodapePublico />
    </div>
  )
}
