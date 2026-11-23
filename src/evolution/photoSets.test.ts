import { act, waitFor } from '@testing-library/react'
import { save } from '@/storage/db'
import { loadPhoto, savePhoto } from '@/storage/photos'
import { renderHookLoaded } from '../../test/render'
import { stored } from '../../test/store'
import { hasPhoto, photoCount, removeAngle, setAngle } from './photoSets'
import { usePhotoSets } from './usePhotoSets'


test('setAngle substitui o ângulo do mesmo dia e mantém a ordem por data', () => {
  let s = setAngle([], '2026-11-17', 'frente', 'p1')
  s = setAngle(s, '2026-11-17', 'frente', 'p2')
  expect(s).toHaveLength(1)
  expect(s[0].frente).toBe('p2')
  s = setAngle(s, '2026-11-10', 'lado', 'p3')
  expect(s.map((x) => x.date)).toEqual(['2026-11-10', '2026-11-17'])
  expect(hasPhoto({ id: 'x', date: '2026-11-01' })).toBe(false)
  expect(hasPhoto(s[0])).toBe(true)
  expect(photoCount(s[0])).toBe(1)
  expect(photoCount(undefined)).toBe(0)
})
test('usePhotoSets: trocar a foto de um ângulo apaga a antiga do banco e mantém as outras', async () => {
  const [old, side, fresh] = [await savePhoto('data:image/jpeg;base64,A'), await savePhoto('data:image/jpeg;base64,B'), await savePhoto('data:image/jpeg;base64,C')]
  await save('photoSets', [{ id: 's', date: '2026-11-17', frente: old, lado: side }])
  const h = await renderHookLoaded(() => usePhotoSets())
  act(() => h.result.current.setAngle('2026-11-17', 'frente', fresh))
  await waitFor(async () => expect(await loadPhoto(old)).toBeUndefined())
  expect(await loadPhoto(side)).toBeDefined()
  expect(await stored('photoSets')).toEqual([{ id: 's', date: '2026-11-17', frente: fresh, lado: side }])
})
test('usePhotoSets grava sobre o valor guardado: o que mudou depois do render não se perde', async () => {
  const h = await renderHookLoaded(() => usePhotoSets())
  const { setAngle: stale } = h.result.current
  act(() => void save('photoSets', [{ id: 'a', date: '2026-11-10', lado: 'p0' }]))
  act(() => stale('2026-11-17', 'frente', 'p1'))
  expect((await stored('photoSets'))?.map((s) => s.date)).toEqual(['2026-11-10', '2026-11-17'])
})
test('removeAngle tira só aquele ângulo e mantém os outros', () => {
  const s = removeAngle([{ id: 'a', date: '2026-11-17', frente: 'p1', lado: 'p2' }], '2026-11-17', 'frente')
  expect(s).toEqual([{ id: 'a', date: '2026-11-17', lado: 'p2' }])
})
test('removeAngle da última foto do dia remove o conjunto', () => {
  expect(removeAngle([{ id: 'a', date: '2026-11-17', frente: 'p1' }, { id: 'b', date: '2026-11-10', lado: 'p3' }], '2026-11-17', 'frente'))
    .toEqual([{ id: 'b', date: '2026-11-10', lado: 'p3' }])
})
test('usePhotoSets: apagar um ângulo apaga a foto do banco e mantém a outra', async () => {
  const [front, side] = [await savePhoto('data:image/jpeg;base64,A'), await savePhoto('data:image/jpeg;base64,B')]
  await save('photoSets', [{ id: 's', date: '2026-11-17', frente: front, lado: side }])
  const h = await renderHookLoaded(() => usePhotoSets())
  act(() => h.result.current.removeAngle('2026-11-17', 'frente'))
  await waitFor(async () => expect(await loadPhoto(front)).toBeUndefined())
  expect(await loadPhoto(side)).toBeDefined()
  expect(await stored('photoSets')).toEqual([{ id: 's', date: '2026-11-17', lado: side }])
})
