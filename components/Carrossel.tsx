'use client'

// =============================================================
// Carrossel da home. Agora é configurável pelo admin (Conteúdo do site):
// lê config/carrossel e os slides ativos de carrossel_slides no Firestore.
// Respeita ligar/desligar, autoplay, velocidade, ordem e pausar no hover.
// =============================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from '@/components/LinkSemPrefetch'
import { ChevronLeft, ChevronRight, ArrowRight, Star } from 'lucide-react'
import {
  getCarrosselConfig,
  listarSlidesAtivos,
  CARROSSEL_CONFIG_PADRAO,
  type CarrosselConfig,
  type SlideCarrossel,
} from '@/lib/fb/carrossel'

const GRAD_PADRAO = 'linear-gradient(135deg, #aad12f 0%, #1a4895 100%)'

function ehExterno(href: string): boolean {
  return /^https?:\/\//i.test(href)
}

export function Carrossel() {
  const [config, setConfig] = useState<CarrosselConfig>(CARROSSEL_CONFIG_PADRAO)
  const [slides, setSlides] = useState<SlideCarrossel[] | null>(null)
  const [i, setI] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [reduz, setReduz] = useState(false)

  useEffect(() => {
    setReduz(!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    let vivo = true
    Promise.all([getCarrosselConfig(), listarSlidesAtivos()])
      .then(([cfg, ss]) => {
        if (!vivo) return
        setConfig(cfg)
        setSlides(cfg.ativo ? ss : [])
      })
      .catch(() => { if (vivo) setSlides([]) })
    return () => { vivo = false }
  }, [])

  const total = slides?.length ?? 0
  const ir = useCallback((n: number) => { if (total > 0) setI(((n % total) + total) % total) }, [total])

  const intervaloMs = Math.max(3, config.velocidade_s) * 1000
  const autoplayLigado = config.autoplay && !(config.pausar_hover && pausado)

  useEffect(() => {
    if (!slides || total <= 1 || !autoplayLigado) return
    const t = setInterval(() => setI((v) => (v + 1) % total), intervaloMs)
    return () => clearInterval(t)
  }, [slides, total, autoplayLigado, intervaloMs])

  // Carrossel desligado no painel, ou sem slides ativos: não aparece na home.
  if (slides && (!config.ativo || total === 0)) return null
  if (!slides) {
    return <div className="mb-8 h-40 animate-pulse rounded-2xl bg-superficie-2" aria-hidden />
  }

  const idx = Math.min(i, total - 1)
  const desliza = total > 1 && !reduz
  const pausarHover = config.pausar_hover

  return (
    <section
      className="mb-8"
      aria-roledescription="carrossel"
      aria-label="Informações"
      onMouseEnter={pausarHover ? () => setPausado(true) : undefined}
      onMouseLeave={pausarHover ? () => setPausado(false) : undefined}
      onFocusCapture={pausarHover ? () => setPausado(true) : undefined}
      onBlurCapture={pausarHover ? () => setPausado(false) : undefined}
    >
      <div className="group/car relative overflow-hidden rounded-[1.4rem] shadow-[0_18px_44px_rgba(26,23,20,0.24)] ring-1 ring-black/5">
        {/* Trilho deslizante */}
        <div
          className={`flex ${reduz ? '' : 'transition-transform duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {slides.map((s, n) => (
            <SlideItem key={s.id} s={s} ativo={n === idx} />
          ))}
        </div>

        {/* Barras estilo "stories" (indicador + progresso do tempo) */}
        {total > 1 && (
          <div className="absolute inset-x-4 top-3.5 z-20 flex gap-1.5 sm:inset-x-6">
            {slides.map((s, n) => (
              <button
                key={s.id}
                type="button"
                onClick={() => ir(n)}
                aria-label={`Ir para a informação ${n + 1}`}
                aria-current={n === idx ? 'true' : undefined}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <span
                  key={n === idx ? `on-${idx}-${pausado}-${autoplayLigado}` : `off-${n}`}
                  className={`block h-full origin-left rounded-full bg-white ${n === idx && desliza && autoplayLigado ? 'carrossel-progresso' : ''}`}
                  style={
                    n < idx
                      ? { transform: 'scaleX(1)' }
                      : n === idx && desliza && autoplayLigado
                        ? { animationDuration: `${intervaloMs}ms` }
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

function luminancia(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return 0
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function SlideItem({ s, ativo }: { s: SlideCarrossel; ativo: boolean }) {
  const temImagem = !!s.imagem
  const corFundo = s.cor && !temImagem ? s.cor : null
  // Texto escuro só em cor de fundo clara (sem imagem). Com imagem ou cor
  // escura ou degradê, o texto é branco (com escurecedor para contraste).
  const textoEscuro = !!corFundo && luminancia(corFundo) > 0.6
  const corTexto = textoEscuro ? '#002443' : '#ffffff'

  const conteudo = (
    <>
      {temImagem ? (
        <img src={s.imagem} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0" style={{ background: corFundo ?? GRAD_PADRAO }} aria-hidden />
      )}
      {/* Escurecedor só quando o texto é branco (imagem, cor escura ou degradê) */}
      {!textoEscuro && <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" aria-hidden />}

      {s.destaque && (
        <span className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-marca-escura shadow-sm sm:right-6">
          <Star size={12} className="fill-current" aria-hidden /> Destaque
        </span>
      )}

      <div className="relative z-[1] min-w-0" style={{ color: corTexto }}>
        <p className="line-clamp-2 max-w-[36ch] text-[1.4rem] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[2rem]">{s.titulo}</p>
        {s.texto && <p className="mt-2 line-clamp-2 max-w-[48ch] text-sm leading-6 sm:text-base" style={{ color: textoEscuro ? 'rgba(0,36,67,0.8)' : 'rgba(255,255,255,0.9)' }}>{s.texto}</p>}
        {s.link && (
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-marca-escura shadow-sm transition-transform group-hover:-translate-y-0.5 [text-shadow:none]">
            Ver <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        )}
      </div>
    </>
  )

  const classe = `group relative flex w-full flex-none flex-col justify-end overflow-hidden px-6 pb-6 pt-16 min-h-[12rem] sm:min-h-[14rem] sm:px-9 sm:pb-8 ${textoEscuro ? '' : '[text-shadow:0_1px_10px_rgba(0,0,0,0.3)]'}`

  if (s.link && ehExterno(s.link)) {
    return (
      <a href={s.link} target="_blank" rel="noopener noreferrer" tabIndex={ativo ? 0 : -1} className={classe}>
        {conteudo}
      </a>
    )
  }
  if (s.link) {
    return (
      <Link href={s.link} tabIndex={ativo ? 0 : -1} className={classe}>
        {conteudo}
      </Link>
    )
  }
  return <div className={classe}>{conteudo}</div>
}
