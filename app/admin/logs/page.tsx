'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, LogIn, UserX, CheckCircle2 } from 'lucide-react'
import { minhaConta, listarLogs, listarUsuarios, type Conta } from '@/lib/fb/usuarios'
import { listarFuncionarios } from '@/lib/fb/funcionarios'
import { CabecalhoPagina, Cartao, Chip, Aviso } from '@/components/ui'

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
  permissoes: 'Alterou permissões de acesso',
  excluir_usuario: 'Excluiu usuário',
  excluir_funcionario: 'Excluiu funcionário',
}

function rotuloAcao(a: string) {
  return ACAO_LABEL[a] ?? a
}
function fmtDataHora(iso: string) {
  try { return new Date(iso).toLocaleString('pt-BR') } catch { return iso }
}

type FiltroAcesso = 'todos' | 'acessaram' | 'nunca'

export default function Logs() {
  const [eu, setEu] = useState<Conta | null | undefined>(undefined)
  const [logs, setLogs] = useState<any[]>([])
  const [pessoas, setPessoas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  // Filtros da tabela de usuários (acessos)
  const [buscaUsuarios, setBuscaUsuarios] = useState('')
  const [filtroAcesso, setFiltroAcesso] = useState<FiltroAcesso>('todos')
  // Filtro do histórico de movimentações
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

  // Último login por uid (a partir dos logs de "login").
  const ultimoLoginPorUid = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const l of logs) {
      if (l.acao !== 'login' || !l.uid) continue
      const atual = mapa.get(l.uid)
      if (!atual || (l.em ?? '') > atual) mapa.set(l.uid, l.em ?? '')
    }
    return mapa
  }, [logs])

  // Lista de usuários (A→Z por e-mail), sem duplicar por uid.
  const usuarios = useMemo(() => {
    const porUid = new Map<string, any>()
    for (const p of pessoas) {
      if (!p.uid) continue
      if (!porUid.has(p.uid)) porUid.set(p.uid, p)
    }
    return Array.from(porUid.values())
      .map((p) => {
        const ultimo = ultimoLoginPorUid.get(p.uid) || ''
        return { uid: p.uid, nome: p.nome || '', email: (p.email || '').toLowerCase(), ultimo, nunca: !ultimo }
      })
      .sort((a, b) => a.email.localeCompare(b.email))
  }, [pessoas, ultimoLoginPorUid])

  const usuariosFiltrados = useMemo(() => {
    const q = buscaUsuarios.trim().toLowerCase()
    return usuarios.filter((u) => {
      if (filtroAcesso === 'acessaram' && u.nunca) return false
      if (filtroAcesso === 'nunca' && !u.nunca) return false
      if (q && !`${u.nome} ${u.email}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [usuarios, buscaUsuarios, filtroAcesso])

  const qtdNunca = useMemo(() => usuarios.filter((u) => u.nunca).length, [usuarios])

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
        <CabecalhoPagina titulo="Login e Logs" />
        <p className="p-6 text-sm text-tinta-3">Carregando…</p>
      </>
    )
  }

  if (!souSuper) {
    return (
      <>
        <CabecalhoPagina titulo="Login e Logs" />
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
        titulo="Login e Logs"
        descricao="Acompanhe quem já acessou, quem ainda não entrou e o histórico de ações do sistema."
      />

      <div className="max-w-6xl space-y-4 p-4 sm:p-6">
        {/* ---- Tabela de usuários (acessos), A→Z por e-mail ---- */}
        <Cartao
          titulo={`Usuários (${usuarios.length})`}
          apoio="Ordenados por e-mail. Use o filtro para ver só quem nunca acessou."
          acao={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filtroAcesso}
                onChange={(e) => setFiltroAcesso(e.target.value as FiltroAcesso)}
                className="rounded-lg border border-borda-forte bg-white px-2.5 py-1.5 text-sm text-tinta focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
              >
                <option value="todos">Todos ({usuarios.length})</option>
                <option value="acessaram">Já acessaram ({usuarios.length - qtdNunca})</option>
                <option value="nunca">Nunca acessaram ({qtdNunca})</option>
              </select>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tinta-3" aria-hidden />
                <input
                  value={buscaUsuarios}
                  onChange={(e) => setBuscaUsuarios(e.target.value)}
                  placeholder="Buscar por nome ou e-mail"
                  className="w-52 rounded-lg border border-borda-forte bg-white py-1.5 pl-8 pr-3 text-sm text-tinta placeholder:text-tinta-3 focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
                />
              </div>
            </div>
          }
          padding={false}
        >
          {carregando ? (
            <p className="p-4 text-sm text-tinta-3">Carregando…</p>
          ) : usuariosFiltrados.length === 0 ? (
            <p className="p-4 text-sm text-tinta-3">
              {usuarios.length === 0 ? 'Nenhum usuário cadastrado ainda.' : 'Nenhum resultado para o filtro.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-borda text-left text-xs font-semibold text-tinta-3">
                    <th className="px-4 py-2.5 font-semibold">E-mail</th>
                    <th className="px-4 py-2.5 font-semibold">Nome</th>
                    <th className="px-4 py-2.5 font-semibold">Último acesso</th>
                    <th className="px-4 py-2.5 font-semibold">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.uid} className="hover:bg-superficie-2">
                      <td className="px-4 py-2.5 font-medium text-tinta">{u.email || '-'}</td>
                      <td className="px-4 py-2.5 text-tinta-2">{u.nome || '-'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-tinta-2 tabular">{u.ultimo ? fmtDataHora(u.ultimo) : '-'}</td>
                      <td className="px-4 py-2.5">
                        {u.nunca ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f2dfae] bg-[#fdf7e7] px-2.5 py-0.5 text-xs font-medium text-[#6b4a00]">
                            <UserX size={12} aria-hidden /> Nunca acessou
                          </span>
                        ) : (
                          <Chip faixa="baixo">Já acessou</Chip>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>

        {/* ---- Histórico de movimentações (logs) ---- */}
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
                      <td className="px-4 py-2.5 text-tinta-2">{l.email ?? '-'}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-tinta">
                          {l.acao === 'login' && <LogIn size={13} className="text-marca" aria-hidden />}
                          {l.acao === 'primeira_senha' && <CheckCircle2 size={13} className="text-verde-escuro" aria-hidden />}
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
