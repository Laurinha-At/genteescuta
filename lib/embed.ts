// =============================================================
// Embed de vídeo a partir de um link (YouTube, Vimeo, Google Drive).
// Retorna a URL de incorporação (para <iframe>) ou null quando não dá para
// incorporar (aí a tela mostra como link clicável).
// =============================================================

/** Extrai o src de incorporação de um link de vídeo, ou null. */
export function urlParaEmbed(bruto: string): string | null {
  const url = String(bruto ?? '').trim()
  if (!url) return null

  // YouTube: watch?v=, youtu.be/, /embed/, /shorts/
  const yt = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`

  // Vimeo: vimeo.com/123456789
  const vim = url.match(/vimeo\.com\/(?:video\/)?(\d{6,})/)
  if (vim) return `https://player.vimeo.com/video/${vim[1]}`

  // Google Drive: drive.google.com/file/d/ID/... → /preview
  const drive = url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/)
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`

  return null
}
