import { videoToJpeg } from './resize'

test('videoToJpeg recusa vídeo que ainda não tem quadro', async () => {
  await expect(videoToJpeg(document.createElement('video'), false)).rejects.toThrow('sem quadro')
})
