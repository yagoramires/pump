import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ex } from '../../test/helpers'
import { renderLoaded } from '../../test/render'
import { seedStore } from '../../test/store'
import { fetchExercises } from '@/catalog/catalog'
import { AddExtraExercise } from './AddExtraExercise'

vi.mock('@/catalog/catalog', async (orig) => ({ ...(await orig<typeof import('@/catalog/catalog')>()), fetchExercises: vi.fn() }))

test('escolhe o exercício, ajusta as séries (3 → 4) e adiciona', async () => {
  const remada = ex('Remada', { muscles: ['dorsais'] })
  vi.mocked(fetchExercises).mockResolvedValue([remada])
  await seedStore({})
  const onAdd = vi.fn()
  const user = userEvent.setup()
  await renderLoaded(<AddExtraExercise onAdd={onAdd} onClose={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Adicionar Remada' }))
  await user.click(await screen.findByRole('button', { name: 'Aumentar Séries' }))
  await user.click(screen.getByRole('button', { name: 'Adicionar' }))
  expect(onAdd).toHaveBeenCalledWith(remada, 4)
})
