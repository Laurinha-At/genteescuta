'use client'

// =============================================================
// Carrossel de notícias do topo da home. Puxa de fontes que já existem:
//  - aniversariantes e tempo de casa do DIA (destaquesDoDia)
//  - novas publicações do mural (getPostsMural)
// Cada item leva à página correspondente ao clicar.
//
// Para configurar QUAIS conteúdos aparecem, edite FONTES abaixo.
// =============================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PartyPopper, Cake, Clock, Megaphone, Award, GraduationCap, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { destaquesDoDia } from '@/lib/fb/aniversarios'
import { getPostsMural } from '@/lib/fb/publico'
import { listarTrilhas } from '@/lib/fb/treinos'

// -------- Configuração (ligue/desligue as fontes aqui) --------
const FONTES = {
  aniversariantes: true, // aniversários e tempo de casa do dia
  mural: true,           // novas publicações do mural
  treinamento: true,     // novas trilhas de treinamento
  maxMural: 6,           // quantos posts recentes considerar
  maxTreino: 3,          // quantas trilhas novas considerar
  intervaloMs: 6000,     // troca automática
}

type Slide = {
  id: string
  tag: string
  titulo: string
  href: string
  Icone: typeof PartyPopper
  cor: string
}

const GRAD_ANIV = 'linear-gradient(135deg, #4e9b2e 0%, #1f5f52 100%)'
const GRAD_MURAL = 'linear-gradient(135deg, #2f8bb4 0%, #1f5c73 100%)'
const GRAD_REC = 'linear-gradient(135deg, #557d26 0%, #2a7897 100%)'
const GRAD_TREINO = 'linear-gradient(135deg, #3f7db0 0%, #223f6a 100%)'
const GRAD_PADRAO = 'var(--gradiente)'

export function Carrossel() {
  const [slides, setSlides] = useState<Slide[] | null>(null)
  const [i, setI] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [reduz, setReduz] = useState(false)

  useEffect(() => {
    setReduz(!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    let vivo = true
    async function carregar() {
      const out: Slide[] = []
      const tarefas: Promise<void>[] = []

      if (FONTES.aniversariantes) {
        tarefas.push(
          destaquesDoDia().then((ds) => {
            ds.forEach((d, idx) => {
              const aniv = d.tipo === 'aniversario'
              out.push({
                id: `aniv-${idx}`,
                tag: aniv ? 'Aniversário de hoje' : 'Tempo de Soulan',
                titulo: d.texto,
                href: '/aniversariantes',
                Icone: aniv ? Cake : Clock,
                cor: GRAD_ANIV,
              })
            })
          }).catch(() => {}),
        )
      }

      if (FONTES.mural) {
        tarefas.push(
          getPostsMural().then((posts) => {
            ;(posts as Record<string, unknown>[]).slice(0, FONTES.maxMural).forEach((p) => {
              const rec = p.categoria === 'reconhecimento'
              out.push({
                id: `post-${p.id}`,
                tag: rec ? 'Reconhecimento no Mural' : 'Novidade no Mural',
                titulo: String(p.titulo || 'Confira a novidade no Mural'),
                href: `/mural#post-${p.id}`,
                Icone: rec ? Award : Megaphone,
                cor: rec ? GRAD_REC : GRAD_MURAL,
              })
            })
          }).catch(() => {}),
        )
      }

      if (FONTES.treinamento) {
        tarefas.push(
          listarTrilhas().then((r) => {
            ;(r.trilhas as any[])
              .filter((t) => t.criado_em) // só as criadas recentemente têm data
              .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)))
              .slice(0, FONTES.maxTreino)
              .forEach((t) => {
                out.push({
                  id: `trilha-${t.id}`,
                  tag: 'Nova trilha de treinamento',
                  titulo: String(t.title || 'Confira a nova trilha'),
                  href: `/treinamento#trilha-${t.id}`,
                  Icone: GraduationCap,
                  cor: GRAD_TREINO,
                })
              })
          }).catch(() => {}),
        )
      }

      await Promise.all(tarefas)
      if (!vivo) return
      if (out.length === 0) {
        out.push({
          id: 'bemvindo',
          tag: 'Gente Cultura',
          titulo: 'Bem-vindo(a)! Acompanhe por aqui as novidades da Soulan.',
          href: '/mural',
          Icone: Megaphone,
          cor: GRAD_PADRAO,
        })
      }
      setSlides(out)
    }
    carregar()
    return () => { vivo = false }
  }, [])

  const total = slides?.length ?? 0
  const ir = useCallback((n: number) => { if (total > 0) setI(((n % total) + total) % total) }, [total])

  // Troca automática (respeita "reduzir movimento" e pausa no hover).
  useEffect(() => {
    if (!slides || total <= 1 || pausado || reduz) return
    const t = setInterval(() => setI((v) => (v + 1) % total), FONTES.intervaloMs)
    return () => clearInterval(t)
  }, [slides, total, pausado, reduz])

  if (!slides) {
    return <div className="mb-8 h-40 animate-pulse rounded-2xl bg-superficie-2" aria-hidden />
  }

  const idx = Math.min(i, total - 1)
  const brilho = !reduz            // sempre chamativo (mesmo com 1 notícia)
  const desliza = total > 1 && !reduz

  return (
    <section
      className="mb-8"
      aria-roledescription="carrossel"
      aria-label="Notícias"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="relative overflow-hidden rounded-2xl shadow-[0_12px_34px_rgba(26,23,20,0.2)]">
        {/* Trilho deslizante */}
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {slides.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              tabIndex={s === slides[idx] ? 0 : -1}
              className="group relative flex w-full flex-none items-center gap-4 p-6 text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.25)] sm:min-h-[11rem] sm:gap-5 sm:p-8"
              style={{ background: s.cor }}
            >
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur transition-transform duration-500 group-hover:scale-110 sm:h-16 sm:w-16">
                <s.Icone size={28} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white/85">{s.tag}</p>
                <p className="mt-1 line-clamp-2 text-xl font-semibold leading-snug tracking-[-0.01em] sm:text-[1.6rem]">{s.titulo}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-white/90">
                  Ver <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Brilho que passa (chamativo) */}
        {brilho && <span className="carrossel-brilho pointer-events-none absolute inset-0 z-10" aria-hidden />}

        {total > 1 && (
          <>
            <button type="button" onClick={() => ir(i - 1)} aria-label="Anterior" className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur transition-colors hover:bg-white/45">
              <ChevronLeft size={20} aria-hidden />
            </button>
            <button type="button" onClick={() => ir(i + 1)} aria-label="Próximo" className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur transition-colors hover:bg-white/45">
              <ChevronRight size={20} aria-hidden />
            </button>
          </>
        )}

        {/* Barrinha de progresso do tempo até o próximo */}
        {desliza && (
          <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-white/20">
            <div
              key={`${idx}-${pausado}`}
              className="h-full bg-white/85 carrossel-progresso"
              style={{ animationDuration: `${FONTES.intervaloMs}ms`, animationPlayState: pausado ? 'paused' : 'running' }}
            />
          </div>
        )}
      </div>

      {total > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {slides.map((s, n) => (
            <button
              key={s.id}
              type="button"
              onClick={() => ir(n)}
              aria-label={`Ir para a notícia ${n + 1}`}
              aria-current={n === idx ? 'true' : undefined}
              className={`h-2 rounded-full transition-all ${n === idx ? 'w-6 bg-marca' : 'w-2 bg-borda-forte hover:bg-tinta-3'}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
