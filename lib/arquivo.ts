'use client'

// =============================================================
// Documento (PDF, Word, planilha) como data URL, sem Firebase Storage.
// Mesmo teto do resto do projeto: o doc do Firestore tem ~1 MB.
// Para arquivos maiores, use um link do Drive/Sheets.
// =============================================================

export const MAX_DOC_CHARS = 900_000

const EXT_DOC = /\.(pdf|docx?|xlsx?|csv|odt|ods|pptx?|txt)$/i

/** Lê um documento como data URL (com teto). Retorna os dados e o nome. */
export async function lerDocumentoDataURL(file: File): Promise<{ dados: string; nome: string }> {
  const ehDoc = file.type === 'application/pdf'
    || file.type.includes('word') || file.type.includes('officedocument')
    || file.type.includes('excel') || file.type.includes('spreadsheet')
    || file.type === 'text/csv' || file.type === 'text/plain'
    || EXT_DOC.test(file.name)
  if (!ehDoc) throw new Error('Envie um PDF, Word, planilha ou texto (ou cole um link).')

  const dados = await new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(new Error('Não consegui ler o arquivo.'))
    r.readAsDataURL(file)
  })
  if (dados.length > MAX_DOC_CHARS) {
    throw new Error('Arquivo grande demais para guardar aqui (máx. ~700 KB). Suba no Google Drive e cole o link.')
  }
  return { dados, nome: file.name }
}
