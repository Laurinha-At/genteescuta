'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { criarPesquisa } from '@/lib/fb/admin'
import { Aviso, Botao, Campo, ENTRADA } from '@/components/ui'

const MODELOS = [
  { id: 'soulan', nome: 'Sua Voz, Nosso Compromisso (Soulan)', perguntas: '13 blocos · ~10 min', descricao: 'A pesquisa NR-1 da Soulan, exatamente com os 13 blocos definidos: demandas, liderança, reconhecimento, saúde, clima e campos abertos.' },
  { id: 'nr1', nome: 'NR-1 completo', perguntas: '~50 perguntas · 12 a 15 min', descricao: 'O inventário completo, nas 12 dimensões, mais eNPS e campos abertos. Sustenta o PGR. Recomendado uma vez por ano.' },
  { id: 'pulso', nome: 'Pulso trimestral', perguntas: '~30 perguntas · 6 a 8 min', descricao: 'Versão curta: dois itens por dimensão, mantendo a seção de assédio na íntegra.' },
  { id: 'clima', nome: 'Clima e eNPS', perguntas: '~8 perguntas · 2 a 3 min', descricao: 'Só perfil, eNPS, satisfação e campos abertos. Rápida o suficiente para rodar todo mês.' },
]

const TITULO_PADRAO: Record<string, string> = {
  soulan: 'NR-1 | Sua Voz, Nosso Compromisso',
}

const IDENTIFICACOES = [
  { id: 'confidencial', nome: 'Confidencial (recomendado)', descricao: 'Pede o e-mail só para impedir resposta duplicada — convertido em código, não fica ligado às respostas.' },
  { id: 'identificada', nome: 'Identificada', descricao: 'O e-mail fica visível para a administração. Reduz a franqueza nas perguntas sensíveis.' },
  { id: 'anonima', nome: 'Anônima', descricao: 'Não pede e-mail. Máxima franqueza, mas a mesma pessoa pode responder mais de uma vez.' },
]

export function FormNovaPesquisa() {
  const router = useRouter()
  const [modelo, setModelo] = useState('soulan')
  const [titulo, setTitulo] = useState(TITULO_PADRAO.soulan)
  const [identificacao, setIdentificacao] = useState('confidencial')
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, setPendente] = useState(false)

  function escolherModelo(id: string) {
    setModelo(id)
    // preenche o título padrão do modelo se o campo ainda estiver vazio ou com outro padrão
    const padroes = Object.values(TITULO_PADRAO)
    if (!titulo.trim() || padroes.includes(titulo.trim())) setTitulo(TITULO_PADRAO[id] ?? '')
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null); setPendente(true)
    const f = new FormData(e.currentTarget)
    try {
      const { id } = await criarPesquisa({
        modelo,
        identificacao,
        titulo: String(f.get('titulo') ?? ''),
        descricao: String(f.get('descricao') ?? ''),
        publico_alvo: String(f.get('publico_alvo') ?? ''),
        fecha_em: String(f.get('fecha_em') ?? ''),
        min_grupo: String(f.get('min_grupo') ?? '5'),
      })
      router.push(`/admin/pesquisas/ver?id=${id}`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui criar a pesquisa.')
      setPendente(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <fieldset>
        <legend className="text-sm font-medium text-tinta">Modelo do questionário</legend>
        <div className="mt-2 space-y-2">
          {MODELOS.map((m) => (
            <button key={m.id} type="button" onClick={() => escolherModelo(m.id)} aria-pressed={modelo === m.id}
              className={`flex w-full gap-3 rounded-md border p-3.5 text-left transition-colors ${modelo === m.id ? 'border-marca bg-marca-clara ring-1 ring-marca' : 'border-borda-forte bg-white hover:bg-superficie-2'}`}>
              <span className={`mt-1 h-3.5 w-3.5 flex-none rounded-full border-2 ${modelo === m.id ? 'border-marca bg-marca' : 'border-borda-forte'}`} />
              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-2"><span className="text-sm font-semibold text-tinta">{m.nome}</span><span className="text-xs text-tinta-3">{m.perguntas}</span></span>
                <span className="mt-1 block text-xs leading-4 text-tinta-2">{m.descricao}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-tinta">Como as pessoas se identificam</legend>
        <div className="mt-2 space-y-2">
          {IDENTIFICACOES.map((o) => (
            <button key={o.id} type="button" onClick={() => setIdentificacao(o.id)} aria-pressed={identificacao === o.id}
              className={`flex w-full gap-3 rounded-md border p-3.5 text-left transition-colors ${identificacao === o.id ? 'border-marca bg-marca-clara ring-1 ring-marca' : 'border-borda-forte bg-white hover:bg-superficie-2'}`}>
              <span className={`mt-1 h-3.5 w-3.5 flex-none rounded-full border-2 ${identificacao === o.id ? 'border-marca bg-marca' : 'border-borda-forte'}`} />
              <span className="min-w-0"><span className="block text-sm font-semibold text-tinta">{o.nome}</span><span className="mt-1 block text-xs leading-4 text-tinta-2">{o.descricao}</span></span>
            </button>
          ))}
        </div>
      </fieldset>

      <Campo rotulo="Título da pesquisa" obrigatorio ajuda="Para aplicações periódicas, inclua o período (ex.: “… — 2º sem/2026”) para comparar no histórico.">
        <input name="titulo" required minLength={4} value={titulo} onChange={(e) => setTitulo(e.target.value)} className={ENTRADA} placeholder="Ex.: NR-1 | Sua Voz, Nosso Compromisso" />
      </Campo>

      <Campo rotulo="Mensagem de abertura" ajuda="Aparece para quem for responder, logo no início.">
        <textarea name="descricao" rows={3} className={ENTRADA} placeholder="Ex.: Esta pesquisa faz parte do nosso programa de saúde e segurança. Leva cerca de 12 minutos." />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Pessoas convidadas" ajuda="Usado para a taxa de participação."><input name="publico_alvo" type="number" min={1} className={ENTRADA} placeholder="Ex.: 120" /></Campo>
        <Campo rotulo="Prazo final" ajuda="Depois desta data o link para de aceitar."><input name="fecha_em" type="date" className={ENTRADA} /></Campo>
        <Campo rotulo="Grupo mínimo" ajuda="Abaixo disso, o recorte não aparece."><input name="min_grupo" type="number" min={1} defaultValue={5} className={ENTRADA} /></Campo>
      </div>

      <div className="border-t border-borda pt-5">
        <Botao type="submit" disabled={pendente}><Plus size={15} aria-hidden /> {pendente ? 'Criando…' : 'Criar pesquisa'}</Botao>
        <p className="mt-2 text-xs text-tinta-3">Ela nasce como rascunho. Você revisa as perguntas e só depois abre para as pessoas.</p>
      </div>
    </form>
  )
}
