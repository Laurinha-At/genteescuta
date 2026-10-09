import type { Metadata } from 'next'
import { Montserrat, Fraunces } from 'next/font/google'
import './globals.css'
import { RegistroNavegacao } from '@/components/BotaoVoltar'

// Tipografia da marca: Montserrat (títulos em Bold, texto em Regular).
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
})

// Fonte de display (serifada, elegante) para destaques pontuais.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Gente Cultura · Soulan',
  description:
    'Canal de escuta do colaborador e avaliação de riscos psicossociais (NR-1), com indicadores de clima.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} ${fraunces.variable}`}>
      <body className="antialiased">
        <RegistroNavegacao />
        {children}
      </body>
    </html>
  )
}
