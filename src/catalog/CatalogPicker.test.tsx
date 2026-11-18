import { screen } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import { clear } from 'idb-keyval'
import { resetStoreForTests, save } from '../storage/db'
import { CatalogPicker } from './CatalogPicker'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

test('offline: avisa e lista o exercício próprio salvo', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  await save('customExercises', [{ id: 'custom-1', name: 'Remada do Yago', muscles: ['dorsais'] }])
  resetStoreForTests()
  await renderLoaded(<CatalogPicker onPick={vi.fn()} onClose={vi.fn()} />)
  expect(await screen.findByText('Sem internet: só seus exercícios aparecem')).toBeInTheDocument()
  expect(await screen.findByText('Remada do Yago')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Adicionar Remada do Yago' })).toBeInTheDocument()
  vi.unstubAllGlobals()
})
