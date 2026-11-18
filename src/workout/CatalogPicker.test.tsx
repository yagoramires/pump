import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ex } from '../../test/helpers'
import { renderLoaded } from '../../test/render'
import { clear } from 'idb-keyval'
import { resetStoreForTests, save } from '@/storage/db'
import { fetchExercises } from '@/catalog/catalog'
import { CatalogPicker } from './CatalogPicker'

// fetchExercises guarda a promessa no módulo; mockado, cada teste escolhe online ou offline
vi.mock('@/catalog/catalog', async (orig) => ({ ...(await orig<typeof import('@/catalog/catalog')>()), fetchExercises: vi.fn() }))

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

test('offline: avisa e lista o exercício próprio salvo', async () => {
  vi.mocked(fetchExercises).mockRejectedValue(new Error('offline'))
  await save('customExercises', [{ id: 'custom-1', name: 'Remada do Yago', muscles: ['dorsais'] }])
  resetStoreForTests()
  await renderLoaded(<CatalogPicker onPick={vi.fn()} onClose={vi.fn()} />)
  expect(await screen.findByText('Sem internet: só seus exercícios aparecem')).toBeInTheDocument()
  expect(await screen.findByText('Remada do Yago')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Adicionar Remada do Yago' })).toBeInTheDocument()
})

test('filtro de músculo inclui secundários; com aparelho, os exercícios próprios somem', async () => {
  const list = [ex('Remada', { muscles: ['dorsais', 'bíceps'], equipment: 'barra' }), ex('Rosca', { muscles: ['bíceps'], equipment: 'halter' }), ex('Agachamento', { muscles: ['quadríceps'], equipment: 'barra' })]
  vi.mocked(fetchExercises).mockResolvedValue(list)
  await save('customExercises', [{ id: 'custom-1', name: 'Rosca do Yago', muscles: ['bíceps'] }])
  resetStoreForTests()
  const user = userEvent.setup()
  await renderLoaded(<CatalogPicker onPick={vi.fn()} onClose={vi.fn()} />)
  const names = () => screen.queryAllByRole('button', { name: /^Adicionar / }).map((b) => b.getAttribute('aria-label'))
  await user.click(within(await screen.findByRole('group', { name: 'Músculo' })).getByRole('button', { name: 'bíceps' }))
  expect(names()).toEqual(['Adicionar Rosca do Yago', 'Adicionar Remada', 'Adicionar Rosca'])
  await user.click(within(screen.getByRole('group', { name: 'Aparelho' })).getByRole('button', { name: 'halter' }))
  expect(names()).toEqual(['Adicionar Rosca'])
})
