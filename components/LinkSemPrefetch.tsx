'use client'

import NextLink from 'next/link'
import type { ComponentProps } from 'react'

/**
 * Link com `prefetch` DESLIGADO por padrão.
 *
 * Em modo static export (`output: 'export'`), o Next tenta pré-carregar o
 * "pedaço" (RSC .txt) de cada rota ao passar o mouse/entrar na viewport, mas
 * esses arquivos não existem num site estático → enxurrada de 404 no console.
 * Desligar o prefetch elimina esses erros. Quem quiser pode passar
 * `prefetch` explicitamente para sobrescrever.
 */
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />
}
