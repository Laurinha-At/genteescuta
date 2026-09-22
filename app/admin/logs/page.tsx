'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, LogIn, UserX } from 'lucide-react'
import { minhaConta, listarLogs, listarUsuarios, type Conta } from '@/lib/fb/usuarios'
import { listarFuncionarios } from '@/lib/fb/funcionarios'
import { CabecalhoPagina, Cartao, Aviso } from '@/components/ui'

const ACAO_LABEL: Record<string, string> = {
  login: 'Entrou no sistema',
  primeira_senha: 'Criou a senha (1º acesso)',
  cadastro: 'Cadastrou administrador',
  cadastro_funcionario: 'Cadastrou funcionário',
  convite: 'Convidou usuário',
  redefinir_senha: 'Reenviou link de senha',
  redefinir_senha_funcionario: 'Reenviou senha (funcionário)',
  ativar_usuario: 'Ativou usuário',
  inativar_usuario: 'Inativou usuário',
  ativar_funcionario: 'Ativou funcionário',
  inativar_funcionario: 'Inativou funcionário',
  alterar_nivel: 'Alterou nível de acesso',
  excluir_usuario: 'Excluiu usuário',
  excluir_funcionario: 'Excluiu funcionário',
}

function rotuloAcao(a: string) {
  return ACAO_LABEL[a] ?? a
}
function fmtDataHora(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR')
  } catch {
    return iso
  }
}

export default function Logs() {
  const [eu, setEu] = useState<Conta | null | undefined>(undefined)
  const [logs, setLogs] = useState<any[]>([])
  const [pessoas, setPessoas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    minhaConta().then(setEu).catch(() => setEu(null))
    Promise.all([listarLogs(), listarUsuarios(), listarFuncionarios()])
      .then(([l, u, f]) => {
        setLogs(l)
        setPessoas([...u, ...f])
      })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  const souSuper = !!eu?.ativo && eu?.nivel === 'super'

  const nuncaEntraram = useMemo(() => {
    const comLogin = new Set(logs.filter((l) => l.acao === 'login').map((l) => l.uid))
    return pessoas.filter((u) => !comLogin.has(u.uid))
  }, [logs, pessoas])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return logs
    return logs.filter((l) =>
      `${l.email ?? ''} ${rotuloAcao(l.acao)} ${l.detalhe ?? ''}`.toLowerCase().includes(q),
    )
  }, [logs, busca])

  if (eu === undefined) {
    return (
      <>
        <CabecalhoPagina titulo="Histórico e Auditoria" />
        <p className="p-6 text-sm text-tinta-3">Carregando…</p>
      </>
    )
  }

  if (!souSuper) {
    return (
      <>
        <CabecalhoPagina titulo="Histórico e Auditoria" />
        <div className="p-4 sm:p-6">
          <Aviso tom="alerta" titulo="Acesso restrito">
            Apenas o <strong>Super Admin</strong> pode ver a auditoria de logs.
          </Aviso>
        </div>
      </>
    )
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Histórico e Auditoria"
        descricao="Quem acessou, quando e o que fez. Também mostra quem ainda não entrou pela primeira vez."
      />

      <div className="max-w-6xl space-y-4 p-4 sm:p-6">
        <Cartao
          titulo="Nunca acessaram"
          apoio="Usuários cadastrados que ainda não fizeram o primeiro login (não definiram a senha ou nunca entraram)."
        >
          {nuncaEntraram.length === 0 ? (
            <p className="text-sm text-tinta-3">Todos os usuários cadastrados já acessaram pelo menos uma vez. 🎉</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {nuncaEntraram.map((u) => (
                <li key={u.uid} className="inline-flex items-center gap-1.5 rounded-full border border-[#f2dfae] bg-[#fdf7e7] px-3 py-1 text-xs text-[#6b4a00]">
                  <UserX size={12} aria-hidden />
                  {u.nome || u.email} <span className="text-[#a8863b]">({u.email})</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao
          titulo={`Movimentações (${logs.length})`}
          acao={
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tinta-3" aria-hidden />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por usuário ou ação"
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
              {logs.length === 0 ? 'Ainda não há registros de acesso.' : 'Nenhum resultado para a busca.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-borda text-left text-xs font-semibold text-tinta-3">
                    <th className="px-4 py-2.5 font-semibold">Data / hora</th>
                    <th className="px-4 py-2.5 font-semibold">Usuário</th>
                    <th className="px-4 py-2.5 font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {filtrados.map((l) => (
                    <tr key={l.id} className="hover:bg-superficie-2">
                      <td className="whitespace-nowrap px-4 py-2.5 text-tinta-2 tabular">{fmtDataHora(l.em)}</td>
                      <td className="px-4 py-2.5 text-tinta-2">{l.email ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-tinta">
                          {l.acao === 'login' && <LogIn size={13} className="text-marca" aria-hidden />}
                          {rotuloAcao(l.acao)}
                        </span>
                        {l.detalhe && <span className="ml-1 text-xs text-tinta-3">· {l.detalhe}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>
      </div>
    </>
  )
}
