import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from '../storage/db'
import { EvolutionTab } from './EvolutionTab'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

test('sem dados: estado vazio com Registrar', async () => {
  render(<EvolutionTab />)
  expect(await screen.findByRole('heading', { name: 'Sua evolução começa aqui' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Registrar' })).toBeInTheDocument()
})
test('registrar medidas com vírgula atualiza peso, gordura e perfil', async () => {
  const user = userEvent.setup()
  await save('profile', { sex: 'M', heightCm: 178, weightKg: 80 })
  render(<EvolutionTab />)
  await user.click(await screen.findByRole('button', { name: 'Registrar' }))
  await user.click(await screen.findByRole('button', { name: 'Medidas' }))
  await user.type(await screen.findByLabelText('Peso'), '78,4')
  await user.type(screen.getByLabelText('Pescoço'), '38')
  await user.type(screen.getByLabelText('Cintura'), '85')
  expect(screen.getByText('18,4%')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(async () => expect((await load('profile'))?.weightKg).toBe(78.4))
  expect((await load('measurements'))?.[0]).toMatchObject({ weightKg: 78.4, neckCm: 38, waistCm: 85 })
})
test('perfil sem altura: gordura mostra —', async () => {
  await save('profile', { sex: 'M', heightCm: 0, weightKg: 0 })
  await save('measurements', [{ id: 'a', date: '2026-11-17', neckCm: 38, waistCm: 85, weightKg: 80 }])
  render(<EvolutionTab />)
  expect(await screen.findByText('Gordura')).toBeInTheDocument()
  expect(screen.getAllByText('—').length).toBeGreaterThan(0)
})
test('diferença de peso verde quando o objetivo é emagrecer e o peso caiu', async () => {
  await save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 80 }, { id: 'b', date: '2026-11-17', weightKg: 78.4 }])
  render(<EvolutionTab />)
  expect(await screen.findByText('−1,6 kg')).toHaveClass('text-accent')
})
