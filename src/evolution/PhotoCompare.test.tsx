import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderLoaded } from '../../test/render'
import { save } from '@/storage/db'
import { savePhoto } from '@/storage/photos'
import { PhotoCompare } from './PhotoCompare'


test('comparar: primeiro × último e foto ausente vira espaço vazio', async () => {
  const id = await savePhoto('data:image/jpeg;base64,AAA')
  await save('photoSets', [{ id: 's1', date: '2026-11-01', frente: 'nao-existe' }, { id: 's2', date: '2026-11-17', frente: id }])
  await renderLoaded(<PhotoCompare onClose={vi.fn()} />)
  expect(await screen.findByText('Antes: 1 nov')).toBeInTheDocument()
  expect(screen.getByText('Depois: 17 nov')).toBeInTheDocument()
  expect(await screen.findByLabelText('Foto indisponível')).toBeInTheDocument()
})
test('medidas: diferença de peso entre as datas', async () => {
  await save('profile', { sex: 'M', heightCm: 178, dietGoal: 'perder' })
  await save('measurements', [{ id: 'a', date: '2026-10-30', weightKg: 80 }, { id: 'b', date: '2026-11-16', weightKg: 78.4 }])
  await save('photoSets', [{ id: 's1', date: '2026-11-01' }, { id: 's2', date: '2026-11-17' }])
  await renderLoaded(<PhotoCompare onClose={vi.fn()} />)
  expect(await screen.findByText('80 → 78,4 kg')).toBeInTheDocument()
  expect(screen.getByText('−1,6 kg')).toHaveClass('text-success-fg')
})
test('gordura usa um registro só (o mais próximo com pescoço e cintura), não campos de dias diferentes', async () => {
  await save('profile', { sex: 'M', heightCm: 178 })
  // 16/11 só tem cintura: misturar com o pescoço de 30/10 inventaria uma gordura que ninguém mediu
  await save('measurements', [{ id: 'a', date: '2026-10-30', neckCm: 38, waistCm: 88 }, { id: 'b', date: '2026-11-16', waistCm: 85 }])
  await save('photoSets', [{ id: 's1', date: '2026-11-01' }, { id: 's2', date: '2026-11-17' }])
  await renderLoaded(<PhotoCompare onClose={vi.fn()} />)
  expect(await screen.findByText('Gordura')).toBeInTheDocument()
  expect(screen.getByText('0 pt')).toBeInTheDocument()
})
test('tocar numa foto abre ela grande; a ausente não abre nada', async () => {
  const user = userEvent.setup()
  const id = await savePhoto('data:image/jpeg;base64,AAA')
  await save('photoSets', [{ id: 's1', date: '2026-11-01', frente: 'nao-existe' }, { id: 's2', date: '2026-11-17', frente: id }])
  await renderLoaded(<PhotoCompare onClose={vi.fn()} />)
  expect(screen.queryByRole('button', { name: 'Ver 1 nov · Frente' })).not.toBeInTheDocument()
  await user.click(await screen.findByRole('button', { name: 'Ver 17 nov · Frente' }))
  expect(within(await screen.findByRole('dialog', { name: '17 nov · Frente' })).getByRole('img', { name: '17 nov · Frente' })).toBeInTheDocument()
})
