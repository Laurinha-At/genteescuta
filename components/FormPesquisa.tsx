'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Send, ShieldCheck, Check } from 'lucide-react'
import { enviarResposta } from '@/lib/fb/publico'
import { Aviso, Botao, Campo, ENTRADA } from '@/components/ui'
import type { Opcao, Pergunta, Pesquisa, Secao } from '@/lib/types'

type Valor = string | number | string[]

export function FormPesquisa({
  pesquisa,
  secoes,
  perguntas,
}: {
  pesquisa: Pesquisa & { id: string }
  secoes: Secao[]
  perguntas: Pergunta[]
}) {
  const router = useRouter()
  const [estado, setEstado] = useState<{ erro?: string }>({})
  const [pendente, setPendente] = useState(false)
  const [passo, setPasso] = useState(0)
  const [email, setEmail] = useState('')
  const [respostas, setRespostas] = useState<Record<string, Valor>>({})
  const [faltando, setFaltando] = useState<string[]>([])
  const [carregado, setCarregado] = useState(false)

  const chaveRascunho = `ge_rascunho_${pesquisa.slug}`
  const precisaEmail = pesquisa.identificacao !== 'anonima'

  const porSecao = useMemo(() => {
    return secoes.map((s) => ({
      secao: s,
      itens: perguntas
        .filter((p) => p.secao_id === s.id)
        .sort((a, b) => a.ordem - b.ordem),
    }))
  }, [secoes, perguntas])

  const totalPassos = porSecao.length + 1 // abertura + seções

  // ---- Rascunho local: ninguém perde 50 respostas por um toque errado ----
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(chaveRascunho)
      if (salvo) {
        const dados = JSON.parse(salvo)
        if (dados.respostas) setRespostas(dados.respostas)
        if (dados.email) setEmail(dados.email)
      }
    } catch {
      // rascunho corrompido: começa do zero, sem barulho
    }
    setCarregado(true)
  }, [chaveRascunho])

  useEffect(() => {
    if (!carregado) return
    try {
      localStorage.setItem(chaveRascunho, JSON.stringify({ respostas, email }))
    } catch {
      // armazenamento cheio ou bloqueado: seguimos sem rascunho
    }
  }, [respostas, email, carregado, chaveRascunho])

  function responder(id: string, valor: Valor) {
    setRespostas((r) => ({ ...r, [id]: valor }))
    setFaltando((f) => f.filter((x) => x !== id))
  }

  function validarPasso(): boolean {
    if (passo === 0) {
      if (precisaEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        setFaltando(['__email'])
        return false
      }
      return true
    }

    const bloco = porSecao[passo - 1]
    if (!bloco) return true

    const pendentes = bloco.itens
      .filter((p) => p.obrigatoria)
      .filter((p) => {
        const v = respostas[p.id]
        return v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
      })
      .map((p) => p.id)

    setFaltando(pendentes)
    return pendentes.length === 0
  }

  function avancar() {
    if (!validarPasso()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setPasso((p) => Math.min(p + 1, totalPassos - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function voltar() {
    setFaltando([])
    setPasso((p) => Math.max(p - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const ultimo = passo === totalPassos - 1
  const progresso = Math.round((passo / (totalPassos - 1)) * 100)

  async function enviar() {
    if (!validarPasso()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setEstado({})
    setPendente(true)
    try {
      await enviarResposta({
        slug: pesquisa.slug,
        pesquisaId: pesquisa.id,
        identificacao: pesquisa.identificacao,
        email,
        respostas,
        perguntas,
      })
      try {
        localStorage.removeItem(chaveRascunho)
      } catch {
        // sem rascunho para limpar
      }
      router.push('/obrigado')
    } catch (err) {
      setEstado({ erro: err instanceof Error ? err.message : 'Não consegui registrar a sua resposta.' })
      setPendente(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    if (estado.erro) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [estado.erro])

  return (
    <div>
      {/* -------- Progresso -------- */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-borda bg-white px-4 py-3">
        <div className="flex items-center justify-between text-xs font-medium text-tinta-3">
          <span>
            Etapa {passo + 1} de {totalPassos}
          </span>
          <span className="tabular">{progresso}%</span>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-plano"
          role="progressbar"
          aria-valuenow={progresso}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-marca transition-all duration-300"
            style={{ width: `${Math.max(progresso, 3)}%` }}
          />
        </div>
      </div>

      {estado.erro && (
        <div className="mb-5">
          <Aviso tom="erro">{estado.erro}</Aviso>
        </div>
      )}

      {/* -------- Abertura -------- */}
      {passo === 0 && (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-tinta">{pesquisa.titulo}</h2>
          {pesquisa.descricao && (
            <p className="text-sm leading-6 text-tinta-2">{pesquisa.descricao}</p>
          )}

          <div className="rounded-md border border-borda bg-superficie-2 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-tinta">
              <ShieldCheck size={16} className="text-marca" aria-hidden />
              Como as suas respostas são tratadas
            </p>
            <ul className="mt-2 space-y-1.5 text-sm leading-5 text-tinta-2">
              {pesquisa.identificacao === 'confidencial' && (
                <li>
                  • Seu e-mail serve <strong>apenas</strong> para evitar respostas duplicadas. Ele
                  é convertido em código e não fica guardado junto das suas respostas.
                </li>
              )}
              {pesquisa.identificacao === 'identificada' && (
                <li>
                  • Esta pesquisa é identificada: seu e-mail fica visível para a equipe
                  responsável.
                </li>
              )}
              {pesquisa.identificacao === 'anonima' && (
                <li>• Esta pesquisa é anônima: nenhum dado de identificação é solicitado.</li>
              )}
              <li>
                • Os resultados são divulgados de forma agregada. Grupos com menos de{' '}
                {pesquisa.min_grupo} respostas não aparecem separados no painel.
              </li>
              <li>• Não existe resposta certa ou errada. O que vale é o seu retrato honesto.</li>
            </ul>
          </div>

          {precisaEmail && (
            <Campo
              rotulo="Seu e-mail"
              obrigatorio
              erro={faltando.includes('__email') ? 'Informe um e-mail válido.' : undefined}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={ENTRADA}
                placeholder="voce@empresa.com.br"
                autoComplete="email"
              />
            </Campo>
          )}

          <p className="text-sm text-tinta-3">
            São {perguntas.length} perguntas, cerca de {Math.max(5, Math.round(perguntas.length / 6))}{' '}
            minutos. Suas respostas ficam salvas neste navegador enquanto você preenche.
          </p>
        </div>
      )}

      {/* -------- Seções -------- */}
      {passo > 0 && porSecao[passo - 1] && (
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-tinta">{porSecao[passo - 1].secao.titulo}</h2>
            {porSecao[passo - 1].secao.descricao && (
              <p className="mt-1.5 text-sm leading-5 text-tinta-2">
                {porSecao[passo - 1].secao.descricao}
              </p>
            )}
          </div>

          {faltando.length > 0 && (
            <Aviso tom="alerta">
              Faltam {faltando.length}{' '}
              {faltando.length === 1 ? 'pergunta obrigatória' : 'perguntas obrigatórias'} nesta
              etapa. Elas estão destacadas abaixo.
            </Aviso>
          )}

          <ol className="space-y-5">
            {porSecao[passo - 1].itens.map((p, i) => (
              <li
                key={p.id}
                className={`rounded-md border p-4 ${
                  faltando.includes(p.id)
                    ? 'border-critico bg-[#fdeaea]'
                    : 'border-borda bg-white'
                }`}
              >
                <fieldset>
                  <legend className="text-sm font-medium leading-5 text-tinta">
                    <span className="mr-1.5 text-tinta-3 tabular">{i + 1}.</span>
                    {p.enunciado}
                    {p.obrigatoria && <span className="ml-0.5 text-critico">*</span>}
                  </legend>
                  {p.ajuda && <p className="mt-1 text-xs text-tinta-3">{p.ajuda}</p>}

                  <div className="mt-3">
                    <CampoPergunta
                      pergunta={p}
                      valor={respostas[p.id]}
                      aoResponder={(v) => responder(p.id, v)}
                    />
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* -------- Navegação -------- */}
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-borda pt-5">
        {passo > 0 && (
          <Botao type="button" variante="secundario" onClick={voltar}>
            <ArrowLeft size={15} aria-hidden /> Voltar
          </Botao>
        )}

        {!ultimo ? (
          <Botao type="button" onClick={avancar}>
            Continuar <ArrowRight size={15} aria-hidden />
          </Botao>
        ) : (
          <Botao type="button" disabled={pendente} onClick={enviar}>
            <Send size={15} aria-hidden />
            {pendente ? 'Enviando…' : 'Enviar minhas respostas'}
          </Botao>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
/** Escolha única com suporte a "Outros (especificar)" — opção de valor 'outro'. */
function CampoEscolhaUnica({
  pergunta,
  valor,
  aoResponder,
  nome,
}: {
  pergunta: Pergunta
  valor: Valor | undefined
  aoResponder: (v: Valor) => void
  nome: string
}) {
  const opcoes: Opcao[] = pergunta.opcoes ?? []
  const temOutro = opcoes.some((o) => String(o.valor) === 'outro')
  const fixos = opcoes.filter((o) => String(o.valor) !== 'outro').map((o) => String(o.valor))
  const valorStr = valor === undefined ? '' : String(valor)

  // Está no modo "Outros" quando há valor que não bate com nenhuma opção fixa.
  const [modoOutro, setModoOutro] = useState(
    temOutro && valorStr !== '' && !fixos.includes(valorStr),
  )

  const valorSelect = modoOutro ? 'outro' : fixos.includes(valorStr) ? valorStr : ''

  return (
    <div className="space-y-2">
      <select
        name={nome}
        value={valorSelect}
        onChange={(e) => {
          const v = e.target.value
          if (v === 'outro') {
            setModoOutro(true)
            aoResponder('')
          } else {
            setModoOutro(false)
            aoResponder(v)
          }
        }}
        className={ENTRADA}
      >
        <option value="">Selecione…</option>
        {opcoes.map((o) => (
          <option key={String(o.valor)} value={String(o.valor)}>
            {o.rotulo}
          </option>
        ))}
      </select>

      {modoOutro && (
        <input
          type="text"
          maxLength={60}
          value={valorStr}
          onChange={(e) => aoResponder(e.target.value)}
          className={ENTRADA}
          placeholder="Escreva a sua área"
          aria-label="Especifique a sua área"
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------
function CampoPergunta({
  pergunta,
  valor,
  aoResponder,
}: {
  pergunta: Pergunta
  valor: Valor | undefined
  aoResponder: (v: Valor) => void
}) {
  const nome = `p_${pergunta.id}`

  switch (pergunta.tipo) {
    case 'likert5': {
      const opcoes: Opcao[] = pergunta.opcoes ?? []
      return (
        <div className="grid gap-1.5 sm:grid-cols-5">
          {opcoes.map((o) => {
            const marcado = String(valor) === String(o.valor)
            return (
              <label
                key={String(o.valor)}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors sm:flex-col sm:gap-1.5 sm:px-2 sm:text-center ${
                  marcado
                    ? 'border-marca bg-marca-clara font-medium text-marca-escura ring-1 ring-marca'
                    : 'border-borda-forte bg-white text-tinta-2 hover:bg-superficie-2'
                }`}
              >
                <input
                  type="radio"
                  name={nome}
                  checked={marcado}
                  onChange={() => aoResponder(Number(o.valor))}
                  className="h-4 w-4 flex-none accent-[#2a78d6] sm:sr-only"
                />
                <span className="text-xs leading-4">{o.rotulo}</span>
              </label>
            )
          })}
        </div>
      )
    }

    case 'enps':
    case 'nota10': {
      const notas = Array.from({ length: 11 }, (_, i) => i)
      return (
        <div>
          <div className="flex flex-wrap gap-1.5">
            {notas.map((n) => {
              const marcado = String(valor) === String(n)
              return (
                <label
                  key={n}
                  className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border text-sm font-medium transition-colors tabular ${
                    marcado
                      ? 'border-marca bg-marca text-white'
                      : 'border-borda-forte bg-white text-tinta-2 hover:bg-superficie-2'
                  }`}
                >
                  <input
                    type="radio"
                    name={nome}
                    checked={marcado}
                    onChange={() => aoResponder(n)}
                    className="sr-only"
                  />
                  {n}
                </label>
              )
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-tinta-3">
            <span>0 — de jeito nenhum</span>
            <span>10 — com certeza</span>
          </div>
        </div>
      )
    }

    case 'escolha_unica':
      return <CampoEscolhaUnica pergunta={pergunta} valor={valor} aoResponder={aoResponder} nome={nome} />


    case 'escolha_multipla': {
      const opcoes: Opcao[] = pergunta.opcoes ?? []
      const atual = Array.isArray(valor) ? valor : []
      return (
        <div className="space-y-1.5">
          {opcoes.map((o) => {
            const v = String(o.valor)
            const marcado = atual.includes(v)
            return (
              <label key={v} className="flex items-center gap-2.5 text-sm text-tinta-2">
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() =>
                    aoResponder(marcado ? atual.filter((x) => x !== v) : [...atual, v])
                  }
                  className="h-4 w-4 accent-[#2a78d6]"
                />
                {o.rotulo}
              </label>
            )
          })}
        </div>
      )
    }

    case 'sim_nao':
      return (
        <div className="flex gap-2">
          {[
            { v: 'sim', r: 'Sim' },
            { v: 'nao', r: 'Não' },
          ].map((o) => {
            const marcado = valor === o.v
            return (
              <label
                key={o.v}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors ${
                  marcado
                    ? 'border-marca bg-marca-clara font-medium text-marca-escura'
                    : 'border-borda-forte bg-white text-tinta-2 hover:bg-superficie-2'
                }`}
              >
                <input
                  type="radio"
                  name={nome}
                  checked={marcado}
                  onChange={() => aoResponder(o.v)}
                  className="sr-only"
                />
                {marcado && <Check size={14} aria-hidden />}
                {o.r}
              </label>
            )
          })}
        </div>
      )

    case 'texto_longo':
      return (
        <textarea
          name={nome}
          rows={4}
          maxLength={3000}
          value={typeof valor === 'string' ? valor : ''}
          onChange={(e) => aoResponder(e.target.value)}
          className={ENTRADA}
          placeholder="Escreva à vontade…"
        />
      )

    default:
      return (
        <input
          name={nome}
          maxLength={500}
          value={typeof valor === 'string' ? valor : ''}
          onChange={(e) => aoResponder(e.target.value)}
          className={ENTRADA}
        />
      )
  }
}
