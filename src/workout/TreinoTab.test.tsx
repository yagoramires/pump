import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as idb from 'idb-keyval'
import { save } from '@/storage/db'
import type { SetDone, WorkoutLog, WorkoutPlan } from './types'
import { pe } from '../../test/helpers'
import { renderLoaded } from '../../test/render'
import { seedStore, stored } from '../../test/store'
import { TreinoTab } from './TreinoTab'
import { Toaster } from '@/components/ui/sonner'
import { restRecord } from './rest'
import { startSession, startRest } from './session'
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
  vi.useFakeTimers({ toFake: ['Date'] }) // só o relógio; IndexedDB/findBy/user-event seguem com timers reais
  vi.setSystemTime(new Date(2026, 10, 16, 18, 0)) // segunda
  await save('workoutPlan', plano)
})
afterEach(() => vi.useRealTimers())

test('marcar série inicia descanso e persiste; concluir grava check-in', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  expect(await screen.findByText('01:00')).toBeInTheDocument()
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '10', weightKg: 40 }))
  await user.click(screen.getByRole('button', { name: 'Concluir treino' }))
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].completedAt).toBeDefined())
})
test('ao expandir, usa e grava as repetições planejadas de cada série', async () => {
  const workout = plano.workouts[0]
  const sequence = pe({ ...workout.exercises[0], sets: 3, reps: '15-12-10' })
  const range = pe({ ...workout.exercises[1], sets: 4, reps: '12-10' })
  await save('workoutPlan', { workouts: [{ ...workout, exercises: [sequence, range] }] })
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)

  expect(await screen.findByRole('textbox', { name: 'Reps da série 1 de Supino reto' })).toHaveValue('15')
  expect(screen.getByRole('textbox', { name: 'Reps da série 2 de Supino reto' })).toHaveValue('12')
  expect(screen.getByRole('textbox', { name: 'Reps da série 3 de Supino reto' })).toHaveValue('10')
  await user.click(screen.getByRole('checkbox', { name: 'Série 2 de Supino reto' }))
  expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].sets[1]?.reps).toBe('12')

  await user.click(screen.getByRole('button', { name: /Remada X.*4 ×/ }))
  expect(screen.getByRole('textbox', { name: 'Reps da série 1 de Remada X' })).toHaveValue('12-10')
  expect(screen.getByRole('textbox', { name: 'Reps da série 4 de Remada X' })).toHaveValue('12-10')
})
test('descanso sobrevive a recarregar: restante calculado do relógio', async () => {
  const user = userEvent.setup()
  const { unmount } = await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => {
    expect((await stored('workoutLog'))?.['2026-11-16']).toBeDefined()
  })
  unmount()
  await seedStore({})
  vi.setSystemTime(new Date(2026, 10, 16, 18, 0, 30))
  await renderLoaded(<TreinoTab />)
  expect(await screen.findByText('00:30')).toBeInTheDocument()
})
test('editar o plano no meio do treino não muda o que está na tela', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
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
  await user.click(screen.getByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '10', weightKg: 45 }))
  const reps = screen.getByRole('textbox', { name: 'Reps da série 1 de Supino reto' })
  await user.clear(reps); await user.type(reps, '8{Enter}')
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '8', weightKg: 45 }))
  await user.clear(kg); await user.type(kg, 'abc'); await user.tab()
  expect(kg).toHaveValue('45')
  expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '8', weightKg: 45 })
})

