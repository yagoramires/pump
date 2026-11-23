import { toast } from 'sonner'

// texto que ainda vai chegar (lista baixada): o iOS/WebKit só aceita a escrita dentro do toque, então entrega a promessa
// pro ClipboardItem em vez de esperar o fetch
async function copyText(text: string | Promise<string>): Promise<boolean> {
  try {
    if (typeof text !== 'string' && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': text.then((t) => new Blob([t], { type: 'text/plain' })) })])
    } else await navigator.clipboard.writeText(await text)
    return true
  } catch {
    return false
  }
}

export const COPY_FAIL = 'Não consegui copiar. Tente de novo.'
export const FILE_FAIL = 'Não consegui gerar o arquivo. Tente de novo.'
const COPY_OFFLINE = 'Sem internet pra copiar a lista.'

/** devolve se copiou: quem depende disso (exportar no editor web) só dá a cópia por feita quando deu certo */
export async function copy(text: string | Promise<string>, ok: string): Promise<boolean> {
  if (await copyText(text)) {
    toast(ok)
    return true
  }
  toast(await Promise.resolve(text).then(() => COPY_FAIL, () => COPY_OFFLINE))
  return false
}

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
  downloadFile(file)
  return 'downloaded'
}

/** baixa sem passar pelo compartilhar (no computador, "Baixar" tem que baixar) */
export function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  // WebKit ainda lê o blob depois do click: revogar na hora pode falhar o download
  setTimeout(() => URL.revokeObjectURL(url), 40_000)
}
