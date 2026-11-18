import { act, waitFor } from '@testing-library/react'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from '@/storage/db'
import { loadPhoto, savePhoto } from '@/storage/photos'
import { renderHookLoaded } from '../../test/render'
import { fitWithin } from './resize'
import { hasPhoto, setAngle, usePhotoSets } from './photoSets'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

test('setAngle substitui o ângulo do mesmo dia e mantém a ordem por data', () => {
  let s = setAngle([], '2026-11-17', 'frente', 'p1')
  s = setAngle(s, '2026-11-17', 'frente', 'p2')
  expect(s).toHaveLength(1)
  expect(s[0].frente).toBe('p2')
  s = setAngle(s, '2026-11-10', 'lado', 'p3')
  expect(s.map((x) => x.date)).toEqual(['2026-11-10', '2026-11-17'])
  expect(hasPhoto({ id: 'x', date: '2026-11-01' })).toBe(false)
  expect(hasPhoto(s[0])).toBe(true)
})
test('fitWithin', () => {
  expect(fitWithin(4032, 3024)).toEqual({ w: 1280, h: 960 })
  expect(fitWithin(800, 600)).toEqual({ w: 800, h: 600 })
})
test('usePhotoSets: trocar a foto de um ângulo apaga a antiga do banco e mantém as outras', async () => {
  const [old, side, fresh] = [await savePhoto('data:image/jpeg;base64,A'), await savePhoto('data:image/jpeg;base64,B'), await savePhoto('data:image/jpeg;base64,C')]
  await save('photoSets', [{ id: 's', date: '2026-11-17', frente: old, lado: side }])
  const h = await renderHookLoaded(() => usePhotoSets())
  act(() => h.result.current.setAngle('2026-11-17', 'frente', fresh))
  await waitFor(async () => expect(await loadPhoto(old)).toBeUndefined())
  expect(await loadPhoto(side)).toBeDefined()
  expect(await load('photoSets')).toEqual([{ id: 's', date: '2026-11-17', frente: fresh, lado: side }])
})
