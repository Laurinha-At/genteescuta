import type { Metadata } from 'next'
import './globals.css'
import { RegistroNavegacao } from '@/components/BotaoVoltar'

export const metadata: Metadata = {
  title: 'Gente Cultura · Soulan',
  description:
    'Canal de escuta do colaborador e avaliação de riscos psicossociais (NR-1), com indicadores de clima.',
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
