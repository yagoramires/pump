import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as idb from 'idb-keyval'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from '@/storage/db'
import type { WorkoutPlan } from './types'
import { pe } from '../../test/helpers'
import { renderLoaded } from '../../test/render'
import { TreinoTab } from './TreinoTab'
import { Toaster } from '@/components/ui/sonner'
import { restRecord } from './rest'
import { formatDayLabel } from '@/lib/date'

vi.mock('idb-keyval', async (orig) => {
  const m = await orig<typeof import('idb-keyval')>()
  return { ...m, set: vi.fn(m.set) }
})

const plano: WorkoutPlan = { workouts: [
  { id: 'a', label: 'A', name: 'Peito e tríceps', exercises: [
    pe({ exerciseId: 'Supino', name: 'Supino reto', sets: 2, reps: '10', weightKg: 40, restSec: 60, images: ['S/0.jpg', 'S/1.jpg'] }),
    pe({ exerciseId: 'custom-1', name: 'Remada X', custom: true, note: 'banco 3' }),
  ] },
] }
beforeEach(async () => {
  await clear()
  resetStoreForTests()
  vi.useFakeTimers({ toFake: ['Date'] }) // só o relógio; IndexedDB/findBy/user-event seguem com timers reais
  vi.setSystemTime(new Date(2026, 10, 16, 18, 0)) // segunda
  await save('workoutPlan', plano)
})
afterEach(() => vi.useRealTimers())

