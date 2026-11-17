import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { resetStoreForTests } from '../storage/db'
import { PlanImport } from './PlanImport'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[]')))
})
afterEach(() => vi.unstubAllGlobals())

test('colar JSON válido mostra o resumo sozinho, sem botão Revisar', async () => {
  const user = userEvent.setup()
  render(<PlanImport onDone={vi.fn()} />)
  await user.click(await screen.findByRole('textbox'))
  await user.paste(JSON.stringify({ formato: 'pump-plano', versao: 1, treinos: [{ letra: 'A', nome: 'Peito', dias: ['seg'], exercicios: [{ nome: 'Remada X', series: 3, reps: '10' }] }] }))
  expect(await screen.findByText('1 treinos · 1 exercícios')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Revisar' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Importar plano' })).toBeEnabled()
})

test('colar texto inválido mostra problemas e mantém Importar desabilitado', async () => {
  const user = userEvent.setup()
  render(<PlanImport onDone={vi.fn()} />)
  await user.click(await screen.findByRole('textbox'))
  await user.paste('oi')
  expect(await screen.findByText('Não encontrei um plano em JSON no texto')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Importar plano' })).toBeDisabled()
})
