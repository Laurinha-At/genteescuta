'use client'

import { useEffect, useMemo, useState } from 'react'
import { UserPlus, Search, KeyRound, Power, Trash2, MailCheck } from 'lucide-react'
import {
  minhaConta,
  listarUsuarios,
  cadastrarUsuario,
  reenviarSenha,
  definirAtivo,
  alterarNivel,
  excluirUsuario,
  SENHA_PADRAO,
  type Conta,
  type Nivel,
} from '@/lib/fb/usuarios'
import { CabecalhoPagina, Cartao, Chip, Aviso, Botao, Campo, ENTRADA } from '@/components/ui'

export default function Usuarios() {
  const [eu, setEu] = useState<Conta | null | undefined>(undefined)
  const [lista, setLista] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function recarregar() {
    listarUsuarios().then(setLista).catch(() => {}).finally(() => setCarregando(false))
  }
  useEffect(() => {
    minhaConta().then(setEu).catch(() => setEu(null))
    recarregar()
  }, [])

  const souSuper = !!eu?.ativo && eu?.nivel === 'super'

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return lista
    return lista.filter((u) => `${u.nome ?? ''} ${u.email ?? ''}`.toLowerCase().includes(q))
  }, [lista, busca])

  function podeMexer(u: any): boolean {
    return u.uid !== eu?.uid // super gerencia todos, menos a própria conta
  }

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
        <CabecalhoPagina titulo="Gestão de Usuários" />
        <p className="p-6 text-sm text-tinta-3">Carregando…</p>
      </>
    )
  }

  if (!souSuper) {
    return (
      <>
        <CabecalhoPagina titulo="Gestão de Usuários" />
        <div className="p-4 sm:p-6">
          <Aviso tom="alerta" titulo="Acesso restrito">
            Apenas o <strong>Super Admin</strong> pode gerenciar usuários administradores (Master e Super Admin).
            Para cadastrar colaboradores comuns, use a tela <strong>Funcionários</strong>.
          </Aviso>
        </div>
      </>
    )
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Gestão de Usuários"
        descricao="Administradores do sistema (Master e Super Admin). Colaboradores comuns ficam em Funcionários."
      />

      <div className="max-w-6xl space-y-4 p-4 sm:p-6">
        {aviso && <Aviso tom="sucesso">{aviso}</Aviso>}
        {erro && <Aviso tom="erro">{erro}</Aviso>}

        <Cartao titulo="Adicionar usuário" apoio={`A pessoa entra com o e-mail e a senha padrão "${SENHA_PADRAO}", e troca a senha no primeiro acesso.`}>
          <FormConvite souSuper={!!souSuper} onDone={recarregar} setAviso={setAviso} setErro={setErro} />
        </Cartao>

        <Cartao
          titulo={`Usuários (${lista.length})`}
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
              {lista.length === 0 ? 'Nenhum usuário cadastrado ainda. Adicione o primeiro acima.' : 'Nenhum resultado para a busca.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-sm">
                <thead>
                  <tr className="border-b border-borda text-left text-xs font-semibold text-tinta-3">
                    <th className="px-4 py-2.5 font-semibold">Nome / E-mail</th>
                    <th className="px-4 py-2.5 font-semibold">Nível</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {filtrados.map((u) => {
                    const mexivel = podeMexer(u)
                    return (
                      <tr key={u.uid} className="hover:bg-superficie-2">
                        <td className="px-4 py-3">
                          <span className="block font-medium text-tinta">{u.nome || '—'}</span>
                          <span className="block text-xs text-tinta-3">{u.email}</span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.nivel}
                            disabled={!mexivel}
                            onChange={(e) => acao(() => alterarNivel(u.uid, e.target.value as Nivel, u.email), 'Nível atualizado.')}
                            className="rounded-md border border-borda-forte bg-white px-2 py-1 text-xs text-tinta disabled:opacity-50"
                          >
                            <option value="master">Master</option>
                            <option value="super">Super Admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {u.ativo !== false ? <Chip faixa="baixo">Ativo</Chip> : <Chip faixa="neutro">Inativo</Chip>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              title="Reenviar link de senha"
                              onClick={() => acao(() => reenviarSenha(u.email), `Link de senha reenviado para ${u.email}.`)}
                              className="rounded p-1.5 text-tinta-3 hover:bg-white hover:text-marca"
                            >
                              <KeyRound size={16} aria-hidden />
                            </button>
                            <button
                              type="button"
                              title={u.ativo !== false ? 'Inativar' : 'Ativar'}
                              disabled={!mexivel}
                              onClick={() => acao(() => definirAtivo(u.uid, u.ativo === false, u.email), u.ativo === false ? 'Usuário ativado.' : 'Usuário inativado.')}
                              className="rounded p-1.5 text-tinta-3 hover:bg-white hover:text-tinta disabled:opacity-40"
                            >
                              <Power size={16} aria-hidden />
                            </button>
                            <button
                              type="button"
                              title="Excluir"
                              disabled={!mexivel}
                              onClick={() => {
                                if (confirm(`Excluir o acesso de ${u.email}? Ele perde o acesso ao painel.`))
                                  acao(() => excluirUsuario(u.uid, u.email), 'Usuário excluído.')
                              }}
                              className="rounded p-1.5 text-tinta-3 hover:bg-plano hover:text-critico disabled:opacity-40"
                            >
                              <Trash2 size={16} aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>

        <div className="flex items-start gap-2.5 rounded-md border border-borda bg-white px-4 py-3">
          <MailCheck size={16} className="mt-0.5 flex-none text-marca" aria-hidden />
          <p className="text-xs leading-4 text-tinta-2">
            <strong className="font-semibold text-tinta">Como funciona o acesso:</strong> ao cadastrar, a pessoa já
            pode entrar com o <strong>e-mail</strong> e a senha padrão{' '}
            <strong className="rounded bg-superficie-2 px-1 font-mono text-tinta">{SENHA_PADRAO}</strong>. No{' '}
            <strong>primeiro acesso</strong> ela é obrigada a criar uma senha nova. O botão da chave 🔑 serve só se a
            pessoa <strong>esquecer a senha depois</strong> (envia um link de redefinição por e-mail).
          </p>
        </div>
      </div>
    </>
  )
}

function FormConvite({
  souSuper,
  onDone,
  setAviso,
  setErro,
}: {
  souSuper: boolean
  onDone: () => void
  setAviso: (s: string | null) => void
  setErro: (s: string | null) => void
}) {
  const [nivel, setNivel] = useState<Nivel>('master')
  const [pendente, setPendente] = useState(false)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    setPendente(true)
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email') ?? '')
    try {
      await cadastrarUsuario({ email, nome: String(f.get('nome') ?? ''), nivel })
      ;(e.target as HTMLFormElement).reset()
      setNivel('comum')
      setAviso(
        `Usuário ${email.trim().toLowerCase()} cadastrado. Ele entra com esse e-mail e a senha padrão "${SENHA_PADRAO}", e cria a senha no primeiro acesso.`,
      )
      onDone()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui cadastrar o usuário.')
    }
    setPendente(false)
  }

  return (
    <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Nome" obrigatorio>
        <input name="nome" required minLength={2} className={ENTRADA} placeholder="Ex.: Maria Silva" />
      </Campo>
      <Campo rotulo="E-mail institucional" obrigatorio>
        <input name="email" type="email" required className={ENTRADA} placeholder="maria@soulan.com.br" />
      </Campo>
      <Campo rotulo="Nível de acesso">
        <select value={nivel} onChange={(e) => setNivel(e.target.value as Nivel)} className={ENTRADA}>
          <option value="master">Master — moderação, manifestações e dashboards</option>
          <option value="super">Super Admin — controle total</option>
        </select>
      </Campo>
      <div className="flex items-end">
        <Botao type="submit" disabled={pendente}>
          <UserPlus size={15} aria-hidden /> {pendente ? 'Cadastrando…' : 'Cadastrar usuário'}
        </Botao>
      </div>
    </form>
  )
}