const sessaoAnterior = (sets: (SetDone | null)[]): WorkoutLog => ({
  '2026-11-09': { date: '2026-11-09', workoutId: 'outro', workoutLabel: 'C', workoutName: 'Outro', completedAt: '2026-11-09T19:00:00.000Z',
    exercises: [{ ...pe({ exerciseId: 'Supino', name: 'Supino reto', weightKg: 40 }), sets }] },
})
test('carga começa com a do último treino, série por série; sem série anterior usa o plano', async () => {
  await save('workoutLog', sessaoAnterior([{ reps: '10', weightKg: 50 }]))
  await renderLoaded(<TreinoTab />)
  expect(await screen.findByRole('textbox', { name: 'Carga da série 1 de Supino reto' })).toHaveValue('50')
  expect(screen.getByRole('textbox', { name: 'Carga da série 2 de Supino reto' })).toHaveValue('40')
})
test('resumo do exercício fechado mostra a última carga usada', async () => {
  await save('workoutLog', sessaoAnterior([{ reps: '10', weightKg: 50 }]))
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: /^Supino reto/ }))
  expect(await screen.findByText(/× .* · 50 kg/)).toBeInTheDocument()
})
test('marcar sem digitar grava a carga do último treino', async () => {
  const user = userEvent.setup()
  await save('workoutLog', sessaoAnterior([{ reps: '10', weightKg: 50 }]))
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '10', weightKg: 50 }))
})
test('treino em andamento passa da meia-noite e segue no mesmo dia ao voltar', async () => {
  vi.setSystemTime(new Date(2026, 10, 16, 20, 0))
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16']).toBeDefined())
  vi.setSystemTime(new Date(2026, 10, 17, 0, 30))
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(screen.getByRole('heading', { name: 'Peito e tríceps' })).toBeInTheDocument()
})
test('check recém-feito, ainda gravando, segura o dia ao voltar depois da meia-noite', async () => {
  vi.setSystemTime(new Date(2026, 10, 16, 20, 0))
  await renderLoaded(<TreinoTab />)
  const s1 = await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' })
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
  await user.click(screen.getByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '10', weightKg: 22.5 }))
})
test('dois checks rápidos em séries diferentes persistem os dois', async () => {
  await renderLoaded(<TreinoTab />)
  const s1 = await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' })
  const s2 = screen.getByRole('checkbox', { name: 'Série 2 de Supino reto' })
  await act(async () => { s1.click(); s2.click() })
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].sets.filter(Boolean)).toHaveLength(2))
})
test('exercício com 6 séries e nome longo mostra 6 linhas', async () => {
  await save('workoutPlan', { workouts: [{ ...plano.workouts[0], exercises: [pe({ name: 'Supino inclinado com halteres e pegada neutra no banco a 45 graus', sets: 6 })] }] })
  await renderLoaded(<TreinoTab />)
  for (let n = 1; n <= 6; n++) expect(await screen.findByRole('checkbox', { name: `Série ${n} de Supino inclinado com halteres e pegada neutra no banco a 45 graus` })).toBeInTheDocument()
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
  await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  await user.click(screen.getByRole('checkbox', { name: 'Série 2 de Supino reto' }))
  expect(await screen.findByRole('checkbox', { name: 'Série 1 de Remada X' })).toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: 'Série 1 de Supino reto' })).not.toBeInTheDocument()
})
test('dois toques rápidos na mesma série desmarcam e o segundo não reinicia o descanso', async () => {
  await renderLoaded(<TreinoTab />)
  const s1 = await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' })
  act(() => {
    s1.click() // marca às 18:00:00 -> descanso até 18:01:00
    vi.setSystemTime(new Date(2026, 10, 16, 18, 0, 30))
    s1.click() // desmarca: se reiniciasse, iria pra 18:01:30
  })
  expect(s1).not.toBeChecked()
  expect(await screen.findByText('00:30')).toBeInTheDocument()
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

test('desfazer no aviso devolve o treino aberto', async () => {
  const user = userEvent.setup()
  await renderLoaded(<><TreinoTab /><Toaster /></>)
  await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  await user.click(screen.getByRole('button', { name: 'Concluir treino' }))
  expect(screen.getByRole('button', { name: 'Treino concluído' })).toBeDisabled()
  await user.click(await screen.findByRole('button', { name: 'Desfazer' }))
  expect(await screen.findByRole('button', { name: 'Concluir treino' })).toBeEnabled()
})
test('carga acima de 500 kg numa série feita é rejeitada e mantém a anterior', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  const kg = await screen.findByLabelText('Carga da série 1 de Supino reto')
  await user.clear(kg)
  await user.type(kg, '4045')
  await user.tab()
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]?.weightKg).toBe(40))
})
test('cardio fica num bloco à parte, só com a duração, e marca feito sem descanso', async () => {
  const user = userEvent.setup()
  await save('workoutPlan', { workouts: [{ ...plano.workouts[0], exercises: [pe({ exerciseId: 'esteira', name: 'Esteira', sets: 1, reps: '15 min', restSec: 90 }), ...plano.workouts[0].exercises] }] })
  await renderLoaded(<TreinoTab />)
  expect(await screen.findByText('Cardio')).toBeInTheDocument()
  expect(screen.getByText('15 min')).toBeInTheDocument()
  expect(screen.queryByText(/1 × 15 min/)).not.toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Série 1 de Supino reto' })).toBeInTheDocument()
  await user.click(screen.getByRole('checkbox', { name: 'Esteira feito' }))
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '15 min', weightKg: 0 }))
  expect(screen.queryByText('01:30')).not.toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Esteira feito' })).toBeChecked()
})
test('descansar hoje grava o registro e mostra Desfazer', async () => {
  const user = userEvent.setup()
  await renderLoaded(<><TreinoTab /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: 'Descansar hoje' }))
  expect(await screen.findByRole('heading', { name: 'Descanso marcado' })).toBeInTheDocument()
  expect(await within(screen.getByRole('region', { name: /Notifications/ })).findByText('Descanso marcado')).toBeInTheDocument()
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16']).toEqual({ date: '2026-11-16', workoutId: '', workoutLabel: '', workoutName: 'Descanso', exercises: [], rest: true }))
  expect(screen.getByRole('button', { name: /Peito e tríceps/ })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Desfazer' }))
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16']).toBeUndefined())
  expect(await screen.findByRole('button', { name: 'Descansar hoje' })).toBeInTheDocument()
})
test('iniciar treino depois de marcar descanso substitui o registro', async () => {
  await save('workoutLog', { '2026-11-16': restRecord('2026-11-16') })
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: /Peito e tríceps/ }))
  await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => {
    const s = (await stored('workoutLog'))?.['2026-11-16']
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

const wB = { id: 'b', label: 'B', name: 'Costas e bíceps', exercises: [pe({ exerciseId: 'Remada', name: 'Remada curvada', sets: 2, reps: '10', weightKg: 30, restSec: 60 })] }
const plano2: WorkoutPlan = { workouts: [plano.workouts[0], wB] }
const logOntem = (completedAt?: string) => ({
  '2026-11-15': { date: '2026-11-15', startedAt: new Date(2026, 10, 15, 18, 0).toISOString(), workoutId: 'a', workoutLabel: 'A', workoutName: 'Peito e tríceps', completedAt, exercises: [{ ...plano.workouts[0].exercises[0], sets: [{ reps: '10', weightKg: 40 }, null] }] },
})

test('abre no próximo treino da fila e Iniciar treino grava a sessão com startedAt', async () => {
  await save('workoutPlan', plano2)
  await save('workoutLog', { '2026-11-14': { ...logOntem('2026-11-14T20:00:00.000Z')['2026-11-15'], date: '2026-11-14' } })
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  expect(await screen.findByRole('heading', { name: 'Costas e bíceps' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Iniciar treino' }))
  await waitFor(async () => {
    const s = (await stored('workoutLog'))?.['2026-11-16']
    expect(s?.workoutId).toBe('b')
    expect(s?.startedAt).toBeDefined()
  })
  expect(screen.getByRole('button', { name: 'Concluir treino' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Descansar hoje' })).not.toBeInTheDocument()
})
test('trocar antes de iniciar só muda o treino mostrado', async () => {
  await save('workoutPlan', plano2)
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Trocar treino' }))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText('próximo')).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: /Costas e bíceps/ }))
  expect(await screen.findByRole('heading', { name: 'Costas e bíceps' })).toBeInTheDocument()
  expect(await stored('workoutLog')).toBeUndefined()
})
test('trocar depois de marcar pede confirmação e substitui a sessão', async () => {
  await save('workoutPlan', plano2)
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16']).toBeDefined())
  await user.click(screen.getByRole('button', { name: 'Trocar treino' }))
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /Costas e bíceps/ }))
  expect(await screen.findByText('As séries marcadas hoje serão descartadas.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Trocar' }))
  expect(await screen.findByRole('heading', { name: 'Costas e bíceps' })).toBeInTheDocument()
  await waitFor(async () => {
    const s = (await stored('workoutLog'))?.['2026-11-16']
    expect(s?.workoutId).toBe('b')
    expect(s?.exercises[0].sets.filter(Boolean)).toHaveLength(0)
  })
})
test('treino de ontem sem concluir: Concluir grava naquele dia e a fila avança', async () => {
  await save('workoutPlan', plano2)
  await save('workoutLog', logOntem())
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  expect(await screen.findByText(`Treino A de ${formatDayLabel('2026-11-15')} ficou sem concluir`)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Peito e tríceps' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Concluir' }))
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-15'].completedAt).toBeDefined())
  expect(await screen.findByRole('heading', { name: 'Costas e bíceps' })).toBeInTheDocument()
  expect(screen.queryByText(/ficou sem concluir/)).not.toBeInTheDocument()
})
test('Descartar remove a sessão, a fila fica no mesmo treino e Desfazer restaura', async () => {
  await save('workoutPlan', plano2)
  await save('workoutLog', logOntem())
  const user = userEvent.setup()
  await renderLoaded(<><TreinoTab /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: 'Descartar' }))
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-15']).toBeUndefined())
  expect(screen.getByRole('heading', { name: 'Peito e tríceps' })).toBeInTheDocument()
  expect(await within(screen.getByRole('region', { name: /Notifications/ })).findByText('Treino descartado')).toBeInTheDocument()
  await user.click(await screen.findByRole('button', { name: 'Desfazer' }))
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-15']).toBeDefined())
})
test('treino de hoje em andamento que passa da meia-noite não vira cartão de sem concluir', async () => {
  vi.setSystemTime(new Date(2026, 10, 16, 20, 0))
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16']).toBeDefined())
  vi.setSystemTime(new Date(2026, 10, 17, 0, 30))
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(screen.queryByText(/ficou sem concluir/)).not.toBeInTheDocument()
})
test('link Treinos anteriores abre e fecha a lista', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: /Treinos anteriores/ }))
  expect(screen.getByText('Nenhum treino concluído ainda')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(await screen.findByRole('button', { name: 'Iniciar treino' })).toBeInTheDocument()
})
test('sessão iniciada sem séries às 23h não segura o dia: de manhã mostra o próximo treino de hoje', async () => {
  await save('workoutPlan', plano2)
  vi.setSystemTime(new Date(2026, 10, 16, 23, 0))
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Iniciar treino' }))
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16']).toBeDefined())
  vi.setSystemTime(new Date(2026, 10, 17, 7, 0))
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(await screen.findByText(new RegExp(formatDayLabel('2026-11-17')))).toBeInTheDocument()
  expect(screen.queryByText(/ficou sem concluir/)).not.toBeInTheDocument()
})
test('sessão com séries iniciada há mais de 6h vira o dia e aparece o cartão', async () => {
  vi.setSystemTime(new Date(2026, 10, 16, 20, 0))
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16']).toBeDefined())
  vi.setSystemTime(new Date(2026, 10, 17, 6, 30))
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(await screen.findByText(`Treino A de ${formatDayLabel('2026-11-16')} ficou sem concluir`)).toBeInTheDocument()
})
test('Concluir treino fica desabilitado sem série marcada', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Iniciar treino' }))
  expect(await screen.findByRole('button', { name: 'Concluir treino' })).toBeDisabled()
})
test('dia de descanso também mostra o cartão de treino sem concluir', async () => {
  await save('workoutPlan', plano2)
  await save('workoutLog', { ...logOntem(), '2026-11-16': restRecord('2026-11-16') })
  await renderLoaded(<TreinoTab />)
  expect(await screen.findByText('Descanso marcado')).toBeInTheDocument()
  expect(screen.getByText(`Treino A de ${formatDayLabel('2026-11-15')} ficou sem concluir`)).toBeInTheDocument()
})
test('Concluir do cartão avisa e Desfazer restaura a sessão aberta', async () => {
  await save('workoutPlan', plano2)
  await save('workoutLog', logOntem())
  const user = userEvent.setup()
  await renderLoaded(<><TreinoTab /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: 'Concluir' }))
  expect(await within(screen.getByRole('region', { name: /Notifications/ })).findByText('Treino concluído')).toBeInTheDocument()
  await user.click(await screen.findByRole('button', { name: 'Desfazer' }))
  await waitFor(async () => {
    const s = (await stored('workoutLog'))?.['2026-11-15']
    expect(s?.completedAt).toBeUndefined()
    expect(s?.startedAt).toBeDefined()
  })
})

