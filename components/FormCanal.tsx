'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, UserX } from 'lucide-react'
import { enviarManifestacao } from '@/lib/fb/publico'
import { Aviso, Botao, Campo, ENTRADA } from '@/components/ui'
import type { ManifestacaoTipo } from '@/lib/types'

/**
 * Formulário de envio de UMA manifestação, já com o tipo escolhido na
 * tela anterior. A identificação é opcional; a área é obrigatória,
 * porque é ela que alimenta os dashboards por setor.
 */
export function FormCanal({
  areas,
  tipo,
}: {
  areas: string[]
  tipo: ManifestacaoTipo
}) {
  const router = useRouter()
  const [anonima, setAnonima] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, setPendente] = useState(false)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setPendente(true)
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

      {/* -------- Conteúdo -------- */}
      <Campo rotulo="Resuma em uma frase" obrigatorio>
        <input name="titulo" required minLength={4} maxLength={160} className={ENTRADA} placeholder="Ex.: Falta de café na copa do 2º andar" />
      </Campo>

      <Campo
        rotulo="Conte com as suas palavras"
        ajuda="Quanto mais detalhe, mais fácil resolver. Se for algo que aconteceu, diga quando e onde."
        obrigatorio
      >
        <textarea
          name="descricao"
          required
          minLength={15}
          maxLength={5000}
          rows={7}
          className={ENTRADA}
          placeholder="Descreva a situação, a ideia ou a pessoa que você quer reconhecer…"
        />
      </Campo>

      {/* -------- Sobre você -------- */}
      <fieldset className="rounded-md border border-borda bg-superficie-2 p-4">
        <legend className="px-1 text-sm font-semibold text-tinta">Sobre você</legend>

        <div className="space-y-4">
          <Campo
            rotulo="Área ou setor"
            ajuda="Direciona a manifestação para quem consegue resolver e alimenta os indicadores por área."
            obrigatorio
          >
            <select name="area" required className={ENTRADA} defaultValue="">
              <option value="" disabled>
                Selecione…
              </option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Campo>

          <div className="border-t border-borda pt-4">
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={anonima}
                onChange={(e) => setAnonima(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none accent-[#2a7897]"
              />
              <span>
                <span className="block text-sm font-medium text-tinta">Prefiro não me identificar</span>
                <span className="mt-0.5 block text-xs leading-4 text-tinta-3">
                  Seu nome e e-mail não serão gravados — apenas a área, para que a equipe saiba onde agir.
                </span>
              </span>
            </label>

            {anonima ? (
              <div className="mt-3">
                <Aviso tom="alerta" titulo="Como fica o envio anônimo">
                  <ul className="mt-1 space-y-1">
                    <li className="flex gap-1.5">
                      <UserX size={13} className="mt-0.5 flex-none" aria-hidden />
                      Ninguém, nem a administração, verá quem enviou.
                    </li>
                    <li>• A sua área <strong>continua registrada</strong> e aparece nos painéis.</li>
                    <li>
                      • Sem e-mail gravado, você não conseguirá consultar o andamento depois —
                      acompanhe o desfecho pelo mural.
                    </li>
                  </ul>
                </Aviso>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-xs leading-4 text-tinta-3">
                  Ficam visíveis apenas para a equipe de Gente &amp; Cultura, para responder você.
                </p>
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
          <Send size={15} aria-hidden />
          {pendente ? 'Enviando…' : 'Enviar manifestação'}
        </Botao>
        <p className="text-xs text-tinta-3">
          {anonima
            ? 'Envio anônimo: apenas a área será registrada.'
            : 'A equipe responde no e-mail que você informou.'}
        </p>
      </div>
    </form>
  )
}
