'use client'

import { useEffect, useMemo, useState } from 'react'
import { UserPlus, Search, KeyRound, Power, Trash2, Users, SlidersHorizontal, X } from 'lucide-react'
import { minhaConta, ehGerente, SENHA_PADRAO, type Conta } from '@/lib/fb/usuarios'
import {
  listarFuncionarios,
  cadastrarFuncionario,
  definirAtivoFuncionario,
  excluirFuncionario,
  reenviarSenhaFuncionario,
  atualizarPapeisFuncionario,
} from '@/lib/fb/funcionarios'
import { CENTROS_CUSTO, TODOS_CENTROS, PAPEL_LABEL, PAPEL_DESC } from '@/lib/reembolso'
import { CabecalhoPagina, Cartao, Chip, Aviso, Botao, Campo, ENTRADA } from '@/components/ui'
import { ImportarFuncionarios } from '@/components/ImportarFuncionarios'
import { analisarDataBR } from '@/lib/importarFuncionarios'

// Papéis que um FUNCIONÁRIO pode acumular (colaborador é sempre incluído).
// "master" = admin completo (mesmo poder do e-mail semente).
const PAPEIS_FUNC = ['master', 'gestor', 'financeiro'] as const

function pad2(n: number) { return String(n).padStart(2, '0') }

/** Converte os campos de data digitados em DadosPessoais; lança se inválido. */
function montarDatas(anivTxt: string, admTxt: string) {
  const extras: Record<string, unknown> = {}
  if (anivTxt.trim()) {
    const a = analisarDataBR(anivTxt.trim())
    if (a === 'invalido' || !a) throw new Error('Data de aniversário inválida (use DD/MM ou DD/MM/AAAA).')
    extras.aniv_dia = a.dia; extras.aniv_mes = a.mes; extras.aniversario = `${pad2(a.dia)}/${pad2(a.mes)}`
  }
  if (admTxt.trim()) {
    const d = analisarDataBR(admTxt.trim())
    if (d === 'invalido' || !d) throw new Error('Data de admissão inválida (use DD/MM/AAAA).')
    extras.adm_dia = d.dia; extras.adm_mes = d.mes; extras.adm_ano = d.ano ?? null
    extras.admissao = d.ano ? `${pad2(d.dia)}/${pad2(d.mes)}/${d.ano}` : `${pad2(d.dia)}/${pad2(d.mes)}`
  }
  return extras
}

