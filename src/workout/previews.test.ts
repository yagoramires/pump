import { syncPreviewCache } from './previews'
import { imageUrl } from '../catalog/catalog'
import { cachedUrls, fakeCacheStorage, planWith } from '../../test/helpers'

test('syncPreviewCache adiciona as do plano, remove as antigas e ignora exercício sem foto', async () => {
  const cs = fakeCacheStorage({ [imageUrl('Velho/0.jpg')]: 'x' })
  await syncPreviewCache(planWith([{ images: ['A/0.jpg', 'A/1.jpg'] }, { images: [] }]), cs)
  expect(await cachedUrls(cs)).toEqual([imageUrl('A/0.jpg'), imageUrl('A/1.jpg')])
})

test('syncPreviewCache não lança quando uma imagem falha', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const cs = fakeCacheStorage({}, { failOn: imageUrl('A/1.jpg') })
  await expect(syncPreviewCache(planWith([{ images: ['A/0.jpg', 'A/1.jpg'] }]), cs)).resolves.toBeUndefined()
  expect(await cachedUrls(cs)).toEqual([imageUrl('A/0.jpg')])
  expect(warn).toHaveBeenCalled()
  warn.mockRestore()
})
