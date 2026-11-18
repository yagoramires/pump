import { fileToJpeg, videoToJpeg } from './resize'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('videoToJpeg recusa vídeo que ainda não tem quadro', async () => {
  await expect(videoToJpeg(document.createElement('video'), false)).rejects.toThrow('sem quadro')
})
test('fileToJpeg: iOS 15 recusa imageOrientation, tenta de novo sem opções', async () => {
  const bmp = { width: 100, height: 50, close: vi.fn() }
  const create = vi.fn().mockRejectedValueOnce(new TypeError('bad options')).mockResolvedValueOnce(bmp)
  vi.stubGlobal('createImageBitmap', create)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,X')
  const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
  await expect(fileToJpeg(file)).resolves.toBe('data:image/jpeg;base64,X')
  expect(create).toHaveBeenLastCalledWith(file)
  expect(bmp.close).toHaveBeenCalled()
})
test('fileToJpeg reduz o lado maior pra 1280 e não amplia foto menor', async () => {
  const sizes: number[][] = []
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (this: HTMLCanvasElement) {
    sizes.push([this.width, this.height])
    return 'data:image/jpeg;base64,X'
  })
  for (const [width, height] of [[4032, 3024], [800, 600]]) {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width, height, close: vi.fn() }))
    await fileToJpeg(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
  }
  expect(sizes).toEqual([[1280, 960], [800, 600]])
})
