'use client'

// =============================================================
// Sino de notificações do portal (sem e-mail). Mostra os avisos que
// chegam para a pessoa conforme o papel (reembolsos), com contador de
// não lidas. O "lido" é por dispositivo (localStorage).
// =============================================================
import { useEffect, useRef, useState } from 'react'
import Link from '@/components/LinkSemPrefetch'
import { Bell, Check, Receipt, XCircle, CheckCircle2, CalendarClock, Megaphone, GraduationCap, Clock, Pencil } from 'lucide-react'
import {
  listarAvisos, marcarTudoVisto, contarNaoLidas, ultimaVisita,
  type Aviso, type AvisoTipo,
} from '@/lib/fb/notificacoes'
import type { Perfil } from '@/lib/fb/funcionarios'

const ICONE: Record<AvisoTipo, typeof Receipt> = {
  reembolso_novo: Receipt,
  reembolso_aprovado: CheckCircle2,
  reembolso_recusado: XCircle,
  reembolso_pago: CheckCircle2,
  reembolso_agendado: CalendarClock,
  reembolso_pendente: Clock,
  reembolso_editado: Pencil,
  reembolso_cancelado: XCircle,
  mural_post: Megaphone,
  treino_trilha: GraduationCap,
}

function tempoRelativo(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const s = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (s < 60) return 'agora'
  const m = Math.round(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}

export function SinoNotificacoes({ perfil }: { perfil: Perfil }) {
  const [itens, setItens] = useState<Aviso[]>([])
  const [aberto, setAberto] = useState(false)
  const [naoLidas, setNaoLidas] = useState(0)
  const [visto, setVisto] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  async function carregar() {
    try {
      const l = await listarAvisos(perfil)
      setItens(l)
      setNaoLidas(contarNaoLidas(l))
    } catch { /* silencioso */ }
  }

  useEffect(() => {
    setVisto(ultimaVisita())
    carregar()
    const t = setInterval(carregar, 60_000) // atualiza de tempos em tempos
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil.uid])

  useEffect(() => {
    if (!aberto) return
    function fora(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false) }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  function abrir() {
    const abrindo = !aberto
    setAberto(abrindo)
    if (abrindo) {
      setVisto(ultimaVisita())     // congela o "antes" para destacar as novas
      marcarTudoVisto()
      setNaoLidas(0)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={abrir}
        aria-label={naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : 'Notificações'}
        aria-expanded={aberto}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-borda-forte bg-white text-tinta-2 transition-colors hover:border-marca hover:text-marca-texto"
      >
        <Bell size={17} aria-hidden />
        {naoLidas > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-critico px-1 text-[10px] font-bold leading-[18px] text-white">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-borda bg-white shadow-[0_12px_34px_rgba(26,23,20,0.16)]">
          <div className="flex items-center justify-between border-b border-borda px-4 py-3">
            <span className="text-sm font-semibold text-tinta">Notificações</span>
            {itens.length > 0 && <span className="inline-flex items-center gap-1 text-xs text-tinta-3"><Check size={13} aria-hidden /> em dia</span>}
          </div>
          <div className="max-h-[22rem] overflow-y-auto">
            {itens.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-tinta-3">Nenhuma notificação por aqui ainda.</p>
            ) : (
              itens.map((n) => {
                const Icone = ICONE[n.tipo] ?? Receipt
                const nova = (n.criado_em ?? '') > visto
                return (
                  <Link
                    key={n.id}
                    href={n.link || '/reembolso'}
                    onClick={() => setAberto(false)}
                    className={`flex gap-3 border-b border-borda px-4 py-3 transition-colors last:border-0 hover:bg-superficie-2 ${nova ? 'bg-marca-clara/50' : ''}`}
                  >
                    <span className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full ${n.tipo === 'reembolso_recusado' ? 'bg-[#fbe9e1] text-[#7a3418]' : 'bg-marca-clara text-marca'}`}>
                      <Icone size={16} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.8125rem] font-semibold text-tinta">{n.titulo}</p>
                      <p className="mt-0.5 text-xs leading-5 text-tinta-2">{n.texto}</p>
                      <p className="mt-0.5 text-[0.6875rem] text-tinta-3">{tempoRelativo(n.criado_em)}</p>
                    </div>
                    {nova && <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-marca" aria-hidden />}
                  </Link>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
