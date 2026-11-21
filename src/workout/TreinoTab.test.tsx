import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as idb from 'idb-keyval'
import { save } from '@/storage/db'
import type { SetDone, WorkoutLog, WorkoutPlan } from './types'
import { ex, pe } from '../../test/helpers'
import { renderLoaded } from '../../test/render'
import { seedStore, stored } from '../../test/store'
import { TreinoTab } from './TreinoTab'
import { Toaster } from '@/components/ui/sonner'
import { restRecord } from './rest'
import { setDone, startSession, startRest } from './session'
import { formatDayLabel } from '@/lib/date'
import { fetchExercises } from '@/catalog/catalog'
import { addExtraExercise, startExtra } from './extra'

vi.mock('idb-keyval', async (orig) => {
  const m = await orig<typeof import('idb-keyval')>()
  return { ...m, set: vi.fn(m.set) }
})
vi.mock('@/catalog/catalog', async (orig) => ({ ...(await orig<typeof import('@/catalog/catalog')>()), fetchExercises: vi.fn() }))

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
  await user.click(await screen.findByRole('button', { name: 'Pular' }))
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
test('reps editadas no último treino não passam pro próximo: volta às do plano', async () => {
  await save('workoutLog', sessaoAnterior([{ reps: '6', weightKg: 50 }]))
  await renderLoaded(<TreinoTab />)
  expect(await screen.findByRole('textbox', { name: 'Reps da série 1 de Supino reto' })).toHaveValue('10')
  expect((await stored('workoutPlan'))?.workouts[0].exercises[0].reps).toBe('10')
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
  expect(screen.getByText(new RegExp(formatDayLabel('2026-11-16')))).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Série 1 de Supino reto' })).toBeChecked()
})
test('check recém-feito, ainda gravando, segura o dia ao voltar depois da meia-noite', async () => {
  vi.setSystemTime(new Date(2026, 10, 16, 20, 0))
  await renderLoaded(<TreinoTab />)
  const s1 = await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' })
  vi.mocked(idb.set).mockReturnValueOnce(new Promise(() => {})) // a gravação no IndexedDB nunca termina
  await act(async () => s1.click())
  vi.setSystemTime(new Date(2026, 10, 17, 0, 30))
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(screen.getByText(new RegExp(formatDayLabel('2026-11-16')))).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Série 1 de Supino reto' })).toBeChecked()
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
test('resumo: 1/2 séries sem volume; sessão antiga sem startedAt não mostra minutos', async () => {
  await save('workoutLog', { '2026-11-16': { date: '2026-11-16', workoutId: 'a', workoutLabel: 'A', workoutName: 'Peito e tríceps', exercises: [{ ...plano.workouts[0].exercises[0], sets: [{ reps: '10', weightKg: 40 }, null] }] } })
  await renderLoaded(<TreinoTab />)
  expect(await screen.findByText('Peito e tríceps')).toBeInTheDocument()
  expect(screen.queryByText(/subindo até agora/)).not.toBeInTheDocument()
  expect(screen.queryByText('Volume de hoje')).not.toBeInTheDocument()
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
test('pular série pelo teclado grava, risca a linha e com a outra marcada abre o próximo exercício', async () => {
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  act(() => screen.getByRole('button', { name: 'Pular série 2 de Supino reto' }).focus())
  await user.keyboard('{Enter}')
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].skipped).toEqual([1]))
  expect(screen.getByRole('textbox', { name: 'Carga da série 2 de Supino reto' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Desfazer pular série 2 de Supino reto' })).toBeInTheDocument()
  await user.click(screen.getByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  expect(await screen.findByRole('checkbox', { name: 'Série 1 de Remada X' })).toBeInTheDocument()
})
test('arrastar a linha pro lado pula a série; arrastar de novo desfaz; arrastar a partir do campo não pula', async () => {
  await renderLoaded(<TreinoTab />)
  const row = (await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' })).closest('tr')!
  const kg = screen.getByRole('textbox', { name: 'Carga da série 1 de Supino reto' })
  Object.defineProperty(row, 'offsetWidth', { value: 300 })
  row.setPointerCapture = vi.fn()
  const swipe = (to: number, from: Element = row) => {
    fireEvent.pointerDown(from, { clientX: 200, clientY: 10, pointerId: 1 })
    fireEvent.pointerMove(from, { clientX: to, clientY: 12, pointerId: 1, buttons: 1 })
    fireEvent.pointerUp(from, { clientX: to, clientY: 12, pointerId: 1 })
  }
  swipe(150) // menos de 1/3 da largura: não pula
  swipe(50, kg) // seleção/cursor no campo
  expect(screen.getByRole('button', { name: 'Pular série 1 de Supino reto' })).toBeInTheDocument()
  fireEvent.change(kg, { target: { value: '55' } })
  swipe(50)
  expect(await screen.findByRole('button', { name: 'Desfazer pular série 1 de Supino reto' })).toBeInTheDocument()
  swipe(50)
  expect(await screen.findByRole('button', { name: 'Pular série 1 de Supino reto' })).toBeInTheDocument()
  expect(kg).toHaveValue('40') // o 55 digitado antes de pular não volta
})
test('arraste que perdeu o pointerup não volta no hover nem pula a série', async () => {
  await renderLoaded(<TreinoTab />)
  const row = (await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' })).closest('tr')!
  Object.defineProperty(row, 'offsetWidth', { value: 300 })
  // botão solto fora da linha: o move seguinte chega sem botão apertado
  fireEvent.pointerDown(row, { clientX: 200, clientY: 10, pointerId: 1 })
  fireEvent.pointerMove(row, { clientX: 50, clientY: 12, pointerId: 1, buttons: 0 })
  fireEvent.pointerUp(row, { clientX: 50, clientY: 12, pointerId: 1 })
  // saiu da linha sem captura e voltou com o botão apertado: não continua o arraste antigo
  fireEvent.pointerDown(row, { clientX: 200, clientY: 10, pointerId: 1 })
  fireEvent.pointerLeave(row, { pointerId: 1 })
  fireEvent.pointerMove(row, { clientX: 50, clientY: 12, pointerId: 1, buttons: 1 })
  fireEvent.pointerUp(row, { clientX: 50, clientY: 12, pointerId: 1 })
  expect(screen.getByRole('button', { name: 'Pular série 1 de Supino reto' })).toBeInTheDocument()
  expect(await stored('workoutLog')).toBeUndefined()
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

test('desfazer no aviso devolve o treino aberto', async () => {
  const user = userEvent.setup()
  await renderLoaded(<><TreinoTab /><Toaster /></>)
  await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
  await user.click(screen.getByRole('button', { name: 'Concluir treino' }))
  await user.click(await screen.findByRole('button', { name: 'Pular' }))
  expect(await screen.findByRole('button', { name: 'Editar séries' })).toBeInTheDocument()
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

describe('resumo do treino concluído', () => {
  const hoje = (completedAt?: string) => ({ ...logOntem(completedAt)['2026-11-15'], date: '2026-11-16', startedAt: new Date(2026, 10, 16, 17, 0).toISOString(),
    exercises: [{ ...plano.workouts[0].exercises[0], sets: [{ reps: '10', weightKg: 45 }, { reps: '10', weightKg: 45 }] }] })
  test('concluir troca a lista pelo resumo; Editar séries reabre', async () => {
    await save('workoutPlan', plano2)
    await save('workoutLog', { ...logOntem('2026-11-15T20:00:00.000Z'), '2026-11-16': hoje() })
    const user = userEvent.setup()
    await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('button', { name: 'Concluir treino' }))
    await user.click(await screen.findByRole('button', { name: 'Pular' }))
    expect(await screen.findByText('Treino concluído')).toBeInTheDocument()
    expect(screen.getByText('↑ 1 · = 0 · ↓ 0')).toBeInTheDocument()
    expect(screen.getByText('↑ 45 × 10 (antes 40 × 10)')).toBeInTheDocument()
    expect(screen.queryByText(/de volume em relação/)).not.toBeInTheDocument()
    expect(screen.getByText('Recordes · 1')).toBeInTheDocument()
    expect(screen.getByText('antes 40 kg')).toBeInTheDocument()
    expect(screen.getByText(/^B · /)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Série 1 de Supino reto/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Editar séries' }))
    // todas as séries feitas: nenhum card abre sozinho, mas a lista volta
    expect(await screen.findByRole('button', { name: /^Supino reto/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Concluir treino' })).toBeEnabled()
    await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].completedAt).toBeUndefined())
  })
  test('resumo sem treino anterior não mostra comparação nem recordes', async () => {
    await save('workoutPlan', plano2)
    await save('workoutLog', { '2026-11-16': hoje('2026-11-16T20:00:00.000Z') })
    await renderLoaded(<TreinoTab />)
    expect(await screen.findByText('Treino concluído')).toBeInTheDocument()
    expect(screen.queryByText(/antes/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Recordes/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar séries' })).toBeInTheDocument()
  })
  test('concluir pede o esforço: 8 grava e o resumo mostra nota e esforço; tocar na linha troca pra 6', async () => {
    await save('workoutPlan', plano2)
    await save('workoutLog', { ...logOntem('2026-11-15T20:00:00.000Z'), '2026-11-16': hoje() })
    const user = userEvent.setup()
    await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('button', { name: 'Concluir treino' }))
    expect(await screen.findByText('Quão pesado foi?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Esforço 8' }))
    await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16']).toMatchObject({ effort: 8, completedAt: expect.any(String) }))
    expect(await screen.findByText('Nota')).toBeInTheDocument()
    expect(screen.getByText('9,4')).toBeInTheDocument() // 0,7 × 10 + 0,3 × 8
    await user.click(screen.getByRole('button', { name: 'Esforço 8 · pesado' }))
    expect(screen.queryByRole('button', { name: 'Pular' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Esforço 6' }))
    await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].effort).toBe(6))
    expect(await screen.findByRole('button', { name: 'Esforço 6 · moderado' })).toBeInTheDocument()
  })
  test('reconcluir depois de Editar séries mantém o esforço, sem pedir de novo', async () => {
    await save('workoutPlan', plano2)
    await save('workoutLog', { ...logOntem('2026-11-15T20:00:00.000Z'), '2026-11-16': hoje() })
    const user = userEvent.setup()
    await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('button', { name: 'Concluir treino' }))
    await user.click(await screen.findByRole('button', { name: 'Esforço 8' }))
    await user.click(await screen.findByRole('button', { name: 'Editar séries' }))
    await user.click(await screen.findByRole('button', { name: 'Concluir treino' }))
    expect(screen.queryByText('Quão pesado foi?')).not.toBeInTheDocument()
    await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16']).toMatchObject({ effort: 8, completedAt: expect.any(String) }))
  })
  test('Pular conclui sem esforço', async () => {
    await save('workoutLog', { '2026-11-16': hoje() })
    const user = userEvent.setup()
    await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('button', { name: 'Concluir treino' }))
    await user.click(await screen.findByRole('button', { name: 'Pular' }))
    await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].completedAt).toBeDefined())
    expect((await stored('workoutLog'))?.['2026-11-16'].effort).toBeUndefined()
    expect(await screen.findByRole('button', { name: 'Sem esforço registrado' })).toBeInTheDocument()
  })
  test('durante o treino mostra os exercícios subindo no lugar do volume', async () => {
    await save('workoutLog', { ...logOntem('2026-11-15T20:00:00.000Z'), '2026-11-16': hoje() })
    await renderLoaded(<TreinoTab />)
    expect(await screen.findByText('↑ 1 subindo até agora')).toBeInTheDocument()
    expect(screen.queryByText('Volume de hoje')).not.toBeInTheDocument()
  })
})

describe('treino extra', () => {
  const remada = ex('Remada', { muscles: ['dorsais'] })
  /** extra do dia com uma Remada de 1 série; `marcada` grava a série */
  const extraDe = (date: string, { marcada = false, completedAt }: { marcada?: boolean; completedAt?: string } = {}) => {
    const s = addExtraExercise(startExtra(date, new Date(2026, 10, 16, 17, 0)), remada, 1)
    return { ...(marcada ? setDone(s, 0, 0, { reps: '10', weightKg: 20 }) : s), completedAt }
  }

  test('adicionar exercício, marcar e concluir grava só no extraLog e volta pra ficha', async () => {
    vi.mocked(fetchExercises).mockResolvedValue([remada])
    const user = userEvent.setup()
    await renderLoaded(<><TreinoTab /><Toaster /></>)
    await user.click(await screen.findByRole('button', { name: 'Treino extra' }))
    expect(await screen.findByRole('heading', { name: 'Treino extra' })).toBeInTheDocument()
    expect(screen.getByText(`Treino extra · ${formatDayLabel('2026-11-16')}`)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Descansar hoje' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Adicionar exercício' }))
    await user.click(await screen.findByRole('button', { name: 'Adicionar Remada' }))
    await user.click(await screen.findByRole('button', { name: 'Adicionar' }))
    await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Remada' }))
    await user.click(screen.getByRole('button', { name: 'Concluir treino' }))
    await user.click(await screen.findByRole('button', { name: 'Esforço 7' }))
    await waitFor(async () => expect((await stored('extraLog'))?.['2026-11-16']).toMatchObject({ effort: 7, completedAt: expect.any(String) }))
    expect((await stored('workoutLog'))?.['2026-11-16']).toBeUndefined()
    expect(await screen.findByRole('heading', { name: 'Peito e tríceps' })).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: /Notifications/ })).findByText('Treino extra concluído')).toBeInTheDocument()
  })
  test('descartar o extra não mexe na série já marcada da ficha', async () => {
    const user = userEvent.setup()
    await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' }))
    await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toBeTruthy())
    await user.click(screen.getByRole('button', { name: 'Treino extra' }))
    await user.click(await screen.findByRole('button', { name: 'Descartar treino extra' }))
    await waitFor(async () => expect((await stored('extraLog'))?.['2026-11-16']).toBeUndefined())
    expect((await stored('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '10', weightKg: 40 })
    expect(await screen.findByRole('checkbox', { name: 'Série 1 de Supino reto' })).toBeChecked()
  })
  test('extra concluído não mexe na fila da ficha', async () => {
    await save('workoutPlan', plano2)
    await save('workoutLog', { '2026-11-14': { ...logOntem('2026-11-14T20:00:00.000Z')['2026-11-15'], date: '2026-11-14' } })
    await save('extraLog', { '2026-11-16': extraDe('2026-11-16', { marcada: true, completedAt: '2026-11-16T18:00:00.000Z' }) })
    await renderLoaded(<TreinoTab />)
    expect(await screen.findByRole('heading', { name: 'Costas e bíceps' })).toBeInTheDocument()
    expect(screen.getByText(/Treino extra concluído/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Treino extra' })).not.toBeInTheDocument()
  })
  test('no dia de descanso, Treino extra apaga o descanso e abre o extra', async () => {
    await save('workoutLog', { '2026-11-16': restRecord('2026-11-16') })
    const user = userEvent.setup()
    await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('button', { name: 'Treino extra' }))
    expect(await screen.findByRole('heading', { name: 'Treino extra' })).toBeInTheDocument()
    await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16']).toBeUndefined())
    expect((await stored('extraLog'))?.['2026-11-16'].workoutId).toBe('extra')
  })
  test('extra aberto no descanso: descartar devolve o descanso, direto ou pela confirmação', async () => {
    await save('workoutLog', { '2026-11-16': restRecord('2026-11-16') })
    const user = userEvent.setup()
    await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('button', { name: 'Treino extra' }))
    await waitFor(async () => expect((await stored('extraLog'))?.['2026-11-16'].fromRest).toBe(true))
    await user.click(await screen.findByRole('button', { name: 'Descartar treino extra' }))
    await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16']).toEqual(restRecord('2026-11-16')))
    expect((await stored('extraLog'))?.['2026-11-16']).toBeUndefined()
    expect(await screen.findByText('Descanso marcado')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Treino extra' }))
    await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16']).toBeUndefined())
    await act(() => save('extraLog', { '2026-11-16': { ...extraDe('2026-11-16', { marcada: true }), fromRest: true } }))
    await user.click(await screen.findByRole('button', { name: 'Descartar treino extra' }))
    await user.click(await screen.findByRole('button', { name: 'Descartar' }))
    await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-16']).toEqual(restRecord('2026-11-16')))
  })
  test('Editar séries do extra concluído reabre o extra', async () => {
    await save('extraLog', { '2026-11-16': extraDe('2026-11-16', { marcada: true, completedAt: '2026-11-16T18:00:00.000Z' }) })
    const user = userEvent.setup()
    await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('button', { name: 'Editar séries do treino extra' }))
    expect(await screen.findByRole('heading', { name: 'Treino extra' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Descartar treino extra' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Concluir treino' })).toBeEnabled()
    await waitFor(async () => expect((await stored('extraLog'))?.['2026-11-16'].completedAt).toBeUndefined())
  })
  test('extra de ontem sem concluir: Concluir grava no extraLog daquele dia', async () => {
    await save('extraLog', { '2026-11-15': extraDe('2026-11-15', { marcada: true }) })
    const user = userEvent.setup()
    await renderLoaded(<TreinoTab />)
    expect(await screen.findByText(`Treino Extra de ${formatDayLabel('2026-11-15')} ficou sem concluir`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Concluir' }))
    await waitFor(async () => expect((await stored('extraLog'))?.['2026-11-15'].completedAt).toBeDefined())
    expect(await stored('workoutLog')).toBeUndefined()
    expect(screen.queryByText(/ficou sem concluir/)).not.toBeInTheDocument()
  })
  test('Remover exercício tira o exercício do extra', async () => {
    await save('extraLog', { '2026-11-16': extraDe('2026-11-16') })
    const user = userEvent.setup()
    await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('button', { name: 'Remover exercício' }))
    await waitFor(async () => expect((await stored('extraLog'))?.['2026-11-16'].exercises).toHaveLength(0))
    expect(screen.queryByRole('checkbox', { name: 'Série 1 de Remada' })).not.toBeInTheDocument()
  })
  test('descartar extra com série marcada pede confirmação e não mexe na ficha', async () => {
    const ficha = { '2026-11-16': setDone(startSession(plano.workouts[0], '2026-11-16'), 0, 0, { reps: '10', weightKg: 40 }) }
    await save('workoutLog', ficha)
    await save('extraLog', { '2026-11-16': extraDe('2026-11-16', { marcada: true }) })
    const user = userEvent.setup()
    await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('button', { name: 'Descartar treino extra' }))
    expect(await screen.findByText('As séries marcadas serão perdidas.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    await waitFor(async () => expect((await stored('extraLog'))?.['2026-11-16']).toBeUndefined())
    expect(await stored('workoutLog')).toEqual(ficha)
  })
  test('Desfazer depois de concluir o extra reabre o extra', async () => {
    await save('extraLog', { '2026-11-16': extraDe('2026-11-16', { marcada: true }) })
    const user = userEvent.setup()
    await renderLoaded(<><TreinoTab /><Toaster /></>)
    await user.click(await screen.findByRole('button', { name: 'Concluir treino' }))
    await user.click(await screen.findByRole('button', { name: 'Pular' }))
    await waitFor(async () => expect((await stored('extraLog'))?.['2026-11-16'].completedAt).toBeDefined())
    await user.click(await screen.findByRole('button', { name: 'Desfazer' }))
    await waitFor(async () => expect((await stored('extraLog'))?.['2026-11-16'].completedAt).toBeUndefined())
    expect(await screen.findByRole('heading', { name: 'Treino extra' })).toBeInTheDocument()
  })
  test('cardio do extra tem botão de remover', async () => {
    const s = extraDe('2026-11-16')
    await save('extraLog', { '2026-11-16': { ...s, exercises: [{ ...s.exercises[0], name: 'Esteira', reps: '15 min' }] } })
    const user = userEvent.setup()
    await renderLoaded(<TreinoTab />)
    await user.click(await screen.findByRole('button', { name: 'Remover Esteira' }))
    await waitFor(async () => expect((await stored('extraLog'))?.['2026-11-16'].exercises).toHaveLength(0))
    expect(screen.queryByRole('checkbox', { name: 'Esteira feito' })).not.toBeInTheDocument()
  })
})

test('toca na duração do treino concluído e edita início e fim', async () => {
  await save('workoutLog', { '2026-11-16': { ...logOntem('2026-11-16T21:00:00.000Z')['2026-11-15'], date: '2026-11-16', startedAt: new Date(2026, 10, 16, 17, 0).toISOString() } })
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: /Duração/ }))
  for (const [nome, h, m] of [['Início', '18', '00'], ['Fim', '18', '45']]) {
    await user.click(screen.getByRole('button', { name: new RegExp(`^${nome}`) }))
    await user.click(screen.getByRole('radio', { name: `${h} h` }))
    await user.click(screen.getByRole('radio', { name: `${m} min` }))
  }
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(async () => {
    const s = (await stored('workoutLog'))?.['2026-11-16']
    expect([s?.startedAt, s?.endedAt]).toEqual([new Date(2026, 10, 16, 18, 0).toISOString(), new Date(2026, 10, 16, 18, 45).toISOString()])
  })
  expect(await screen.findByText('45')).toBeInTheDocument()
})
test('descartar extra esquecido aberto num dia de descanso devolve o descanso daquele dia', async () => {
  const extra = { ...logOntem()['2026-11-15'], workoutId: 'extra', workoutLabel: 'Extra', workoutName: 'Treino extra', fromRest: true }
  await save('extraLog', { '2026-11-15': extra })
  const user = userEvent.setup()
  await renderLoaded(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Descartar' }))
  await waitFor(async () => expect((await stored('extraLog'))?.['2026-11-15']).toBeUndefined())
  await waitFor(async () => expect((await stored('workoutLog'))?.['2026-11-15']?.rest).toBe(true))
})
