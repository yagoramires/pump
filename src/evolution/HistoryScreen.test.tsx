import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { save } from '@/storage/db'
import { loadPhoto, savePhoto } from '@/storage/photos'
import { dietDay, food, pe } from '../../test/helpers'
import { renderLoaded } from '../../test/render'
import { stored } from '../../test/store'
import { HistoryScreen } from './HistoryScreen'
import { restRecord } from '@/workout/rest'

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 17, 12))
})
afterEach(() => vi.useRealTimers())

test('apagar fotos do dia remove o registro e as fotos', async () => {
  const id = await savePhoto('data:image/jpeg;base64,AAA')
  await save('photoSets', [{ id: 's', date: '2026-11-17', frente: id }])
  const user = userEvent.setup()
  await renderLoaded(<HistoryScreen onClose={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: '17' }))
  await user.click(screen.getByRole('button', { name: 'Apagar fotos' }))
  await user.click(await screen.findByRole('button', { name: 'Apagar' }))
  await waitFor(async () => expect(await stored('photoSets')).toEqual([]))
  expect(await loadPhoto(id)).toBeUndefined()
})
test('detalhe do dia mostra o treino concluído', async () => {
  await save('workoutLog', {
    '2026-11-16': {
      date: '2026-11-16', workoutId: 'a', workoutLabel: 'A', workoutName: 'Peito e tríceps',
      startedAt: '2026-11-16T18:00:00.000Z', completedAt: '2026-11-16T18:52:00.000Z',
      exercises: [{ ...pe({ exerciseId: 'supino', name: 'Supino', reps: '10', weightKg: 40, restSec: 60 }), sets: [{ reps: '10', weightKg: 40 }, { reps: '10', weightKg: 40 }, null] }],
    },
  })
  const user = userEvent.setup()
  await renderLoaded(<HistoryScreen onClose={vi.fn()} />)
  const day = await screen.findByRole('button', { name: '16' })
  expect(day).toHaveAccessibleDescription(/treino/)
  await user.click(day)
  expect(screen.getByText('Peito e tríceps')).toBeInTheDocument()
  expect(screen.getByText('2 séries · nota 4,2 · 52 min')).toBeInTheDocument()
})
test('uma série concluída fica no singular', async () => {
  await save('workoutLog', {
    '2026-11-16': {
      date: '2026-11-16', workoutId: 'a', workoutLabel: 'A', workoutName: 'Peito e tríceps',
      startedAt: '2026-11-16T18:00:00.000Z', completedAt: '2026-11-16T18:52:00.000Z',
      exercises: [{ ...pe({ exerciseId: 'supino', name: 'Supino', reps: '10', weightKg: 40, restSec: 60 }), sets: [{ reps: '10', weightKg: 40 }, null] }],
    },
  })
  const user = userEvent.setup()
  await renderLoaded(<HistoryScreen onClose={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: '16' }))
  expect(screen.getByText('1 série · nota 3,4 · 52 min')).toBeInTheDocument()
})
test('apagar medidas do dia remove o registro', async () => {
  await save('measurements', [{ id: 'm', date: '2026-11-17', weightKg: 78.4, waistCm: 81 }, { id: 'n', date: '2026-11-10', weightKg: 79 }])
  const user = userEvent.setup()
  await renderLoaded(<HistoryScreen onClose={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: '17' }))
  expect(screen.getByText('Peso 78,4 kg · Cintura 81 cm')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Apagar medidas' }))
  await user.click(await screen.findByRole('button', { name: 'Apagar' }))
  await waitFor(async () => expect(await stored('measurements')).toEqual([{ id: 'n', date: '2026-11-10', weightKg: 79 }]))
})
test('abre com hoje selecionado e o dia descreve o que tem registrado', async () => {
  await save('measurements', [{ id: 'm', date: '2026-11-17', weightKg: 78.4 }])
  await renderLoaded(<HistoryScreen onClose={vi.fn()} />)
  const today = await screen.findByRole('button', { name: '17' })
  expect(today).toHaveAttribute('aria-pressed', 'true')
  expect(today).toHaveAttribute('aria-current', 'date')
  expect(today).toHaveAccessibleDescription('com registro')
  expect(screen.getByText('Peso 78,4 kg')).toBeInTheDocument()
})
test('Histórico mostra dieta e água do dia e apaga com confirmação', async () => {
  // 2 de 3 marcadas (uma com troca) + 1 extra na não marcada: 600 kcal
  const day = dietDay([true, true, false], { menuName: 'Dia de treino' })
  day.meals[1].items = [{ ...food({ id: 'b', name: 'Batata' }), swappedFrom: 'Arroz' }]
  day.meals[2].items.push({ ...food({ id: 'x' }), extra: true })
  const freeMeal = dietDay([true, true])
  freeMeal.meals[1].free = true
  await save('dietLog', { '2026-11-14': freeMeal, '2026-11-15': dietDay([false, false], { free: true }), '2026-11-16': day })
  await save('waterLog', { '2026-11-16': { ml: 2500, goalMl: 2000 } })
  await save('supplementLog', { '2026-11-16': { taken: ['a', 'b'], total: 3 } })
  await save('workoutLog', { '2026-11-16': { date: '2026-11-16', workoutId: 'a', workoutLabel: 'A', workoutName: 'Peito', exercises: [], rest: true } })
  const user = userEvent.setup()
  await renderLoaded(<HistoryScreen onClose={vi.fn()} />)

  await user.click(await screen.findByRole('button', { name: '15' }))
  expect(screen.getByText('Dieta · Dia livre')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '14' }))
  expect(screen.getByText('Padrão · 2 de 2 refeições · 1 refeição livre')).toBeInTheDocument()

  const d16 = screen.getByRole('button', { name: '16' })
  expect(d16).toHaveAccessibleDescription('com registro')
  await user.click(d16)
  expect(screen.getByText('Dieta · 600 kcal')).toBeInTheDocument()
  expect(screen.getByText('Dia de treino · 2 de 3 refeições · 1 troca · 1 extra')).toBeInTheDocument()
  expect(screen.getByText('Água · 2,5 L')).toBeInTheDocument()
  expect(screen.getByText('Suplementos · 2 de 3')).toBeInTheDocument()
  expect(screen.getByText('Descanso')).toBeInTheDocument()
  expect(screen.queryByText(/Treino A/)).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Apagar dieta' }))
  expect(await screen.findByText('Apagar dieta?')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Apagar' }))
  await waitFor(async () => expect(Object.keys((await stored('dietLog'))!)).toEqual(['2026-11-14', '2026-11-15']))
  await user.click(screen.getByRole('button', { name: 'Apagar água' }))
  await user.click(await screen.findByRole('button', { name: 'Apagar' }))
  await waitFor(async () => expect(await stored('waterLog')).toEqual({}))
  await user.click(screen.getByRole('button', { name: 'Apagar suplementos' }))
  expect(await screen.findByText('Apagar suplementos?')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Apagar' }))
  await waitFor(async () => expect(await stored('supplementLog')).toEqual({}))
  expect(screen.queryByText('Dieta · 600 kcal')).not.toBeInTheDocument()
})
test('aberto na virada do dia, "hoje" segue o relógio ao voltar do segundo plano', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 17, 23, 50))
  await renderLoaded(<HistoryScreen onClose={vi.fn()} />)
  expect(await screen.findByRole('button', { name: '17' })).toHaveAttribute('aria-current', 'date')
  vi.setSystemTime(new Date(2026, 10, 18, 0, 10))
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(screen.getByRole('button', { name: '18' })).toHaveAttribute('aria-current', 'date')
  expect(screen.getByRole('button', { name: '17' })).not.toHaveAttribute('aria-current')
})

