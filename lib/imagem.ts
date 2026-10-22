'use client'

// =============================================================
// Imagem como data URL (sem Firebase Storage). Comprime para caber no
// documento do Firestore (~1 MB; base64 infla ~33%). Mesmo padrão já usado
// em Informações Administrativas e Reembolso.
// =============================================================

/** Teto do data URL de imagem (deixa folga para o resto do documento). */
export const MAX_IMG_CHARS = 900_000

function lerComoDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Não consegui ler o arquivo.'))
    r.readAsDataURL(file)
  })
}

/** Lê a imagem, reduz e comprime até caber no teto. Retorna um data URL JPEG. */
export async function comprimirImagem(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Envie um arquivo de imagem.')
  const url = await lerComoDataURL(file)
  const img = document.createElement('img')
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = () => rej(new Error('Imagem inválida.'))
    img.src = url
  })
  for (const maxDim of [1600, 1280, 1024, 800, 640]) {
    const escala = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * escala))
    const h = Math.max(1, Math.round(img.height * escala))
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d'); if (!ctx) break
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h)
    for (const q of [0.82, 0.7, 0.6, 0.5, 0.4]) {
      const out = canvas.toDataURL('image/jpeg', q)
      if (out.length <= MAX_IMG_CHARS) return out
    }
  }
  throw new Error('A imagem ficou grande demais mesmo após a compressão. Tente uma foto menor.')
}