describe('descanso: pausar e definir tempo', () => {
  const marcar = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
    await screen.findByText('01:00')
  }
  test('pausar congela o tempo, continuar retoma e sobrevive a recarregar', async () => {
    const user = userEvent.setup()
    const { unmount } = await renderLoaded(<TreinoTab />)
    await marcar(user)
    vi.setSystemTime(new Date(2026, 10, 16, 18, 0, 20))
    await user.click(screen.getByRole('button', { name: 'Pausar descanso' }))
    expect(await screen.findByText('00:40')).toBeInTheDocument()
    unmount()
    await seedStore({})
    vi.setSystemTime(new Date(2026, 10, 16, 19, 0, 0))
    await renderLoaded(<TreinoTab />)
    expect(await screen.findByText('00:40')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continuar descanso' }))
    vi.setSystemTime(new Date(2026, 10, 16, 19, 0, 10))
    expect(await screen.findByText('00:30')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pausar descanso' })).toBeInTheDocument()
  })
  test('+15 s com o descanso pausado soma ao restante', async () => {
    const user = userEvent.setup()
    await renderLoaded(<TreinoTab />)
    await marcar(user)
    await user.click(screen.getByRole('button', { name: 'Pausar descanso' }))
    await user.click(screen.getByRole('button', { name: '+15 s' }))
    expect(await screen.findByText('01:15')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar descanso' })).toBeInTheDocument()
  })
  test('escolher 2 min reinicia o descanso e grava no exercício da sessão e do plano', async () => {
    const user = userEvent.setup()
    await renderLoaded(<TreinoTab />)
    await marcar(user)
    await user.click(screen.getByRole('button', { name: 'Definir tempo de descanso' }))
    await user.click(await screen.findByRole('radio', { name: '2 min' }))
    expect(await screen.findByText('02:00')).toBeInTheDocument()
    expect(screen.getByText('de 2:00')).toBeInTheDocument()
    await waitFor(async () => {
      expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].restSec).toBe(120)
      expect((await stored('workoutPlan'))?.workouts[0].exercises[0].restSec).toBe(120)
    })
  })
  test('depois de recarregar, o tempo escolhido vai pro exercício do descanso, não pro próximo a fazer', async () => {
    const user = userEvent.setup()
    const { unmount } = await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('button', { name: /^Remada X/ }))
    await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Remada X' }))
    await user.click(screen.getByRole('button', { name: /^Supino reto/ }))
    await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
    await user.click(screen.getByRole('checkbox', { name: 'Série 2 de Supino reto' })) // supino completo: o próximo a fazer passa a ser a remada
    await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].sets[1]).not.toBeNull())
    unmount()
    await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('button', { name: 'Definir tempo de descanso' }))
    await user.click(await screen.findByRole('radio', { name: '2 min' }))
    await waitFor(async () => {
      expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].restSec).toBe(120)
      expect((await stored('workoutPlan'))?.workouts[0].exercises[0].restSec).toBe(120)
    })
  })
  const seed = async (idx: number, ms = 60_000, reorder = false) => {
    const w = reorder ? { ...plano.workouts[0], exercises: [...plano.workouts[0].exercises].reverse() } : plano.workouts[0]
    await save('workoutLog', { '2026-11-16': startRest(startSession(w, '2026-11-16'), idx, ms, Date.now()) })
  }
  test('tempo escolhido grava no exercício do plano por id, mesmo com o plano reordenado depois de iniciar', async () => {
    const user = userEvent.setup()
    await seed(1, 60_000, true) // sessão: [Remada X, Supino]; plano: [Supino, Remada X]
    await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('button', { name: 'Definir tempo de descanso' }))
    await user.click(await screen.findByRole('radio', { name: '2 min' }))
    await waitFor(async () => {
      const ex = (await stored('workoutPlan'))!.workouts[0].exercises
      expect(ex.find((e) => e.exerciseId === 'Supino')?.restSec).toBe(120)
      expect(ex.find((e) => e.exerciseId === 'custom-1')?.restSec).not.toBe(120)
    })
  })
  test('tocar no tempo já marcado reinicia o descanso com ele e fecha o seletor', async () => {
    const user = userEvent.setup()
    await seed(0)
    await renderLoaded(<TreinoTab />)
    vi.setSystemTime(new Date(2026, 10, 16, 18, 0, 20))
    expect(await screen.findByText('00:40')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Definir tempo de descanso' }))
    await user.click(await screen.findByRole('radio', { name: '60 s' }))
    expect(await screen.findByText('01:00')).toBeInTheDocument()
    // O jsdom não encerra a animação que desmonta o seletor.
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('data-state', 'closed')
  })
  test('seletor aberto sobrevive ao fim do descanso; escolher depois inicia novo descanso e grava', async () => {
    const user = userEvent.setup()
    await seed(0, 2_000)
    await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('button', { name: 'Definir tempo de descanso' }))
    await screen.findByRole('radio', { name: '2 min' })
    vi.setSystemTime(new Date(2026, 10, 16, 18, 0, 30))
    // o Drawer aberto esconde o resto da árvore de a11y: hidden pra enxergar o cartão sumir
    await waitFor(() => expect(screen.queryByRole('timer', { hidden: true })).not.toBeInTheDocument())
    await user.click(await screen.findByRole('radio', { name: '2 min' }))
    expect(await screen.findByText('02:00')).toBeInTheDocument()
    await waitFor(async () => expect((await stored('workoutPlan'))?.workouts[0].exercises[0].restSec).toBe(120))
  })
})
