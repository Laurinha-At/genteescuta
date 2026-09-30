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
import Link from '@/components/LinkSemPrefetch'
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

const GRAD_ANIV = 'linear-gradient(135deg, #ff7eb3 0%, #ff6a3d 52%, #ffb648 100%)'   // festivo: rosa → laranja → âmbar
const GRAD_TEMPO = 'linear-gradient(135deg, #7c5cff 0%, #4e7cf0 100%)'                // roxo → azul
const GRAD_MURAL = 'linear-gradient(135deg, #17b6c9 0%, #2f8bb4 50%, #4b9e3a 100%)'   // ciano → azul → verde
const GRAD_REC = 'linear-gradient(135deg, #3fa34d 0%, #8cc63f 50%, #f4b64a 100%)'     // verde → dourado
const GRAD_TREINO = 'linear-gradient(135deg, #6d5efc 0%, #2f8bb4 100%)'               // índigo → azul
const GRAD_PADRAO = 'linear-gradient(135deg, #8cc63f 0%, #2f8bb4 100%)'

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
                cor: aniv ? GRAD_ANIV : GRAD_TEMPO,
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
      <div className="group/car relative overflow-hidden rounded-[1.4rem] shadow-[0_18px_44px_rgba(26,23,20,0.24)] ring-1 ring-black/5">
        {/* Trilho deslizante */}
        <div
          className="flex transition-transform duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {slides.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              tabIndex={s === slides[idx] ? 0 : -1}
              className="group relative flex w-full flex-none flex-col justify-center overflow-hidden px-6 pb-6 pt-9 text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.28)] sm:min-h-[13rem] sm:px-9 sm:pb-8 sm:pt-11"
              style={{ background: s.cor }}
            >
              {/* profundidade: brilho radial + ícone marca-d'água */}
              <span className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" aria-hidden />
              <s.Icone className="pointer-events-none absolute -bottom-6 right-2 h-40 w-40 text-white/10 sm:h-52 sm:w-52" aria-hidden />

              <div className="relative min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.09em] text-white ring-1 ring-inset ring-white/25 backdrop-blur">
                  <s.Icone size={13} aria-hidden /> {s.tag}
                </span>
                <p className="mt-3 line-clamp-2 max-w-[36ch] text-[1.4rem] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[2rem]">{s.titulo}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-marca-escura shadow-sm transition-transform group-hover:-translate-y-0.5 [text-shadow:none]">
                  Ver <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Brilho que passa */}
        {brilho && <span className="carrossel-brilho pointer-events-none absolute inset-0 z-10 opacity-70" aria-hidden />}

        {/* Barras estilo "stories" (indicador + progresso do tempo) */}
        {total > 1 && (
          <div className="absolute inset-x-4 top-3.5 z-20 flex gap-1.5 sm:inset-x-6">
            {slides.map((s, n) => (
              <button
                key={s.id}
                type="button"
                onClick={() => ir(n)}
                aria-label={`Ir para a notícia ${n + 1}`}
                aria-current={n === idx ? 'true' : undefined}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <span
                  key={n === idx ? `on-${idx}-${pausado}` : `off-${n}`}
                  className={`block h-full origin-left rounded-full bg-white ${n === idx && desliza ? 'carrossel-progresso' : ''}`}
                  style={
                    n < idx
                      ? { transform: 'scaleX(1)' }
                      : n === idx && desliza
                        ? { animationDuration: `${FONTES.intervaloMs}ms`, animationPlayState: pausado ? 'paused' : 'running' }
                        : n === idx
                          ? { transform: 'scaleX(1)' }
                          : { transform: 'scaleX(0)' }
                  }
                />
              </button>
            ))}
          </div>
        )}

        {/* Setas discretas (aparecem no hover, desktop) */}
        {total > 1 && (
          <>
            <button type="button" onClick={() => ir(i - 1)} aria-label="Anterior" className="absolute left-2.5 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/35 group-hover/car:opacity-100 sm:flex">
              <ChevronLeft size={20} aria-hidden />
            </button>
            <button type="button" onClick={() => ir(i + 1)} aria-label="Próximo" className="absolute right-2.5 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/35 group-hover/car:opacity-100 sm:flex">
              <ChevronRight size={20} aria-hidden />
            </button>
          </>
        )}
      </div>
    </section>
  )
}
