'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from '@/components/LinkSemPrefetch'
import { Send, UserX, UserCheck, LogIn, User, Building2, Lock } from 'lucide-react'
import { enviarManifestacao } from '@/lib/fb/publico'
import { observarLogin } from '@/lib/fb/auth'
import { perfilAtual, type Perfil } from '@/lib/fb/funcionarios'
import { Aviso, Botao, Campo, ENTRADA } from '@/components/ui'
import { AREAS_SUGESTAO, AREA_SUGESTAO_AJUDA, IMPACTOS, TIPOS_RECONHECIMENTO, type ManifestacaoTipo } from '@/lib/types'

/**
 * Contribuição = "Programa de Melhoria Contínua" (formulário estruturado).
 * Reconhecimento = fluxo próprio, mais simples. A identificação é opcional;
 * quando anônima, nome/setor NÃO são gravados.
 */
export function FormCanal({ tipo }: { areas?: string[]; tipo: ManifestacaoTipo }) {
  if (tipo === 'contribuicao') return <FormMelhoria />
  return <FormReconhecimento />
}

// -------------------------------------------------------------
// Programa de Melhoria Contínua (contribuição)
// -------------------------------------------------------------
function FormMelhoria() {
  const router = useRouter()
  const [anonima, setAnonima] = useState(false)
  const [nome, setNome] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [email, setEmail] = useState('')
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
        email,
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
          <div className="mt-3 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Item 2 — Nome Completo */}
              <Campo rotulo="Nome completo" obrigatorio>
                <input value={nome} onChange={(e) => setNome(e.target.value)} required minLength={3} className={ENTRADA} placeholder="Ex.: Joana Ribeiro da Silva" autoComplete="name" />
              </Campo>
              {/* Item 3 — Departamento / Setor */}
              <Campo rotulo="Seu departamento / setor" obrigatorio>
                <input value={departamento} onChange={(e) => setDepartamento(e.target.value)} required minLength={2} className={ENTRADA} placeholder="Ex.: Marketing" />
              </Campo>
            </div>
            {/* E-mail */}
            <Campo rotulo="E-mail" ajuda="Fica visível só para a equipe, para responder você." obrigatorio>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className={ENTRADA} placeholder="voce@empresa.com.br" autoComplete="email" />
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
// Reconhecimento — identificado: captura automaticamente o perfil logado
// (nome, e-mail e centro de custo). Não é anônimo.
// -------------------------------------------------------------
function FormReconhecimento() {
  const router = useRouter()
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined)
  const [alvo, setAlvo] = useState('')
  const [tipos, setTipos] = useState<string[]>([])
  const [comentario, setComentario] = useState('')
  const [tentou, setTentou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, setPendente] = useState(false)

  useEffect(() => observarLogin(async (u) => setPerfil(u ? await perfilAtual().catch(() => null) : null)), [])

  function toggleTipo(t: string) {
    setTipos((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]))
  }

  const logado = !!perfil && perfil.ativo && (perfil.tipo === 'admin' || perfil.tipo === 'funcionario')
  const semCentro = logado && !perfil!.centro_custo
  const erroAlvo = !alvo.trim()
  const erroComentario = comentario.trim().length < 10

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro(null)
    if (erroAlvo || erroComentario) { setTentou(true); return }
    setPendente(true)
    try {
      await enviarManifestacao({
        tipo: 'reconhecimento',
        reconhecer: alvo,
        tipos,
        descricao: comentario,
        nome: perfil!.nome,
        email: perfil!.email,
        centro_custo: perfil!.centro_custo,
        anonima: false,
      })
      router.push('/canal/enviada')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui registrar agora.')
      setPendente(false)
    }
  }

  if (perfil === undefined) return <p className="text-sm text-tinta-3">Carregando…</p>

  if (!logado) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-marca-clara text-marca">
          <LogIn size={26} aria-hidden />
        </span>
        <h2 className="mt-4 text-[1.1rem] font-semibold text-tinta">Entre para reconhecer</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-tinta-2">
          O reconhecimento é identificado: usamos o seu nome, e-mail e setor do cadastro. Entre com o seu e-mail para continuar.
        </p>
        <Link href="/entrar" className="botao-gradiente mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold">
          <LogIn size={16} aria-hidden /> Entrar
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-6" noValidate>
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {/* Quem/qual time */}
      <Campo rotulo="Quem ou qual time você gostaria de reconhecer?" obrigatorio>
        <input
          value={alvo}
          onChange={(e) => setAlvo(e.target.value)}
          className={`${ENTRADA}${tentou && erroAlvo ? ' border-critico focus:border-critico' : ''}`}
          placeholder="Ex.: Time de Suporte, ou Joana da Silva"
        />
        {tentou && erroAlvo && <p className="mt-1 text-xs font-medium text-critico">Informe quem ou qual time você quer reconhecer.</p>}
      </Campo>

      {/* Tipo de manifestação (seleção múltipla) */}
      <div>
        <p className="text-sm font-medium text-tinta">Tipo de manifestação:</p>
        <p className="mt-0.5 text-xs text-tinta-3">Pode marcar mais de um.</p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {TIPOS_RECONHECIMENTO.map((t) => (
            <label key={t} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${tipos.includes(t) ? 'border-marca bg-marca-clara text-marca-escura' : 'border-borda-forte bg-white text-tinta-2 hover:border-marca'}`}>
              <input type="checkbox" checked={tipos.includes(t)} onChange={() => toggleTipo(t)} className="h-4 w-4 flex-none accent-[#2a7897]" />
              {t}
            </label>
          ))}
        </div>
      </div>

      {/* Comentário */}
      <Campo rotulo="Comente com as suas palavras" obrigatorio>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={6}
          maxLength={5000}
          className={`${ENTRADA}${tentou && erroComentario ? ' border-critico focus:border-critico' : ''}`}
          placeholder="Descreva a atitude, o apoio ou o trabalho que merece reconhecimento…"
        />
        {tentou && erroComentario && <p className="mt-1 text-xs font-medium text-critico">Escreva um comentário (mínimo 10 caracteres).</p>}
      </Campo>

      {/* Identificação automática (perfil logado) */}
      <div className="rounded-md border border-borda bg-superficie-2 p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-tinta-2">
          <Lock size={12} aria-hidden /> Enviado de forma identificada (do seu cadastro)
        </p>
        <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <span className="flex items-center gap-2 text-tinta"><User size={14} className="flex-none text-tinta-3" aria-hidden /> {perfil!.nome || perfil!.email}</span>
          <span className="flex items-center gap-2 text-tinta"><Building2 size={14} className="flex-none text-tinta-3" aria-hidden /> {perfil!.centro_custo || 'Sem centro de custo'}</span>
        </div>
        {semCentro && (
          <p className="mt-2 rounded-lg border border-[#f0c2c2] bg-[#fdeaea] px-3 py-2 text-xs leading-5 text-[#8a1f1f]">
            Seu centro de custo ainda não está definido no cadastro. Peça à equipe de Gente &amp; Cultura para configurar antes de enviar.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Botao type="submit" disabled={pendente || semCentro}>
          <Send size={15} aria-hidden /> {pendente ? 'Enviando…' : 'Enviar reconhecimento'}
        </Botao>
      </div>
    </form>
  )
}
