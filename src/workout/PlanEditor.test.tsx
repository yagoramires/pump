import { screen, waitFor, within } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import { workoutOf } from '../../test/helpers'
import userEvent from '@testing-library/user-event'
import { load } from '@/storage/db'
import { PlanEditor } from './PlanEditor'


test('Salvar entrega o plano editado pro onSave e não grava nada sozinho', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn()
  await renderLoaded(<PlanEditor initial={{ workouts: [{ id: 'w1', label: 'A', name: 'Treino de pernas', exercises: [] }] }} onSave={onSave} onCancel={vi.fn()} />)
  const name = await screen.findByDisplayValue('Treino de pernas')
  await user.clear(name)
  await user.type(name, 'Pernas')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(onSave).toHaveBeenCalledWith({ workouts: [expect.objectContaining({ id: 'w1', name: 'Pernas' })] })
  expect(await load('workoutPlan')).toBeUndefined()
})

const supino = { name: 'Supino reto', sets: 3, reps: '10-12', weightKg: 40, restSec: 90 }

test('tocar no exercício abre a gaveta; +2,5 kg e Pronto atualiza o resumo', async () => {
  const user = userEvent.setup()
  await renderLoaded(<PlanEditor initial={{ workouts: [workoutOf([supino], { name: 'Peito' })] }} onSave={vi.fn()} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: /Supino reto/ }))
  await user.click(screen.getByRole('button', { name: 'Aumentar carga' }))
  await user.click(screen.getByRole('button', { name: 'Pronto' }))
  expect(screen.getByText('3 × 10-12 · 42,5 kg · 90 s')).toBeInTheDocument()
})

test('mostra a foto, abre a prévia pela miniatura e edita pelo nome', async () => {
  const user = userEvent.setup()
  const exercises = [
    { ...supino, images: ['Supino/0.jpg'], instructions: ['Mantenha os pés no chão.'] },
    { name: 'Agachamento', muscles: ['quadríceps'] },
  ]
  await renderLoaded(<PlanEditor initial={{ workouts: [workoutOf(exercises)] }} onSave={vi.fn()} onCancel={vi.fn()} />)

  const thumbnail = screen.getByRole('button', { name: 'Ver prévia de Supino reto' })
  expect(within(thumbnail).getByAltText('')).toHaveAttribute('src', expect.stringContaining('Supino/0.jpg'))
  expect(within(screen.getByRole('button', { name: /Agachamento/ })).queryByRole('img')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Ver prévia de Agachamento' })).not.toBeInTheDocument()
  await user.click(thumbnail)
  const preview = screen.getByRole('dialog', { name: 'Supino reto' })
  expect(within(preview).getByRole('img', { name: 'Supino reto' })).toBeInTheDocument()
  expect(within(preview).getByText('Mantenha os pés no chão.')).toBeInTheDocument()
  await user.click(within(preview).getByRole('button', { name: 'Fechar' }))
  await waitFor(() => expect(thumbnail).toHaveFocus())
  await user.click(screen.getByRole('button', { name: /^Supino reto/ }))
  expect(screen.getByRole('textbox', { name: 'Carga em kg' })).toBeInTheDocument()
})

test('carga digitada com vírgula na gaveta', async () => {
  const user = userEvent.setup()
  await renderLoaded(<PlanEditor initial={{ workouts: [workoutOf([supino], { name: 'Peito' })] }} onSave={vi.fn()} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: /Supino reto/ }))
  const kg = screen.getByRole('textbox', { name: 'Carga em kg' })
  await user.clear(kg)
  await user.type(kg, '22,5')
  await user.click(screen.getByRole('button', { name: 'Pronto' }))
  expect(screen.getByText('3 × 10-12 · 22,5 kg · 90 s')).toBeInTheDocument()
})
test('Renomear fecha o menu e põe o foco no nome do treino depois da animação', async () => {
  const user = userEvent.setup()
  await renderLoaded(<PlanEditor initial={{ workouts: [workoutOf([], { name: 'Peito' })] }} onSave={vi.fn()} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Mais ações do treino A' }))
  await user.click(await screen.findByRole('button', { name: 'Renomear' }))
  await waitFor(() => expect(screen.getByDisplayValue('Peito')).toHaveFocus(), { timeout: 2000 })
})
