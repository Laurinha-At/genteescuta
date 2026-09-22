'use client'

import { useState } from 'react'
import { Save, Megaphone } from 'lucide-react'
import { atualizarManifestacao, publicarMural } from '@/lib/fb/admin'
import { usuarioAtual } from '@/lib/fb/auth'
import { Aviso, Botao, Campo, Cartao, ENTRADA } from '@/components/ui'
import { STATUS_MANIFESTACAO_LABEL, PRIORIDADE_LABEL, TIPO_MANIFESTACAO_LABEL, type ManifestacaoStatus, type ManifestacaoTipo, type Prioridade } from '@/lib/types'

const STATUS: ManifestacaoStatus[] = ['recebida', 'em_analise', 'analisada', 'em_implementacao', 'implementada', 'nao_aplicavel', 'arquivada']
const PRIORIDADES: Prioridade[] = ['baixa', 'media', 'alta']
// Classificação: a equipe transforma uma "Contribuição" em Sugestão/Ideia/Melhoria.
// Todos os tipos entram na lista para que o valor atual sempre tenha uma opção.
const TIPOS: ManifestacaoTipo[] = ['contribuicao', 'sugestao', 'ideia', 'melhoria', 'reclamacao', 'reconhecimento']

export function FormTratativa({ m, aoSalvar }: { m: any; aoSalvar?: () => void }) {
  const [status, setStatus] = useState<ManifestacaoStatus>(m.status)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [pendente, setPendente] = useState(false)
  const mudouStatus = status !== m.status

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null); setSalvo(false); setPendente(true)
    const f = new FormData(e.currentTarget)
    const autor = usuarioAtual()?.email ?? 'Administração'
    try {
      await atualizarManifestacao(
        m.id,
        {
          status,
          tipo: String(f.get('tipo') ?? m.tipo),
          prioridade: String(f.get('prioridade') ?? 'media'),
          responsavel: String(f.get('responsavel') ?? '').trim() || null,
          mensagem: String(f.get('mensagem') ?? '').trim(),
          visivel: f.get('visivel') === 'on',
        },
        autor,
      )
      setSalvo(true)
      aoSalvar?.()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui salvar.')
    }
    setPendente(false)
  }

  return (
    <Cartao titulo="Tratativa" apoio="O que você registrar aqui vira o retorno ao colaborador.">
      <form onSubmit={enviar} className="space-y-4">
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        {salvo && !erro && <Aviso tom="sucesso">Alterações salvas.</Aviso>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Status">
            <select name="status" value={status} onChange={(e) => setStatus(e.target.value as ManifestacaoStatus)} className={ENTRADA}>
              {STATUS.map((s) => <option key={s} value={s}>{STATUS_MANIFESTACAO_LABEL[s]}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Prioridade">
            <select name="prioridade" defaultValue={m.prioridade} className={ENTRADA}>
              {PRIORIDADES.map((p) => <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>)}
            </select>
          </Campo>
        </div>

        <Campo rotulo="Classificação" ajuda="Enquadre a manifestação. Uma “Contribuição” pode virar Sugestão, Ideia ou Melhoria.">
          <select name="tipo" defaultValue={m.tipo} className={ENTRADA}>
            {TIPOS.map((t) => <option key={t} value={t}>{TIPO_MANIFESTACAO_LABEL[t]}</option>)}
          </select>
        </Campo>

        <Campo rotulo="Responsável" ajuda="Quem está conduzindo essa tratativa.">
          <input name="responsavel" defaultValue={m.responsavel ?? ''} className={ENTRADA} placeholder="Ex.: Ana — Gente & Cultura" />
        </Campo>

        <Campo rotulo="Recado sobre esta movimentação" ajuda="Escreva em linguagem simples: é isso que a pessoa lê ao consultar pelo e-mail dela.">
          <textarea name="mensagem" rows={4} className={ENTRADA} placeholder={mudouStatus ? 'Ex.: Analisamos a proposta com a área responsável e ela entrou no plano do próximo trimestre.' : 'Deixe em branco se não houver nada novo a comunicar.'} />
        </Campo>

        <label className="flex items-start gap-2.5">
          <input type="checkbox" name="visivel" defaultChecked className="mt-0.5 h-4 w-4 flex-none accent-[#2a7897]" />
          <span className="text-sm leading-5 text-tinta-2">
            Mostrar esta movimentação para quem enviou
            <span className="mt-0.5 block text-xs text-tinta-3">Desmarque para registrar uma nota interna, visível só para a administração.</span>
          </span>
        </label>

        <Botao type="submit" disabled={pendente}>
          <Save size={15} aria-hidden /> {pendente ? 'Salvando…' : 'Salvar tratativa'}
        </Botao>
      </form>
    </Cartao>
  )
}

export function FormMural({ m, aoSalvar }: { m: any; aoSalvar?: () => void }) {
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [pendente, setPendente] = useState(false)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null); setSalvo(false); setPendente(true)
    const f = new FormData(e.currentTarget)
    try {
      await publicarMural(m.id, String(f.get('resposta_publica') ?? ''), f.get('publicar') === 'on')
      setSalvo(true)
      aoSalvar?.()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui salvar.')
    }
    setPendente(false)
  }

  return (
    <Cartao titulo="Publicar no mural “Você disse, nós fizemos”" apoio="Fica visível para toda a empresa, sem identificar quem enviou.">
      <form onSubmit={enviar} className="space-y-4">
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        {salvo && !erro && <Aviso tom="sucesso">Mural atualizado.</Aviso>}

        <Campo rotulo="O que foi feito" ajuda="Conte o desfecho de forma concreta. Se não foi possível atender, explique o porquê — isso também é retorno.">
          <textarea name="resposta_publica" rows={5} defaultValue={m.resposta_publica ?? ''} className={ENTRADA} placeholder="Ex.: Instalamos uma segunda máquina de café no 2º andar em 12/03, e a reposição passou a ser diária." />
        </Campo>

        <label className="flex items-start gap-2.5">
          <input type="checkbox" name="publicar" defaultChecked={m.publicar_no_mural} className="mt-0.5 h-4 w-4 flex-none accent-[#2a7897]" />
          <span className="text-sm leading-5 text-tinta-2">
            Publicar no mural público
            <span className="mt-0.5 block text-xs text-tinta-3">O título e o texto acima ficam visíveis. A descrição original e o e-mail de quem enviou nunca são publicados.</span>
          </span>
        </label>

        <Botao type="submit" variante="secundario" disabled={pendente}>
          <Megaphone size={15} aria-hidden /> {pendente ? 'Salvando…' : 'Salvar no mural'}
        </Botao>
      </form>
    </Cartao>
  )
}
