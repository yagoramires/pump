export function fitWithin(w: number, h: number, max = 1280): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h))
  return { w: Math.round(w * k), h: Math.round(h * k) }
}

function toJpeg(src: CanvasImageSource, w: number, h: number, mirror = false): string {
  const { w: cw, h: ch } = fitWithin(w, h)
  const c = document.createElement('canvas')
  c.width = cw
  c.height = ch
  const ctx = c.getContext('2d')!
  if (mirror) {
    ctx.translate(cw, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(src, 0, 0, cw, ch)
  return c.toDataURL('image/jpeg', 0.8)
}

export async function fileToJpeg(file: File): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    return toJpeg(bmp, bmp.width, bmp.height)
  } finally {
    bmp.close()
  }
}

export async function videoToJpeg(video: HTMLVideoElement, mirror: boolean): Promise<string> {
  // antes do primeiro quadro o canvas sai vazio ("data:,")
  if (video.readyState < 2 || !video.videoWidth) throw new Error('vídeo ainda sem quadro')
  return toJpeg(video, video.videoWidth, video.videoHeight, mirror)
}