export default function Funcionarios() {
  const [eu, setEu] = useState<Conta | null | undefined>(undefined)
  const [lista, setLista] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [editando, setEditando] = useState<any | null>(null)

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

      <div className="max-w-6xl space-y-4 p-4 sm:p-6">
        {aviso && <Aviso tom="sucesso">{aviso}</Aviso>}
        {erro && <Aviso tom="erro">{erro}</Aviso>}

        <Cartao titulo="Adicionar funcionário" apoio={`A pessoa entra com o e-mail e a senha padrão "${SENHA_PADRAO}", e troca no primeiro acesso.`}>
          <FormFunc onDone={recarregar} setAviso={setAviso} setErro={setErro} />
        </Cartao>

        <Cartao titulo="Importar por planilha" apoio="Cadastre vários de uma vez (.xlsx/.csv). Casa por e-mail: cria novos e atualiza existentes; reprocessar o mesmo arquivo não duplica.">
          <ImportarFuncionarios onDone={recarregar} />
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
                    <th className="px-4 py-2.5 font-semibold">Papéis / Centro de custo</th>
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
                        {(u.matricula || u.aniversario) && (
                          <span className="mt-0.5 block text-xs text-tinta-3">
                            {u.matricula ? `Matr. ${u.matricula}` : ''}
                            {u.matricula && u.aniversario ? ' · ' : ''}
                            {u.aniversario ? `🎂 ${u.aniversario}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {(Array.isArray(u.papeis) ? u.papeis : []).filter((p: string) => p !== 'colaborador').length === 0 ? (
                            <Chip faixa="neutro">Colaborador</Chip>
                          ) : (
                            (u.papeis as string[])
                              .filter((p) => p !== 'colaborador')
                              .map((p) => <Chip key={p} faixa="marca">{PAPEL_LABEL[p as keyof typeof PAPEL_LABEL] ?? p}</Chip>)
                          )}
                        </div>
                        <span className="mt-1 block text-xs text-tinta-3">{u.centro_custo || 'Sem centro de custo'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.ativo !== false ? <Chip faixa="baixo">Ativo</Chip> : <Chip faixa="neutro">Inativo</Chip>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            title="Editar papéis e centro de custo"
                            onClick={() => setEditando(u)}
                            className="rounded p-1.5 text-tinta-3 hover:bg-white hover:text-marca"
                          >
                            <SlidersHorizontal size={16} aria-hidden />
                          </button>
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
            Funcionários entram pela opção <strong className="font-semibold text-tinta">“Acesso”</strong> no
            topo do site, com o e-mail e a senha padrão{' '}
            <strong className="rounded bg-superficie-2 px-1 font-mono text-tinta">{SENHA_PADRAO}</strong>, e criam a
            própria senha no primeiro acesso. O nível de acesso (Colaborador, Gestor, Financeiro ou Master) é definido
            pelos papéis marcados acima.
          </p>
        </div>
      </div>

      {editando && (
        <EditorPapeis
          usuario={editando}
          onFechar={() => setEditando(null)}
          onSalvo={(msg) => { setEditando(null); setAviso(msg); recarregar() }}
          setErro={setErro}
        />
      )}
    </>
  )
}

function EditorPapeis({
  usuario,
  onFechar,
  onSalvo,
  setErro,
}: {
  usuario: any
  onFechar: () => void
  onSalvo: (msg: string) => void
  setErro: (s: string | null) => void
}) {
  const iniciais: string[] = Array.isArray(usuario.papeis) ? usuario.papeis : []
  const [papeis, setPapeis] = useState<string[]>(PAPEIS_FUNC.filter((p) => iniciais.includes(p)))
  const [centro, setCentro] = useState<string>(usuario.centro_custo || '')
  const [matricula, setMatricula] = useState<string>(usuario.matricula || '')
  const [aniv, setAniv] = useState<string>(usuario.aniversario || '')
  const [adm, setAdm] = useState<string>(usuario.admissao || '')
  const [pendente, setPendente] = useState(false)

  function alterna(p: string) {
    setPapeis((atual) => (atual.includes(p) ? atual.filter((x) => x !== p) : [...atual, p]))
  }

  async function salvar() {
    setPendente(true)
    setErro(null)
    try {
      if (papeis.includes('gestor') && !centro) {
        throw new Error('Um Gestor Aprovador precisa de um centro de custo (a área que ele aprova).')
      }
      const datas = montarDatas(aniv, adm)
      await atualizarPapeisFuncionario(usuario.uid, papeis, centro, usuario.email, {
        nome: usuario.nome, matricula, ...datas,
      })
      onSalvo(`Dados de ${usuario.email} atualizados.`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui salvar.')
      setPendente(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-tinta">Papéis e centro de custo</h3>
            <p className="mt-0.5 text-sm text-tinta-3">{usuario.nome || usuario.email}</p>
          </div>
          <button type="button" onClick={onFechar} className="rounded-lg p-1.5 text-tinta-3 hover:bg-superficie-2" aria-label="Fechar">
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-tinta">Papéis adicionais</p>
            <p className="mt-0.5 text-xs text-tinta-3">Todo funcionário já é <strong>Colaborador</strong>. Marque o que a pessoa acumula.</p>
            <div className="mt-2 space-y-2">
              {PAPEIS_FUNC.map((p) => (
                <label key={p} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${papeis.includes(p) ? 'border-marca bg-marca-clara' : 'border-borda-forte bg-white hover:border-marca'}`}>
                  <input type="checkbox" checked={papeis.includes(p)} onChange={() => alterna(p)} className="mt-0.5 accent-[var(--color-marca)]" />
                  <span>
                    <span className="block font-medium text-tinta">{PAPEL_LABEL[p]}</span>
                    <span className="block text-xs text-tinta-3">{PAPEL_DESC[p]}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Matrícula">
              <input value={matricula} onChange={(e) => setMatricula(e.target.value)} className={ENTRADA} placeholder="00123" />
            </Campo>
            <Campo rotulo="Aniversário (DD/MM)">
              <input value={aniv} onChange={(e) => setAniv(e.target.value)} className={ENTRADA} placeholder="25/12" />
            </Campo>
            <Campo rotulo="Admissão (DD/MM/AAAA)">
              <input value={adm} onChange={(e) => setAdm(e.target.value)} className={ENTRADA} placeholder="10/03/2022" />
            </Campo>
          </div>

          <Campo rotulo="Centro de custo (área)" ajuda="Área da Soulan à qual a pessoa pertence. Obrigatório para o Gestor Aprovador. Um gestor com “Todos os centros de custo” aprova reembolsos de qualquer área.">
            <select value={centro} onChange={(e) => setCentro(e.target.value)} className={ENTRADA}>
              <option value="">Sem centro de custo</option>
              <option value={TODOS_CENTROS}>{TODOS_CENTROS}</option>
              {CENTROS_CUSTO.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Campo>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Botao type="button" variante="secundario" onClick={onFechar}>Cancelar</Botao>
          <Botao type="button" onClick={salvar} disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar'}</Botao>
        </div>
      </div>
    </div>
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
  const [centro, setCentro] = useState('')
  const [papeis, setPapeis] = useState<string[]>([])

  function alterna(p: string) {
    setPapeis((atual) => (atual.includes(p) ? atual.filter((x) => x !== p) : [...atual, p]))
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    setPendente(true)
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email') ?? '')
    try {
      const extras = montarDatas(String(f.get('aniversario') ?? ''), String(f.get('admissao') ?? ''))
      const res = await cadastrarFuncionario({
        email, nome: String(f.get('nome') ?? ''), centro_custo: centro, papeis,
        matricula: String(f.get('matricula') ?? ''), ...extras,
      })
      ;(e.target as HTMLFormElement).reset()
      setCentro('')
      setPapeis([])
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
    <form onSubmit={enviar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome" obrigatorio>
          <input name="nome" required minLength={2} className={ENTRADA} placeholder="Ex.: João Pereira" />
        </Campo>
        <Campo rotulo="E-mail institucional" obrigatorio>
          <input name="email" type="email" required className={ENTRADA} placeholder="joao@soulan.com.br" />
        </Campo>
        <Campo rotulo="Centro de custo (área)">
          <select value={centro} onChange={(e) => setCentro(e.target.value)} className={ENTRADA}>
            <option value="">Sem centro de custo</option>
            <option value={TODOS_CENTROS}>{TODOS_CENTROS}</option>
            {CENTROS_CUSTO.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Matrícula" ajuda="Usada no Banco de Horas.">
          <input name="matricula" className={ENTRADA} placeholder="Ex.: 00123" />
        </Campo>
        <Campo rotulo="Aniversário (DD/MM)">
          <input name="aniversario" className={ENTRADA} placeholder="Ex.: 25/12" />
        </Campo>
        <Campo rotulo="Admissão (DD/MM/AAAA)">
          <input name="admissao" className={ENTRADA} placeholder="Ex.: 10/03/2022" />
        </Campo>
        <Campo rotulo="Papéis adicionais" ajuda="Colaborador já vem incluído.">
          <div className="flex flex-wrap gap-3 pt-1.5">
            {PAPEIS_FUNC.map((p) => (
              <label key={p} className="inline-flex items-center gap-1.5 text-sm text-tinta">
                <input type="checkbox" checked={papeis.includes(p)} onChange={() => alterna(p)} className="accent-[var(--color-marca)]" />
                {PAPEL_LABEL[p]}
              </label>
            ))}
          </div>
        </Campo>
      </div>
      <div>
        <Botao type="submit" disabled={pendente}>
          <UserPlus size={15} aria-hidden /> {pendente ? 'Cadastrando…' : 'Cadastrar'}
        </Botao>
      </div>
    </form>
  )
}
