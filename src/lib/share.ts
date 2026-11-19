export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export const COPY_FAIL = 'Não consegui copiar. Tente de novo.'
/** copia e avisa pelo canal da tela (toast ou aviso na própria tela) */
export const makeCopy = (report: (msg: string) => unknown) => async (text: string, ok: string) => { report((await copyText(text)) ? ok : COPY_FAIL) }

export async function shareFile(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // iOS: preparar o arquivo demorou e o toque já "expirou"; baixar ainda funciona
      if (!(e instanceof DOMException && e.name === 'NotAllowedError')) throw e
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