test('só suplementos marca o dia com registro', async () => {
  await save('supplementLog', { '2026-11-10': { taken: ['a'], total: 2 } })
  await renderLoaded(<HistoryScreen onClose={vi.fn()} />)
  expect(await screen.findByRole('button', { name: '10' })).toHaveAccessibleDescription('com registro')
})
const sess = (workoutId: string, workoutLabel: string, workoutName: string) => ({
  date: '2026-11-16', workoutId, workoutLabel, workoutName, startedAt: '2026-11-16T18:00:00.000Z', completedAt: '2026-11-16T18:52:00.000Z',
  exercises: [{ ...pe({ exerciseId: 'supino', name: 'Supino', reps: '10', weightKg: 40, restSec: 60 }), sets: [{ reps: '10', weightKg: 40 }] }],
})
test('ficha e extra no mesmo dia: dia treinado, duas linhas e cabeçalho com os dois', async () => {
  await save('workoutLog', { '2026-11-16': sess('a', 'A', 'Peito') })
  await save('extraLog', { '2026-11-16': sess('extra', 'Extra', 'Treino extra') })
  const user = userEvent.setup()
  await renderLoaded(<HistoryScreen onClose={vi.fn()} />)
  const day = await screen.findByRole('button', { name: '16' })
  expect(day).toHaveAccessibleDescription(/treino/)
  await user.click(day)
  expect(screen.getByText(/Treino A \+ Extra/)).toBeInTheDocument()
  expect(screen.getByText('Peito')).toBeInTheDocument()
  expect(screen.getByText('Treino extra')).toBeInTheDocument()
})
test('extra no dia de descanso: dia treinado e o descanso some', async () => {
  await save('workoutLog', { '2026-11-16': restRecord('2026-11-16') })
  await save('extraLog', { '2026-11-16': sess('extra', 'Extra', 'Treino extra') })
  const user = userEvent.setup()
  await renderLoaded(<HistoryScreen onClose={vi.fn()} />)
  const day = await screen.findByRole('button', { name: '16' })
  expect(day).toHaveAccessibleDescription(/treino/)
  await user.click(day)
  expect(screen.getByText(/Treino Extra/)).toBeInTheDocument()
  expect(screen.queryByText('Descanso')).not.toBeInTheDocument()
})

