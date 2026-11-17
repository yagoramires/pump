import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear, get } from 'idb-keyval'
import { resetStoreForTests } from '../storage/db'
import { PlanImport } from './PlanImport'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[]')))
})
afterEach(() => vi.unstubAllGlobals())

test('colar JSON válido mostra o resumo sozinho e libera Revisar plano', async () => {
  const user = userEvent.setup()
  render(<PlanImport onDone={vi.fn()} />)
  await user.click(await screen.findByRole('textbox'))
  await user.paste(JSON.stringify({ formato: 'pump-plano', versao: 1, treinos: [{ letra: 'A', nome: 'Peito', dias: ['seg'], exercicios: [{ nome: 'Remada X', series: 3, reps: '10' }] }] }))
  expect(await screen.findByText('1 treinos · 1 exercícios')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Revisar' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Revisar plano' })).toBeEnabled()
})

test('colar texto inválido mostra problemas e mantém Revisar plano desabilitado', async () => {
  const user = userEvent.setup()
  render(<PlanImport onDone={vi.fn()} />)
  await user.click(await screen.findByRole('textbox'))
  await user.paste('oi')
  expect(await screen.findByText('Não encontrei um plano em JSON no texto')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Revisar plano' })).toBeDisabled()
})

test('anamnese fica salva no perfil e vai no prompt copiado', async () => {
  const user = userEvent.setup()
  const writeText = vi.fn<(text: string) => Promise<void>>(async () => {})
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  render(<PlanImport onDone={vi.fn()} />)
  await user.click(await screen.findByRole('radio', { name: 'Ganhar massa' }))
  await user.click(screen.getByRole('radio', { name: '4' }))
  await user.type(screen.getByLabelText('Lesões, limitações ou preferências'), 'ombro')
  await user.click(screen.getByRole('button', { name: 'Copiar' }))
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('- Objetivo: ganhar massa muscular\n'))
  expect(writeText.mock.calls[0][0]).toContain('- Dias por semana: 4')
  expect(writeText.mock.calls[0][0]).toContain('- Lesões, limitações ou preferências: ombro')
  expect((await get('profile'))?.anamnesis).toEqual({ goal: 'hipertrofia', daysPerWeek: 4, notes: 'ombro' })
})

test('Revisar plano abre o editor; Salvar grava o plano e os exercícios novos', async () => {
  const user = userEvent.setup()
  const onDone = vi.fn()
  render(<PlanImport onDone={onDone} />)
  await user.click(await screen.findByRole('textbox', { name: 'Resposta da IA' }))
  await user.paste(JSON.stringify({ formato: 'pump-plano', versao: 1, treinos: [{ letra: 'A', nome: 'Peito', dias: ['seg'], exercicios: [{ nome: 'Remada X', series: 3, reps: '10' }] }] }))
  await screen.findByText('1 treinos · 1 exercícios')
  await user.click(screen.getByRole('button', { name: 'Revisar plano' }))
  expect(await screen.findByRole('heading', { name: 'Editar plano' })).toBeInTheDocument()
  expect(await get('workoutPlan')).toBeUndefined() // nada gravado antes do Salvar
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(onDone).toHaveBeenCalled()
  await vi.waitFor(async () => expect((await get('workoutPlan'))?.workouts[0].exercises[0].name).toBe('Remada X'))
  expect((await get('customExercises'))?.[0].name).toBe('Remada X')
})