test('marcar série inicia descanso e persiste; concluir grava check-in', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  expect(await screen.findByText('01:00')).toBeInTheDocument()
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '10', weightKg: 40 }))
  await user.click(screen.getByRole('button', { name: 'Concluir treino' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].completedAt).toBeDefined())
})
test('descanso sobrevive a recarregar: restante calculado do relógio', async () => {
  const user = userEvent.setup()
  const { unmount } = await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].restEndsAt).toBeDefined())
  unmount()
  vi.setSystemTime(new Date(2026, 10, 16, 18, 0, 30))
  await renderLoaded(<TreinoTab />)
  expect(await screen.findByText('00:30')).toBeInTheDocument()
})
test('editar o plano no meio do treino não muda o que está na tela', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  await act(() => save('workoutPlan', { workouts: [{ ...plano.workouts[0], exercises: [pe({ name: 'Outro', reps: '5' })] }] }))
  expect(await screen.findByText('Remada X')).toBeInTheDocument()
  expect(screen.getByText('3 × 10 · 0 kg')).toBeInTheDocument()
  expect(screen.queryByText('Outro')).not.toBeInTheDocument()
})
test('exercício sem foto: ícone na miniatura e preview só com texto', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  const thumb = await screen.findByRole('button', { name: 'Ver Remada X' })
  expect(within(thumb).queryByRole('img')).not.toBeInTheDocument()
  await user.click(thumb)
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText('banco 3')).toBeInTheDocument()
  expect(within(dialog).queryByRole('img')).not.toBeInTheDocument()
})
test('editar carga inline e marcar; editar série feita grava a partir da guardada', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  const kg = await screen.findByRole('textbox', { name: 'Carga da série 1 de Supino reto' })
  await user.clear(kg); await user.type(kg, '45')
  await user.click(screen.getByRole('button', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '10', weightKg: 45 }))
  const reps = screen.getByRole('textbox', { name: 'Reps da série 1 de Supino reto' })
  await user.clear(reps); await user.type(reps, '8{Enter}')
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '8', weightKg: 45 }))
  await user.clear(kg); await user.type(kg, 'abc'); await user.tab()
  expect(kg).toHaveValue('45')
  expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '8', weightKg: 45 })
})
test('treino em andamento passa da meia-noite e segue no mesmo dia ao voltar', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16']).toBeDefined())
  vi.setSystemTime(new Date(2026, 10, 17, 0, 30))
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(screen.getByRole('heading', { name: 'Peito e tríceps' })).toBeInTheDocument()
})
test('check recém-feito, ainda gravando, segura o dia ao voltar depois da meia-noite', async () => {
  await renderLoaded(<TreinoTab />)
  const s1 = await screen.findByRole('button', { name: 'Série 1 de Supino reto' })
  vi.mocked(idb.set).mockReturnValueOnce(new Promise(() => {})) // a gravação no IndexedDB nunca termina
  await act(async () => s1.click())
  vi.setSystemTime(new Date(2026, 10, 17, 0, 30))
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(screen.getByRole('heading', { name: 'Peito e tríceps' })).toBeInTheDocument()
})
test('carga com vírgula na tabela grava decimal', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  const kg = await screen.findByRole('textbox', { name: 'Carga da série 1 de Supino reto' })
  await user.clear(kg); await user.type(kg, '22,5')
  await user.click(screen.getByRole('button', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '10', weightKg: 22.5 }))
})
test('dois checks rápidos em séries diferentes persistem os dois', async () => {
  await renderLoaded(<TreinoTab />)
  const s1 = await screen.findByRole('button', { name: 'Série 1 de Supino reto' })
  const s2 = screen.getByRole('button', { name: 'Série 2 de Supino reto' })
  await act(async () => { s1.click(); s2.click() })
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets.filter(Boolean)).toHaveLength(2))
})
test('exercício com 6 séries e nome longo mostra 6 linhas', async () => {
  await save('workoutPlan', { workouts: [{ ...plano.workouts[0], exercises: [pe({ name: 'Supino inclinado com halteres e pegada neutra no banco a 45 graus', sets: 6 })] }] })
  await renderLoaded(<TreinoTab />)
  for (let n = 1; n <= 6; n++) expect(await screen.findByRole('button', { name: `Série ${n} de Supino inclinado com halteres e pegada neutra no banco a 45 graus` })).toBeInTheDocument()
})
test('resumo: 1/2 séries e volume; sessão antiga sem startedAt não mostra minutos', async () => {
  await save('workoutLog', { '2026-11-16': { date: '2026-11-16', workoutId: 'a', workoutLabel: 'A', workoutName: 'Peito e tríceps', exercises: [{ ...plano.workouts[0].exercises[0], sets: [{ reps: '10', weightKg: 40 }, null] }] } })
  await renderLoaded(<TreinoTab />)
  expect(await screen.findByText('400 kg')).toBeInTheDocument()
  expect(screen.getAllByText('1/2')).toHaveLength(2) // anel do resumo + card do exercício
  expect(screen.queryByText(/min/)).not.toBeInTheDocument()
})
test('completar o último set do aberto abre o próximo incompleto', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  await user.click(screen.getByRole('button', { name: 'Série 2 de Supino reto' }))
  expect(await screen.findByRole('button', { name: 'Série 1 de Remada X' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Série 1 de Supino reto' })).not.toBeInTheDocument()
})
test('dois toques rápidos na mesma série desmarcam e o segundo não reinicia o descanso', async () => {
  await renderLoaded(<TreinoTab />)
  const s1 = await screen.findByRole('button', { name: 'Série 1 de Supino reto' })
  act(() => {
    s1.click() // marca às 18:00:00 -> descanso até 18:01:00
    vi.setSystemTime(new Date(2026, 10, 16, 18, 0, 30))
    s1.click() // desmarca: se reiniciasse, iria pra 18:01:30
  })
  await waitFor(async () => {
    const s = (await load('workoutLog'))?.['2026-11-16']
    expect(s?.exercises[0].sets[0]).toBeNull()
    expect(s?.restEndsAt).toBe(new Date(2026, 10, 16, 18, 1, 0).getTime())
  })
  expect(s1).toHaveAttribute('aria-pressed', 'false')
})
test('preview fecha pelo botão Fechar', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Ver Supino reto' }))
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fechar' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})
test('volume do resumo separa milhar', async () => {
  await save('workoutLog', { '2026-11-16': { date: '2026-11-16', workoutId: 'a', workoutLabel: 'A', workoutName: 'Peito e tríceps', exercises: [{ ...plano.workouts[0].exercises[0], sets: [{ reps: '10', weightKg: 62 }, { reps: '10', weightKg: 62 }] }] } })
  await renderLoaded(<TreinoTab />)
  expect(await screen.findByText('1.240 kg')).toBeInTheDocument()
})

test('desfazer o toast de concluir limpa completedAt', async () => {
  const user = userEvent.setup()
  await renderLoaded(<><TreinoTab /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  await user.click(screen.getByRole('button', { name: 'Concluir treino' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].completedAt).toBeDefined())
  await user.click(await screen.findByRole('button', { name: 'Desfazer' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].completedAt).toBeUndefined())
})
test('carga acima de 500 kg numa série feita é rejeitada e mantém a anterior', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  const kg = await screen.findByLabelText('Carga da série 1 de Supino reto')
  await user.clear(kg)
  await user.type(kg, '4045')
  await user.tab()
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]?.weightKg).toBe(40))
})
test('cardio fica num bloco à parte, só com a duração, e marca feito sem descanso', async () => {
  const user = userEvent.setup()
  await save('workoutPlan', { workouts: [{ ...plano.workouts[0], exercises: [pe({ exerciseId: 'esteira', name: 'Esteira', sets: 1, reps: '15 min', restSec: 90 }), ...plano.workouts[0].exercises] }] })
  await renderLoaded(<TreinoTab />)
  expect(await screen.findByText('Cardio')).toBeInTheDocument()
  expect(screen.getByText('15 min')).toBeInTheDocument()
  expect(screen.queryByText(/1 × 15 min/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Série 1 de Supino reto' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Esteira feito' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '15 min', weightKg: 0 }))
  expect(screen.queryByText('01:30')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Esteira feito' })).toHaveAttribute('aria-pressed', 'true')
})
test('descansar hoje grava o registro e mostra Desfazer', async () => {
  const user = userEvent.setup()
  await renderLoaded(<><TreinoTab /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: 'Descansar hoje' }))
  expect(await screen.findByRole('heading', { name: 'Descanso marcado' })).toBeInTheDocument()
  expect(await within(screen.getByRole('region', { name: /Notifications/ })).findByText('Descanso marcado')).toBeInTheDocument()
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16']).toEqual({ date: '2026-11-16', workoutId: '', workoutLabel: '', workoutName: 'Descanso', exercises: [], rest: true }))
  expect(screen.getByRole('button', { name: /Peito e tríceps/ })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Desfazer' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16']).toBeUndefined())
  expect(await screen.findByRole('button', { name: 'Descansar hoje' })).toBeInTheDocument()
})
test('iniciar treino depois de marcar descanso substitui o registro', async () => {
  await save('workoutLog', { '2026-11-16': restRecord('2026-11-16') })
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: /Peito e tríceps/ }))
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => {
    const s = (await load('workoutLog'))?.['2026-11-16']
    expect(s?.rest).toBeUndefined()
    expect(s?.workoutId).toBe('a')
    expect(s?.exercises[0].sets[0]).toEqual({ reps: '10', weightKg: 40 })
  })
  expect(screen.queryByRole('button', { name: 'Descansar hoje' })).not.toBeInTheDocument()
})
test('sem treino em andamento, voltar do segundo plano num novo dia troca o dia', async () => {
  await renderLoaded(<TreinoTab />)
  await screen.findByRole('heading', { name: 'Peito e tríceps' })
  expect(screen.getByText(new RegExp(formatDayLabel('2026-11-16')))).toBeInTheDocument()
  vi.setSystemTime(new Date(2026, 10, 17, 7, 0))
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(await screen.findByText(new RegExp(formatDayLabel('2026-11-17')))).toBeInTheDocument()
  expect(screen.queryByText(new RegExp(formatDayLabel('2026-11-16')))).not.toBeInTheDocument()
})
