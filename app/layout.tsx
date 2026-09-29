import type { Metadata } from 'next'
import './globals.css'
import { RegistroNavegacao } from '@/components/BotaoVoltar'

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
    <html lang="pt-BR">
      <body className="antialiased">
        <RegistroNavegacao />
        {children}
      </body>
    </html>
  )
}