test('editar medidas abre o formulário com os valores do dia', async () => {
  await save('measurements', [{ id: 'm', date: '2026-11-10', weightKg: 80 }])
  const user = userEvent.setup()
  await renderLoaded(<HistoryScreen onClose={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: '10' }))
  await user.click(screen.getByRole('button', { name: 'Editar medidas' }))
  expect(await screen.findByText('Registrar · 10 nov')).toBeInTheDocument()
  expect(screen.getByDisplayValue('80')).toBeInTheDocument()
})
test('apagar uma foto só mantém as outras do dia', async () => {
  const [a, b] = [await savePhoto('data:image/jpeg;base64,AAA'), await savePhoto('data:image/jpeg;base64,BBB')]
  await save('photoSets', [{ id: 's', date: '2026-11-17', frente: a, lado: b }])
  const user = userEvent.setup()
  await renderLoaded(<HistoryScreen onClose={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: '17' }))
  await user.click(screen.getByRole('button', { name: 'Apagar foto de frente' }))
  expect(await screen.findByText('Apagar foto de frente?')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Apagar' }))
  await waitFor(async () => expect(await stored('photoSets')).toEqual([{ id: 's', date: '2026-11-17', lado: b }]))
})
test('ângulo vazio abre a câmera daquele dia; voltar mantém o dia selecionado', async () => {
  await save('photoSets', [{ id: 's', date: '2026-11-10', frente: await savePhoto('data:image/jpeg;base64,AAA') }])
  const user = userEvent.setup()
  await renderLoaded(<HistoryScreen onClose={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: '10' }))
  expect(screen.getByRole('button', { name: 'Trocar foto de frente' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Adicionar foto de costas' }))
  expect(await screen.findByText('Fotos · 10 nov')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(await screen.findByRole('button', { name: 'Apagar fotos' })).toBeInTheDocument()
})
