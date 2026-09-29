'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, UserX, UserCheck } from 'lucide-react'
import { enviarManifestacao } from '@/lib/fb/publico'
import { Aviso, Botao, Campo, ENTRADA } from '@/components/ui'
import { AREAS_SUGESTAO, AREA_SUGESTAO_AJUDA, IMPACTOS, type ManifestacaoTipo } from '@/lib/types'

/**
 * Contribuição = "Programa de Melhoria Contínua" (formulário estruturado).
 * Reconhecimento = fluxo próprio, mais simples. A identificação é opcional;
 * quando anônima, nome/setor NÃO são gravados.
 */
export function FormCanal({ areas, tipo }: { areas: string[]; tipo: ManifestacaoTipo }) {
  if (tipo === 'contribuicao') return <FormMelhoria />
  return <FormReconhecimento areas={areas} tipo={tipo} />
}

// -------------------------------------------------------------
// Programa de Melhoria Contínua (contribuição)
// -------------------------------------------------------------
function FormMelhoria() {
  const router = useRouter()
  const [anonima, setAnonima] = useState(false)
  const [nome, setNome] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [categoria, setCategoria] = useState('')
  const [problema, setProblema] = useState('')
  const [sugestao, setSugestao] = useState('')
  const [impactos, setImpactos] = useState<string[]>([])
  const [impactoOutro, setImpactoOutro] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, setPendente] = useState(false)

  function toggleImpacto(v: string) {
    setImpactos((atual) => (atual.includes(v) ? atual.filter((x) => x !== v) : [...atual, v]))
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro(null); setPendente(true)
    try {
      await enviarManifestacao({
        tipo: 'contribuicao',
        anonima,
        nome,
        departamento,
        categoria,
        problema,
        sugestao,
        impactos,
        impacto_outro: impactoOutro,
      })
      router.push(anonima ? '/canal/enviada?a=1' : '/canal/enviada')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui registrar agora.')
      setPendente(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {/* Item 1 — Tipo de Participação */}
      <fieldset className="rounded-md border border-borda bg-superficie-2 p-4">
        <legend className="px-1 text-sm font-semibold text-tinta">Tipo de participação</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <OpcaoRadio
            ativo={!anonima}
            onClick={() => setAnonima(false)}
            Icone={UserCheck}
            titulo="Quero me identificar"
            apoio="Nome e setor ficam visíveis só para a equipe."
          />
          <OpcaoRadio
            ativo={anonima}
            onClick={() => setAnonima(true)}
            Icone={UserX}
            titulo="Quero enviar de forma anônima"
            apoio="Nada de identificação é gravado."
          />
        </div>

        {anonima ? (
          <p className="mt-3 rounded-lg border border-borda bg-white px-3 py-2 text-xs leading-5 text-tinta-2">
            Prefiro não me identificar. Seu nome e e-mail não serão gravados, apenas a área, para que a equipe saiba onde agir.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {/* Item 2 — Nome Completo */}
            <Campo rotulo="Nome completo" obrigatorio>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required minLength={3} className={ENTRADA} placeholder="Ex.: Joana Ribeiro da Silva" autoComplete="name" />
            </Campo>
            {/* Item 3 — Departamento / Setor */}
            <Campo rotulo="Seu departamento / setor" obrigatorio>
              <input value={departamento} onChange={(e) => setDepartamento(e.target.value)} required minLength={2} className={ENTRADA} placeholder="Ex.: Marketing" />
            </Campo>
          </div>
        )}
      </fieldset>

      {/* Item 4 — Área da Sugestão */}
      <Campo rotulo="Área da sugestão" ajuda="Escolha o tema que melhor representa a sua ideia." obrigatorio>
        <div className="grid gap-2 sm:grid-cols-2">
          {AREAS_SUGESTAO.map((a) => (
            <OpcaoRadio
              key={a}
              ativo={categoria === a}
              onClick={() => setCategoria(a)}
              titulo={a}
              apoio={AREA_SUGESTAO_AJUDA[a]}
            />
          ))}
        </div>
      </Campo>

      {/* Item 5 — Problema / oportunidade */}
      <Campo rotulo="Qual é o problema ou oportunidade que você identificou hoje?" obrigatorio>
        <textarea value={problema} onChange={(e) => setProblema(e.target.value)} required minLength={10} maxLength={5000} rows={5} className={ENTRADA} placeholder="Descreva o que você observou…" />
      </Campo>

      {/* Item 6 — Sugestão prática */}
      <Campo rotulo="Qual é a sua sugestão prática de melhoria?" obrigatorio>
        <textarea value={sugestao} onChange={(e) => setSugestao(e.target.value)} required minLength={10} maxLength={5000} rows={5} className={ENTRADA} placeholder="Conte o que poderia ser feito…" />
      </Campo>

      {/* Item 7 — Impacto principal */}
      <Campo rotulo="Qual será o principal impacto dessa mudança?" ajuda="Pode marcar mais de um." obrigatorio>
        <div className="space-y-1.5">
          {IMPACTOS.map((imp) => (
            <label key={imp} className="flex items-start gap-2.5 rounded-lg border border-borda bg-white px-3 py-2 text-sm text-tinta-2 hover:border-marca">
              <input type="checkbox" checked={impactos.includes(imp)} onChange={() => toggleImpacto(imp)} className="mt-0.5 h-4 w-4 flex-none accent-[#2a7897]" />
              <span>{imp}</span>
            </label>
          ))}
          {impactos.includes('Outro') && (
            <input value={impactoOutro} onChange={(e) => setImpactoOutro(e.target.value)} className={`${ENTRADA} mt-1`} placeholder="Descreva o outro impacto…" maxLength={200} />
          )}
        </div>
      </Campo>

      <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
        <Botao type="submit" disabled={pendente}>
          <Send size={15} aria-hidden /> {pendente ? 'Enviando…' : 'Enviar sugestão'}
        </Botao>
        <p className="text-xs text-tinta-3">{anonima ? 'Envio anônimo: apenas a área da sugestão é registrada.' : 'Seus dados ficam visíveis só para a equipe de Gente & Cultura.'}</p>
      </div>
    </form>
  )
}

function OpcaoRadio({ ativo, onClick, titulo, apoio, Icone }: { ativo: boolean; onClick: () => void; titulo: string; apoio?: string; Icone?: typeof UserX }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${ativo ? 'border-marca bg-marca-clara' : 'border-borda-forte bg-white hover:border-marca'}`}
    >
      <span className={`mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full border ${ativo ? 'border-marca' : 'border-borda-forte'}`}>
        {ativo && <span className="h-2 w-2 rounded-full bg-marca" />}
      </span>
      <span className="min-w-0">
        <span className={`flex items-center gap-1.5 text-sm font-medium ${ativo ? 'text-marca-escura' : 'text-tinta'}`}>
          {Icone && <Icone size={14} aria-hidden />} {titulo}
        </span>
        {apoio && <span className="mt-0.5 block text-xs leading-4 text-tinta-3">{apoio}</span>}
      </span>
    </button>
  )
}

// -------------------------------------------------------------
// Reconhecimento (fluxo simples, mantido)
// -------------------------------------------------------------
function FormReconhecimento({ areas, tipo }: { areas: string[]; tipo: ManifestacaoTipo }) {
  const router = useRouter()
  const [anonima, setAnonima] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, setPendente] = useState(false)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro(null); setPendente(true)
    const f = new FormData(e.currentTarget)
    try {
      await enviarManifestacao({
        tipo,
        titulo: String(f.get('titulo') ?? ''),
        descricao: String(f.get('descricao') ?? ''),
        nome: String(f.get('nome') ?? ''),
        email: String(f.get('email') ?? ''),
        area: String(f.get('area') ?? ''),
        anonima,
      })
      router.push(anonima ? '/canal/enviada?a=1' : '/canal/enviada')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui registrar agora.')
      setPendente(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <Campo rotulo="Resuma em uma frase" obrigatorio>
        <input name="titulo" required minLength={4} maxLength={160} className={ENTRADA} placeholder="Ex.: Apoio do time de Suporte na virada do mês" />
      </Campo>

      <Campo rotulo="Conte com as suas palavras" ajuda="Quem você quer reconhecer e por quê." obrigatorio>
        <textarea name="descricao" required minLength={15} maxLength={5000} rows={6} className={ENTRADA} placeholder="Descreva a atitude, o apoio ou o trabalho que merece reconhecimento…" />
      </Campo>

      <fieldset className="rounded-md border border-borda bg-superficie-2 p-4">
        <legend className="px-1 text-sm font-semibold text-tinta">Sobre você</legend>
        <div className="space-y-4">
          <Campo rotulo="Área ou setor" ajuda="Direciona e alimenta os indicadores por área." obrigatorio>
            <select name="area" required className={ENTRADA} defaultValue="">
              <option value="" disabled>Selecione…</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Campo>

          <div className="border-t border-borda pt-4">
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={anonima} onChange={(e) => setAnonima(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-[#2a7897]" />
              <span>
                <span className="block text-sm font-medium text-tinta">Prefiro não me identificar</span>
                <span className="mt-0.5 block text-xs leading-4 text-tinta-3">Seu nome e e-mail não serão gravados, apenas a área, para que a equipe saiba onde agir.</span>
              </span>
            </label>

            {!anonima && (
              <div className="mt-4 space-y-4">
                <Campo rotulo="Nome completo" obrigatorio>
                  <input name="nome" required minLength={3} className={ENTRADA} placeholder="Ex.: Joana Ribeiro da Silva" autoComplete="name" />
                </Campo>
                <Campo rotulo="E-mail" obrigatorio>
                  <input name="email" type="email" required className={ENTRADA} placeholder="voce@empresa.com.br" autoComplete="email" />
                </Campo>
              </div>
            )}
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Botao type="submit" disabled={pendente}>
          <Send size={15} aria-hidden /> {pendente ? 'Enviando…' : 'Enviar reconhecimento'}
        </Botao>
      </div>
    </form>
  )
}
