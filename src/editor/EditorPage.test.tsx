import { screen, within } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import { planWith, setupClipboard } from '../../test/helpers'
import { stored } from '../../test/store'
import type { DietPlan } from '@/diet/types'
import { memoryOnly } from '@/storage/db'
import { planFileText, readPlanFile } from '@/format/planFile'
import { EditorPage } from './EditorPage'

const workout = { ...planWith([{ name: 'Supino reto' }]), workouts: [{ ...planWith([{ name: 'Supino reto' }]).workouts[0], name: 'Peito' }] }
const diet = (name: string): DietPlan => ({ menus: [{ id: 'm', name, meals: [{ id: 'r', name: 'Almoço', time: '12:00', options: [{ id: 'o', items: [{ id: 'i', name: 'Arroz', grams: 100, per100: { kcal: 130, p: 2.5, c: 28, f: 0.2 }, source: 'ia' }] }] }] }] })
const fileOf = (text: string, name = 'pump-plano.json') => new File([text], name, { type: 'application/json' })
const offline = { exercises: async () => null, taco: async () => null }

beforeEach(() => {
  memoryOnly()
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})
afterEach(() => vi.unstubAllGlobals())

const open = async (user: ReturnType<typeof setupClipboard>['user'], text: string) =>
  user.upload(screen.getByLabelText('Arquivo do plano'), fileOf(text))

test('arquivo só de treino abre na aba Treino e a Dieta continua vazia', async () => {
  const { user } = setupClipboard()
  await renderLoaded(<EditorPage />)
  await open(user, planFileText({ workout }))
  expect(await screen.findByDisplayValue('Peito')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Dieta' }))
  expect(screen.getByText('Abra o arquivo exportado pelo Pump')).toBeInTheDocument()
})

test('com as duas abertas, um arquivo só de dieta troca só a dieta', async () => {
  const { user } = setupClipboard()
  await renderLoaded(<EditorPage />)
  await open(user, planFileText({ workout, diet: diet('Base') }))
  await screen.findByDisplayValue('Peito')
  await open(user, planFileText({ diet: diet('Novo') }))
  await user.click(screen.getByRole('tab', { name: 'Dieta' }))
  expect(await screen.findByDisplayValue('Novo')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Treino' }))
  expect(screen.getByDisplayValue('Peito')).toBeInTheDocument()
})

test('arquivo que não é do Pump mostra o problema', async () => {
  const { user } = setupClipboard()
  await renderLoaded(<EditorPage />)
  await open(user, 'oi')
  expect(await screen.findByText('Não encontrei um plano do Pump no arquivo')).toBeInTheDocument()
})

test('Copiar plano copia o arquivo com as metades abertas e a origem marcada', async () => {
  const { user, writeText } = setupClipboard()
  await renderLoaded(<EditorPage />)
  await open(user, planFileText({ workout, diet: diet('Base') }))
  await screen.findByDisplayValue('Peito')
  await user.click(screen.getByRole('button', { name: 'Copiar plano' }))
  const text = writeText.mock.calls[0][0]
  expect(JSON.parse(text)).toMatchObject({ origem: 'pump' })
  const back = await readPlanFile(text, offline)
  expect(back.workout?.workouts[0].name).toBe('Peito')
  expect(back.diet?.menus[0].name).toBe('Base')
})

test('exportar plano inválido mostra o problema e não copia', async () => {
  const { user, writeText } = setupClipboard()
  await renderLoaded(<EditorPage />)
  await open(user, planFileText({ workout }))
  await user.click(await screen.findByRole('button', { name: 'Novo treino' }))
  await user.click(screen.getByRole('button', { name: 'Copiar plano' }))
  expect(await screen.findByText('Treino B: adicione pelo menos um exercício')).toBeInTheDocument()
  expect(writeText).not.toHaveBeenCalled()
})

test('sair com mudança não exportada avisa; depois de copiar, não', async () => {
  const { user } = setupClipboard()
  await renderLoaded(<EditorPage />)
  await open(user, planFileText({ workout }))
  const leave = () => {
    const e = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(e)
    return e.defaultPrevented
  }
  expect(leave()).toBe(false)
  const sets = await screen.findByRole('textbox', { name: 'Séries de Supino reto' })
  await user.clear(sets)
  await user.type(sets, '5')
  expect(leave()).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Copiar plano' }))
  expect(leave()).toBe(false)
})

test('abrir outro arquivo por cima de mudança não exportada pede confirmação', async () => {
  const { user } = setupClipboard()
  await renderLoaded(<EditorPage />)
  await open(user, planFileText({ workout }))
  await user.click(await screen.findByRole('button', { name: 'Novo treino' }))
  await open(user, planFileText({ workout: { workouts: [{ ...workout.workouts[0], name: 'Costas' }] } }))
  await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Trocar' }))
  expect(await screen.findByDisplayValue('Costas')).toBeInTheDocument()
})

test('nada vai pro IndexedDB do aparelho', async () => {
  const { user } = setupClipboard()
  await renderLoaded(<EditorPage />)
  await open(user, planFileText({ workout }))
  await user.click(await screen.findByRole('button', { name: 'Novo treino' }))
  expect(await stored('workoutPlan')).toBeUndefined()
})
