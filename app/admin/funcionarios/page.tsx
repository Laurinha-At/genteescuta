'use client'

import { useEffect, useMemo, useState } from 'react'
import { UserPlus, Search, KeyRound, Power, Trash2, Users } from 'lucide-react'
import { minhaConta, ehGerente, SENHA_PADRAO, type Conta } from '@/lib/fb/usuarios'
import {
  listarFuncionarios,
  cadastrarFuncionario,
  definirAtivoFuncionario,
  excluirFuncionario,
  reenviarSenhaFuncionario,
} from '@/lib/fb/funcionarios'
import { CabecalhoPagina, Cartao, Chip, Aviso, Botao, Campo, ENTRADA } from '@/components/ui'

export default function Funcionarios() {
  const [eu, setEu] = useState<Conta | null | undefined>(undefined)
  const [lista, setLista] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function recarregar() {
    listarFuncionarios().then(setLista).catch(() => {}).finally(() => setCarregando(false))
  }
  useEffect(() => {
    minhaConta().then(setEu).catch(() => setEu(null))
    recarregar()
  }, [])

  const souGerente = ehGerente(eu ?? null)

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return lista
    return lista.filter((u) => `${u.nome ?? ''} ${u.email ?? ''}`.toLowerCase().includes(q))
  }, [lista, busca])

  async function acao(fn: () => Promise<unknown>, msg: string) {
    setErro(null)
    setAviso(null)
    try {
      await fn()
      setAviso(msg)
      recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui concluir a ação.')
    }
  }

  if (eu === undefined) {
    return (
      <>
        <CabecalhoPagina titulo="Funcionários" />
        <p className="p-6 text-sm text-tinta-3">Carregando…</p>
      </>
    )
  }

  if (!souGerente) {
    return (
      <>
        <CabecalhoPagina titulo="Funcionários" />
        <div className="p-4 sm:p-6">
          <Aviso tom="alerta" titulo="Acesso restrito">
            Apenas <strong>Master</strong> ou <strong>Super Admin</strong> podem gerenciar funcionários.
          </Aviso>
        </div>
      </>
    )
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Funcionários"
        descricao="Cadastre os colaboradores que poderão entrar para reagir e comentar no mural."
      />

      <div className="max-w-4xl space-y-4 p-4 sm:p-6">
        {aviso && <Aviso tom="sucesso">{aviso}</Aviso>}
        {erro && <Aviso tom="erro">{erro}</Aviso>}

        <Cartao titulo="Adicionar funcionário" apoio={`A pessoa entra com o e-mail e a senha padrão "${SENHA_PADRAO}", e troca no primeiro acesso.`}>
          <FormFunc onDone={recarregar} setAviso={setAviso} setErro={setErro} />
        </Cartao>

        <Cartao
          titulo={`Funcionários (${lista.length})`}
          acao={
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tinta-3" aria-hidden />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou e-mail"
                className="w-56 rounded-lg border border-borda-forte bg-white py-1.5 pl-8 pr-3 text-sm text-tinta placeholder:text-tinta-3 focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
              />
            </div>
          }
          padding={false}
        >
          {carregando ? (
            <p className="p-4 text-sm text-tinta-3">Carregando…</p>
          ) : filtrados.length === 0 ? (
            <p className="p-4 text-sm text-tinta-3">
              {lista.length === 0 ? 'Nenhum funcionário cadastrado ainda.' : 'Nenhum resultado para a busca.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-borda text-left text-xs font-semibold text-tinta-3">
                    <th className="px-4 py-2.5 font-semibold">Nome / E-mail</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {filtrados.map((u) => (
                    <tr key={u.uid} className="hover:bg-superficie-2">
                      <td className="px-4 py-3">
                        <span className="block font-medium text-tinta">{u.nome || '—'}</span>
                        <span className="block text-xs text-tinta-3">{u.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.ativo !== false ? <Chip faixa="baixo">Ativo</Chip> : <Chip faixa="neutro">Inativo</Chip>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            title="Enviar link de redefinição por e-mail"
                            onClick={() => acao(() => reenviarSenhaFuncionario(u.email), `Link de senha enviado para ${u.email}.`)}
                            className="rounded p-1.5 text-tinta-3 hover:bg-white hover:text-marca"
                          >
                            <KeyRound size={16} aria-hidden />
                          </button>
                          <button
                            type="button"
                            title={u.ativo !== false ? 'Inativar' : 'Ativar'}
                            onClick={() => acao(() => definirAtivoFuncionario(u.uid, u.ativo === false, u.email), u.ativo === false ? 'Funcionário ativado.' : 'Funcionário inativado.')}
                            className="rounded p-1.5 text-tinta-3 hover:bg-white hover:text-tinta"
                          >
                            <Power size={16} aria-hidden />
                          </button>
                          <button
                            type="button"
                            title="Excluir"
                            onClick={() => {
                              if (confirm(`Excluir o acesso de ${u.email}?`)) acao(() => excluirFuncionario(u.uid, u.email), 'Funcionário excluído.')
                            }}
                            className="rounded p-1.5 text-tinta-3 hover:bg-plano hover:text-critico"
                          >
                            <Trash2 size={16} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>

        <div className="flex items-start gap-2.5 rounded-md border border-borda bg-white px-4 py-3">
          <Users size={16} className="mt-0.5 flex-none text-marca" aria-hidden />
          <p className="text-xs leading-4 text-tinta-2">
            Funcionários entram pela opção <strong className="font-semibold text-tinta">“Sou funcionário”</strong> no
            topo do site, com o e-mail e a senha padrão{' '}
            <strong className="rounded bg-superficie-2 px-1 font-mono text-tinta">{SENHA_PADRAO}</strong>, e criam a
            própria senha no primeiro acesso. Depois de entrar, podem reagir e comentar no mural (identificados).
          </p>
        </div>
      </div>
    </>
  )
}

function FormFunc({
  onDone,
  setAviso,
  setErro,
}: {
  onDone: () => void
  setAviso: (s: string | null) => void
  setErro: (s: string | null) => void
}) {
  const [pendente, setPendente] = useState(false)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    setPendente(true)
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email') ?? '')
    try {
      const res = await cadastrarFuncionario({ email, nome: String(f.get('nome') ?? '') })
      ;(e.target as HTMLFormElement).reset()
      const e2 = email.trim().toLowerCase()
      setAviso(
        res.reaproveitada
          ? `A conta de ${e2} já existia no login e foi vinculada à lista de funcionários.`
          : `Funcionário ${e2} cadastrado. Ele entra com esse e-mail e a senha padrão "${SENHA_PADRAO}".`,
      )
      onDone()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui cadastrar.')
    }
    setPendente(false)
  }

  return (
    <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
      <Campo rotulo="Nome" obrigatorio>
        <input name="nome" required minLength={2} className={ENTRADA} placeholder="Ex.: João Pereira" />
      </Campo>
      <Campo rotulo="E-mail institucional" obrigatorio>
        <input name="email" type="email" required className={ENTRADA} placeholder="joao@soulan.com.br" />
      </Campo>
      <div className="flex items-end">
        <Botao type="submit" disabled={pendente}>
          <UserPlus size={15} aria-hidden /> {pendente ? 'Cadastrando…' : 'Cadastrar'}
        </Botao>
      </div>
    </form>
  )
}
