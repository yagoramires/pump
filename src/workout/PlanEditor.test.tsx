import { screen, waitFor, within } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import { stored } from '../../test/store'
import { workoutOf } from '../../test/helpers'
import userEvent from '@testing-library/user-event'
import { PlanEditor } from './PlanEditor'


test('Salvar entrega o plano editado pro onSave e não grava nada sozinho', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn()
  await renderLoaded(<PlanEditor initial={{ workouts: [workoutOf([{ name: 'Agachamento' }], { id: 'w1', name: 'Treino de pernas' })] }} onSave={onSave} onCancel={vi.fn()} />)
  const name = await screen.findByDisplayValue('Treino de pernas')
  await user.clear(name)
  await user.type(name, 'Pernas')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(onSave).toHaveBeenCalledWith({ workouts: [expect.objectContaining({ id: 'w1', name: 'Pernas' })] })
  expect(await stored('workoutPlan')).toBeUndefined()
})

test('Salvar recusa o que a importação recusaria: treino sem nome ou sem exercício', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn()
  await renderLoaded(<PlanEditor initial={{ workouts: [workoutOf([{ name: 'Agachamento' }], { name: 'Pernas' }), workoutOf([], { id: 'w2', label: 'B', name: 'Costas' })] }} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  expect(screen.getByText('Treino B: adicione pelo menos um exercício')).toBeInTheDocument()
  await user.clear(screen.getByDisplayValue('Pernas'))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(screen.getByText('Treino A: dê um nome ao treino')).toBeInTheDocument()
  expect(onSave).not.toHaveBeenCalled()
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
  await waitFor(() => expect(screen.getByDisplayValue('Peito')).toHaveFocus())
})

test('Subir e Descer movem dentro do grupo mostrado: cardio não troca com força', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn()
  const esteira = { name: 'Esteira', sets: 1, reps: '20 min' }
  await renderLoaded(<PlanEditor initial={{ workouts: [workoutOf([esteira, supino, { ...supino, name: 'Remada' }])] }} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: /Supino reto/ }))
  await user.click(screen.getByRole('button', { name: 'Mais ações' }))
  expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Descer' }))
  expect(screen.getByRole('button', { name: 'Descer' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Pronto' }))
  await user.click(screen.getByRole('button', { name: /Esteira/ }))
  await user.click(screen.getByRole('button', { name: 'Mais ações' }))
  expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Descer' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Pronto' }))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(onSave.mock.calls[0][0].workouts[0].exercises.map((e: { name: string }) => e.name)).toEqual(['Esteira', 'Remada', 'Supino reto'])
})

test('editar a ficha preserva o primeiro treino escolhido no import', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn()
  const start = { label: 'A', since: '2026-11-19T10:00:00.000Z' }
  await renderLoaded(<PlanEditor initial={{ workouts: [workoutOf([{ name: 'Agachamento' }], { id: 'w1', name: 'Treino de pernas' })], start }} onSave={onSave} onCancel={vi.fn()} />)
  await user.type(await screen.findByDisplayValue('Treino de pernas'), ' 2')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ start }))
})
