import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { save } from '@/storage/db'
import type { WorkoutSession } from './types'
import { pe } from '../../test/helpers'
import { renderLoaded } from '../../test/render'
import { PastWorkouts } from './PastWorkouts'
const sess = (date: string, name: string, over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  date, workoutId: 'a', workoutLabel: 'A', workoutName: name, completedAt: `${date}T19:00:00`,
  exercises: [
    { ...pe({ exerciseId: 'Supino', name: 'Supino reto' }), sets: [{ reps: '10', weightKg: 40 }, null] },
    { ...pe({ exerciseId: 'Rosca', name: 'Rosca direta' }), sets: [null] },
  ],
  ...over,
})
test('lista em ordem decrescente; tocar abre o resumo e os exercícios ficam atrás de um toque', async () => {
  await save('workoutLog', { '2026-11-10': sess('2026-11-10', 'Antigo'), '2026-11-14': sess('2026-11-14', 'Recente'), '2026-11-15': { ...sess('2026-11-15', 'Aberto'), completedAt: undefined } })
  const user = userEvent.setup()
  await renderLoaded(<PastWorkouts onClose={() => {}} />)
  const rows = screen.getAllByRole('button', { name: /TREINO A/ })
  expect(rows).toHaveLength(2)
  expect(rows[0]).toHaveTextContent('Recente')
  expect(rows[1]).toHaveTextContent('Antigo')
  expect(rows[0]).toHaveTextContent('1 série · nota 1,8') // (Supino 1 de 2 igual = 0,35 + Rosca sem série = 0) / 2
  expect(rows[0]).not.toHaveTextContent('kg')
  await user.click(rows[0])
  expect(screen.getByRole('heading', { name: 'Recente' })).toBeInTheDocument()
  expect(screen.getByText('Treino concluído')).toBeInTheDocument()
  expect(screen.queryByText('40 kg × 10')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Exercícios' }))
  expect(screen.getAllByText('Supino reto')).toHaveLength(2) // placar + lista de séries
  expect(screen.getByText('40 kg × 10')).toBeInTheDocument()
  expect(screen.getAllByText('Rosca direta')).toHaveLength(1) // só no placar: a lista de séries esconde exercício sem série
  expect(screen.getByText('0 de 1 séries')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.getByRole('heading', { name: 'Treinos anteriores' })).toBeInTheDocument()
})
test('vazio', async () => {
  await renderLoaded(<PastWorkouts onClose={() => {}} />)
  expect(screen.getByText('Nenhum treino concluído ainda')).toBeInTheDocument()
})
test('ficha e extra no mesmo dia aparecem em duas linhas e o extra abre o próprio resumo', async () => {
  await save('workoutLog', { '2026-11-14': sess('2026-11-14', 'Peito') })
  await save('extraLog', { '2026-11-14': sess('2026-11-14', 'Treino extra', { workoutId: 'extra', workoutLabel: 'Extra' }) })
  const user = userEvent.setup()
  await renderLoaded(<PastWorkouts onClose={() => {}} />)
  expect(screen.getByRole('button', { name: /TREINO A/ })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /TREINO Extra/ }))
  expect(screen.getByRole('heading', { name: 'Treino extra' })).toBeInTheDocument()
  expect(screen.getByText('Treino concluído')).toBeInTheDocument()
})
