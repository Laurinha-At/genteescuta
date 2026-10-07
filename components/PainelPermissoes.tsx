'use client'

import { useMemo, useState } from 'react'
import { X, ShieldCheck, Info } from 'lucide-react'
import { Botao } from '@/components/ui'
import { CENTROS_CUSTO, TODOS_CENTROS } from '@/lib/reembolso'
import {
  TELAS,
  GRUPO_LABEL,
  ACAO_LABEL,
  PERFIS,
  resolverPermissoes,
  perfilPadrao,
  type Acao,
  type GrupoTela,
  type Permissoes,
  type PerfilId,
} from '@/lib/permissoes'

/**
 * Painel "Permissão de Menu" (por usuário): marca quais TELAS a pessoa vê e,
 * dentro de cada tela, o que pode fazer (ver/adicionar/editar/aprovar/excluir).
 * A "Área de atuação" (centro de custo) limita as telas marcadas com "por área".
 *
 * Observação: aqui a marcação vale EXATAMENTE como fica: nada de perfil
 * preenchendo por baixo. Os botões de "preencher como…" são só um atalho que
 * joga um padrão nas caixinhas; depois é tudo editável na mão.
 */
export function PainelPermissoes({
  usuario,
  onFechar,
  onSalvo,
  setErro,
  salvar,
}: {
  usuario: { uid: string; email: string; nome?: string; nivel?: string; papeis?: string[]; permissoes?: Permissoes; centro_custo?: string }
  onFechar: () => void
  onSalvo: (msg: string) => void
  setErro: (s: string | null) => void
  salvar: (uid: string, permissoes: Permissoes, centro_custo: string, email: string) => Promise<void>
}) {
  // Estado inicial: o que já está salvo; se nunca foi configurado, cai no
  // padrão equivalente ao acesso atual (para o Super ver e ajustar).
  const inicial = useMemo<Permissoes>(() => {
    if (usuario.permissoes && Object.keys(usuario.permissoes).length) return clonar(usuario.permissoes)
    return resolverPermissoes(perfilPadrao({ nivel: usuario.nivel, papeis: usuario.papeis }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [mapa, setMapa] = useState<Permissoes>(inicial)
  const [area, setArea] = useState<string>(usuario.centro_custo ?? '')
  const [pendente, setPendente] = useState(false)

  // Agrupa as telas por grupo, na ordem de GRUPO_LABEL.
  const porGrupo = useMemo(() => {
    const ordem = Object.keys(GRUPO_LABEL) as GrupoTela[]
    return ordem
      .map((g) => ({ grupo: g, telas: TELAS.filter((t) => t.grupo === g) }))
      .filter((x) => x.telas.length > 0)
  }, [])

  const usaArea = useMemo(() => TELAS.some((t) => t.porArea && (mapa[t.id]?.length ?? 0) > 0), [mapa])
  const totalTelas = Object.values(mapa).filter((a) => a?.length).length

  function telaLigada(id: string) {
    return (mapa[id]?.length ?? 0) > 0
  }
  function temAcao(id: string, a: Acao) {
    return !!mapa[id]?.includes(a)
  }

  // Liga/desliga a tela inteira (marca/desmarca "ver").
  function alternarTela(id: string) {
    setMapa((m) => {
      const novo = { ...m }
      if (telaLigada(id)) delete novo[id]
      else novo[id] = ['ver']
      return novo
    })
  }

  // Marca/desmarca uma ação. 'ver' é pré-requisito: qualquer ação exige 'ver',
  // e desmarcar 'ver' desliga a tela.
  function alternarAcao(id: string, a: Acao) {
    setMapa((m) => {
      const atual = new Set(m[id] ?? [])
      if (a === 'ver') {
        if (atual.has('ver')) return semTela(m, id)
        return { ...m, [id]: ['ver'] }
      }
      if (atual.has(a)) atual.delete(a)
      else { atual.add(a); atual.add('ver') }
      if (atual.size === 0) return semTela(m, id)
      return { ...m, [id]: ordenarAcoes(id, atual) }
    })
  }

  function preencher(perfilId: PerfilId) {
    setMapa(resolverPermissoes(perfilId))
  }
  function limpar() { setMapa({}) }

  async function confirmar() {
    setPendente(true)
    setErro(null)
    try {
      await salvar(usuario.uid, mapa, area, usuario.email)
      onSalvo(`Permissões de ${usuario.email} atualizadas.`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui salvar as permissões.')
      setPendente(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onFechar}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b border-borda px-6 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-marca-texto">Permissão de menu</p>
            <h3 className="truncate text-base font-semibold text-tinta">Acessos de {usuario.nome || usuario.email}</h3>
            <p className="mt-0.5 text-xs text-tinta-3">
              Marque as telas que este usuário acessa e, em cada uma, o que ele pode fazer.
            </p>
          </div>
          <button type="button" onClick={onFechar} className="ml-3 flex-none rounded-lg p-1.5 text-tinta-3 hover:bg-superficie-2" aria-label="Fechar">
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Corpo rolável */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {/* Atalhos de preenchimento */}
          <div className="rounded-xl border border-borda bg-superficie-2 p-3">
            <p className="text-xs font-semibold text-tinta-2">Preencher rápido (opcional)</p>
            <p className="mt-0.5 text-[11px] text-tinta-3">Joga um padrão nas caixinhas. Depois é só ajustar na mão.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PERFIS.filter((p) => p.id !== 'colaborador').map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => preencher(p.id)}
                  title={p.desc}
                  className="rounded-full border border-borda-forte bg-white px-2.5 py-1 text-xs font-medium text-tinta-2 hover:border-marca hover:text-marca"
                >
                  {p.nome}
                </button>
              ))}
              <button type="button" onClick={limpar} className="rounded-full border border-borda-forte bg-white px-2.5 py-1 text-xs font-medium text-tinta-3 hover:border-critico hover:text-critico">
                Limpar tudo
              </button>
            </div>
          </div>

          {/* Área de atuação (limita as telas "por área") */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-tinta">Área de atuação</label>
            <p className="mt-0.5 text-xs text-tinta-3">
              Limita o que este usuário alcança nas telas por área (Reembolsos e Banco de Horas). “Todos os centros” = enxerga todas as áreas.
            </p>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-borda-forte bg-white px-3 py-2 text-sm text-tinta focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
            >
              <option value="">Sem área definida</option>
              <option value={TODOS_CENTROS}>{TODOS_CENTROS}</option>
              {CENTROS_CUSTO.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {usaArea && !area && (
              <p className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-[#f2dfae] bg-[#fdf7e7] px-2.5 py-1.5 text-[11px] leading-4 text-[#6b4a00]">
                <Info size={13} className="mt-px flex-none" aria-hidden />
                Você liberou uma tela por área (Reembolsos/Banco de Horas) mas não definiu a área. Defina para limitar corretamente.
              </p>
            )}
          </div>

          {/* Telas por grupo */}
          <div className="mt-4 space-y-4">
            {porGrupo.map(({ grupo, telas }) => (
              <fieldset key={grupo} className="rounded-xl border border-borda">
                <legend className="mx-3 px-1 text-[11px] font-bold uppercase tracking-[0.05em] text-tinta-3">{GRUPO_LABEL[grupo]}</legend>
                <div className="divide-y divide-borda">
                  {telas.map((t) => {
                    const ligada = telaLigada(t.id)
                    const outras = t.acoes.filter((a) => a !== 'ver')
                    return (
                      <div key={t.id} className="px-3 py-2.5">
                        <label className="flex cursor-pointer items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={ligada}
                            onChange={() => alternarTela(t.id)}
                            className="h-4 w-4 flex-none accent-[var(--color-marca)]"
                          />
                          <span className="flex min-w-0 flex-1 items-center gap-1.5">
                            <span className={`text-sm font-medium ${ligada ? 'text-tinta' : 'text-tinta-2'}`}>{t.rotulo}</span>
                            {t.porArea && <span className="rounded bg-superficie-2 px-1.5 py-0.5 text-[10px] font-medium text-tinta-3">por área</span>}
                            {t.sensivel && <span className="rounded bg-[#fdeaea] px-1.5 py-0.5 text-[10px] font-medium text-[#8a1f1f]">sensível</span>}
                          </span>
                          <span className="flex-none text-[11px] text-tinta-3">{t.href}</span>
                        </label>

                        {ligada && outras.length > 0 && (
                          <div className="ml-6 mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                            {outras.map((a) => (
                              <label key={a} className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-tinta-2">
                                <input
                                  type="checkbox"
                                  checked={temAcao(t.id, a)}
                                  onChange={() => alternarAcao(t.id, a)}
                                  className="h-3.5 w-3.5 accent-[var(--color-marca)]"
                                />
                                {ACAO_LABEL[a]}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between gap-3 border-t border-borda px-6 py-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-tinta-3">
            <ShieldCheck size={14} className="text-marca" aria-hidden />
            {totalTelas} {totalTelas === 1 ? 'tela liberada' : 'telas liberadas'}
          </span>
          <div className="flex gap-2">
            <Botao type="button" variante="secundario" onClick={onFechar}>Cancelar</Botao>
            <Botao type="button" onClick={confirmar} disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar permissões'}</Botao>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- utilitários locais ---
function clonar(p: Permissoes): Permissoes {
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, [...v]]))
}
function semTela(m: Permissoes, id: string): Permissoes {
  const novo = { ...m }
  delete novo[id]
  return novo
}
/** Mantém as ações na ordem definida na tela (ver primeiro). */
function ordenarAcoes(id: string, set: Set<Acao>): Acao[] {
  const ordem = TELAS.find((t) => t.id === id)?.acoes ?? []
  return ordem.filter((a) => set.has(a))
}
