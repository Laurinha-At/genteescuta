/**
 * Marca Soulan.
 *
 * O desenho abaixo é uma reconstrução em SVG do símbolo (folha com o "S",
 * degradê verde → azul). Para usar o arquivo oficial da agência:
 *   1. coloque o SVG em `public/logo-soulan.svg`
 *   2. troque o <svg> de MarcaSoulan por
 *      <img src="/logo-soulan.svg" alt="Soulan" width={32} height={32} />
 * O resto do layout continua igual.
 */

export function MarcaSoulan({
  tamanho = 32,
  className = '',
}: {
  tamanho?: number
  className?: string
}) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Soulan"
    >
      <defs>
        <linearGradient id="soulan-folha" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#8cc63f" />
          <stop offset="55%" stopColor="#4aa8a0" />
          <stop offset="100%" stopColor="#2f8bb4" />
        </linearGradient>
      </defs>

      {/* folha */}
      <path
        d="M33 5c15.5 0 26.5 12 26.5 26.5S47 59 32 59C17.5 59 5 47.5 5 32.5 5 16 18 5 33 5Z"
        fill="url(#soulan-folha)"
      />

      {/* o S em negativo */}
      <path
        d="M45 20c-7-3.5-16.5-2-19.5 4.5-2.8 6 1.5 10.5 8.5 12.5 6.5 2 8.5 4.5 7.5 7.5-1.5 4.5-10 6-16.5 2.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Marca + assinatura, para telas de entrada e cabeçalhos maiores. */
export function LogoSoulan({ tamanho = 34 }: { tamanho?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <MarcaSoulan tamanho={tamanho} />
      <span className="leading-none">
        <span
          className="block font-semibold tracking-[0.14em] text-[color:var(--color-marca-texto)]"
          style={{ fontSize: tamanho * 0.5 }}
        >
          SOULAN
        </span>
        <span
          className="mt-[3px] block font-medium tracking-[0.1em] text-[color:var(--color-verde-escuro)]"
          style={{ fontSize: tamanho * 0.235 }}
        >
          RECURSOS HUMANOS
        </span>
      </span>
    </span>
  )
}
