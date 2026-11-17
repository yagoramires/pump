/** folha de compartilhar com o arquivo; sem suporte, baixa. Cancelar a folha não é erro */
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
