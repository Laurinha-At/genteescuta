'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { configurado } from '@/lib/firebase'
import { observarLogin } from '@/lib/fb/auth'
import { perfilAtual, type Perfil } from '@/lib/fb/funcionarios'
import { definirNovaSenhaInicial } from '@/lib/fb/usuarios'
import { TelaConfiguracao } from '@/components/TelaConfiguracao'

export default function PrimeiroAcesso() {
  const router = useRouter()
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, setPendente] = useState(false)

  function destino(p: Perfil) {
    return p.tipo === 'admin' ? '/admin' : '/mural'
  }

  useEffect(() => {
    if (!configurado()) return
    const cancelar = observarLogin(async (u) => {
      if (!u) {
        router.replace('/entrar')
        return
      }
      const p = await perfilAtual().catch(() => null)
      if (!p || p.tipo === 'nenhum' || !p.ativo) {
        router.replace('/entrar')
        return
      }
      if (!p.senha_provisoria) {
        router.replace(destino(p))
        return
      }
      setPerfil(p)
    })
    return cancelar
  }, [router])

  if (!configurado()) return <TelaConfiguracao />

  if (perfil === undefined || perfil === null) {
    return <div className="grid min-h-screen place-items-center text-sm text-tinta-3">Carregando…</div>
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    const f = new FormData(e.currentTarget)
    const nova = String(f.get('nova') ?? '')
    const conf = String(f.get('conf') ?? '')
    if (nova !== conf) return setErro('As duas senhas não são iguais.')
    setPendente(true)
    try {
      await definirNovaSenhaInicial(nova, perfil!.tipo === 'admin' ? 'admins' : 'funcionarios')
      router.replace(destino(perfil!))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui trocar a senha.')
      setPendente(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center gap-2.5">
          <img src="/simbolo-soulan.png" alt="Soulan" className="h-9 w-9 object-contain" />
          <span className="text-base font-semibold text-tinta">Gente Cultura</span>
        </div>
        <div className="cartao-g p-6 sm:p-7">
          <h1 className="text-lg font-semibold text-tinta">Bem-vindo(a)! Crie a sua senha</h1>
          <p className="mt-1.5 text-sm leading-6 text-tinta-2">
            Este é o seu primeiro acesso com <strong className="font-medium text-tinta">{perfil.email}</strong>. Defina
            uma senha nova para continuar.
          </p>
          <form onSubmit={enviar} className="mt-5 space-y-4">
            {erro && (
              <p className="rounded-lg border border-[#f0c2c2] bg-[#fdeaea] px-3.5 py-2.5 text-sm text-[#8a1f1f]">{erro}</p>
            )}
            <label className="block">
              <span className="block text-sm font-medium text-tinta">Nova senha</span>
              <span className="mt-0.5 block text-xs text-tinta-3">Mínimo 8 caracteres, diferente da padrão.</span>
              <input
                name="nova"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1.5 block w-full rounded-lg border border-borda-forte bg-white px-3.5 py-2.5 text-sm text-tinta focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-tinta">Repita a nova senha</span>
              <input
                name="conf"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1.5 block w-full rounded-lg border border-borda-forte bg-white px-3.5 py-2.5 text-sm text-tinta focus:border-marca focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-marca"
              />
            </label>
            <button
              type="submit"
              disabled={pendente}
              className="botao-gradiente inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {pendente ? 'Salvando…' : 'Criar senha e entrar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
