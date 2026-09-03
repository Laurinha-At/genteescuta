import type { NextConfig } from 'next'

/**
 * Site 100% estático, para o Firebase Hosting (plano Spark, sem servidor).
 * O navegador fala direto com o Firestore pelo SDK web; a segurança é feita
 * pelas regras do Firestore (firestore.rules), não por um servidor.
 */
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // Rotas dinâmicas (/p/[slug], /admin/canal/[id]) foram trocadas por
  // parâmetros de URL (?slug=, ?id=) para funcionar sem servidor.
}

export default nextConfig

