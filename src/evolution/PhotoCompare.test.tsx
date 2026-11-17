import { render, screen } from '@testing-library/react'
import { clear } from 'idb-keyval'
import { resetStoreForTests, save } from '../storage/db'
import { savePhoto } from '../storage/photos'
import { PhotoCompare } from './PhotoCompare'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

test('comparar: primeiro × último e foto ausente vira espaço vazio', async () => {
  const id = await savePhoto('data:image/jpeg;base64,AAA')
  await save('photoSets', [{ id: 's1', date: '2026-11-01', frente: 'nao-existe' }, { id: 's2', date: '2026-11-17', frente: id }])
  render(<PhotoCompare onClose={vi.fn()} />)
  expect(await screen.findByText('Antes: 1 nov')).toBeInTheDocument()
  expect(screen.getByText('Depois: 17 nov')).toBeInTheDocument()
  expect(await screen.findByLabelText('Foto indisponível')).toBeInTheDocument()
})
test('medidas: diferença de peso entre as datas', async () => {
  await save('profile', { sex: 'M', heightCm: 178, weightKg: 80, anamnesis: { goal: 'emagrecer' } } as never)
  await save('measurements', [{ id: 'a', date: '2026-10-30', weightKg: 80 }, { id: 'b', date: '2026-11-16', weightKg: 78.4 }])
  await save('photoSets', [{ id: 's1', date: '2026-11-01' }, { id: 's2', date: '2026-11-17' }])
  render(<PhotoCompare onClose={vi.fn()} />)
  expect(await screen.findByText('80 → 78,4 kg')).toBeInTheDocument()
  expect(screen.getByText('−1,6 kg')).toHaveClass('text-accent')
})
