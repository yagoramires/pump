import { clear } from 'idb-keyval'
import { resetStoreForTests } from './db'
import { deletePhotos, loadPhoto, savePhoto } from './photos'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

test('savePhoto/loadPhoto/deletePhotos', async () => {
  const id = await savePhoto('data:image/jpeg;base64,AAA')
  expect(await loadPhoto(id)).toBe('data:image/jpeg;base64,AAA')
  await deletePhotos([id])
  expect(await loadPhoto(id)).toBeUndefined()
})
test('savePhoto recusa o que não é imagem', async () => {
  await expect(savePhoto('data:,')).rejects.toThrow('não é imagem')
})
