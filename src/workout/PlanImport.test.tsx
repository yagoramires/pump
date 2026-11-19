import { screen } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import userEvent from '@testing-library/user-event'
import { get } from 'idb-keyval'
import { save } from '@/storage/db'
import { PlanImport } from './PlanImport'
import { buildConvertPrompt } from './prompt'

beforeEach(async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[]')))
})
afterEach(() => vi.unstubAllGlobals())

test('salvar sem catálogo mantém os exercícios no plano e preserva o catálogo pessoal', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
  const custom = { id: 'custom-1', name: 'Remada X', muscles: ['dorsais'] }
  await save('customExercises', [custom])
  const user = userEvent.setup()
  await renderLoaded(<PlanImport mode="convert" onDone={vi.fn()} onBack={vi.fn()} />)
  await user.click(screen.getByRole('textbox', { name: 'Resposta da IA' }))
  await user.paste(planJson([REMADA, { ...REMADA, nome: 'Supino novo' }]))
  await screen.findByText(/Catálogo indisponível/)
  await user.click(screen.getByRole('button', { name: 'Revisar plano' }))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))

  await vi.waitFor(async () => expect((await get('workoutPlan'))?.workouts[0].exercises).toMatchObject([
    { exerciseId: custom.id, name: custom.name },
    { name: 'Supino novo' },
  ]))
  expect(await get('customExercises')).toEqual([custom])
})

test('catálogo indisponível permite revisar e tentar buscar as prévias sem colar de novo', async () => {
  const catalog = [{ id: 'remada', name: 'Remada no cabo teste', muscles: ['dorsais'], equipment: '', images: ['Remada/0.jpg'], instructions: [] }]
  const fetchCatalog = vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(catalog)))
  vi.stubGlobal('fetch', fetchCatalog)
  const user = userEvent.setup()
  await renderLoaded(<PlanImport mode="ia" onDone={vi.fn()} onBack={vi.fn()} />)
  const text = planJson([{ ...REMADA, nome: catalog[0].name }])
  await user.click(screen.getByRole('textbox', { name: 'Resposta da IA' }))
  await user.paste(text)

  expect(await screen.findByText(/Catálogo indisponível/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Revisar plano' }))
  expect(screen.getByRole('heading', { name: 'Editar plano' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Ver prévia de Remada no cabo teste' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))

  await user.click(screen.getByRole('button', { name: 'Tentar carregar catálogo' }))
  expect(screen.getByRole('textbox', { name: 'Resposta da IA' })).toHaveValue(text)
  const review = screen.getByRole('button', { name: 'Revisar plano' })
  await vi.waitFor(() => expect(review).toBeEnabled())
  await user.click(review)
  expect(screen.getByRole('button', { name: 'Ver prévia de Remada no cabo teste' })).toBeInTheDocument()
})

test('colar JSON válido mostra o resumo sozinho e libera Revisar plano', async () => {
  const user = userEvent.setup()
  await renderLoaded(<PlanImport mode="ia" onDone={vi.fn()} onBack={vi.fn()} />)
  await user.click(await screen.findByRole('textbox', { name: 'Resposta da IA' }))
  await user.paste(JSON.stringify({ formato: 'pump-plano', versao: 1, treinos: [{ letra: 'A', nome: 'Peito', dias: ['seg'], exercicios: [{ nome: 'Remada X', series: 3, reps: '10' }] }] }))
  expect(await screen.findByText('1 treino · 1 exercício')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Revisar plano' })).toBeEnabled()
})

test('colar texto inválido mostra problemas e mantém Revisar plano desabilitado', async () => {
  const user = userEvent.setup()
  await renderLoaded(<PlanImport mode="ia" onDone={vi.fn()} onBack={vi.fn()} />)
  await user.click(await screen.findByRole('textbox', { name: 'Resposta da IA' }))
  await user.paste('oi')
  expect(await screen.findByText('Não encontrei um plano em JSON no texto')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Revisar plano' })).toBeDisabled()
})

test('anamnese fica salva no perfil e vai no prompt copiado', async () => {
  const user = userEvent.setup()
  const writeText = vi.fn<(text: string) => Promise<void>>(async () => {})
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  await renderLoaded(<PlanImport mode="ia" onDone={vi.fn()} onBack={vi.fn()} />)
  await user.click(await screen.findByRole('radio', { name: 'Em casa' }))
  await user.click(screen.getByRole('button', { name: 'Copiar' }))
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('- Onde treino: em casa, com pouco equipamento\n'))
  expect((await get('profile'))?.anamnesis).toEqual({ place: 'casa' })
})

test('Revisar plano abre o editor; Salvar grava o plano e os exercícios novos', async () => {
  const user = userEvent.setup()
  const onDone = vi.fn()
  await renderLoaded(<PlanImport mode="ia" onDone={onDone} onBack={vi.fn()} />)
  await user.click(await screen.findByRole('textbox', { name: 'Resposta da IA' }))
  await user.paste(JSON.stringify({ formato: 'pump-plano', versao: 1, treinos: [{ letra: 'A', nome: 'Peito', dias: ['seg'], exercicios: [{ nome: 'Remada X', series: 3, reps: '10' }] }] }))
  await screen.findByText('1 treino · 1 exercício')
  await user.click(screen.getByRole('button', { name: 'Revisar plano' }))
  expect(await screen.findByRole('heading', { name: 'Editar plano' })).toBeInTheDocument()
  expect(await get('workoutPlan')).toBeUndefined()
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(onDone).toHaveBeenCalled()
  await vi.waitFor(async () => expect((await get('workoutPlan'))?.workouts[0].exercises[0].name).toBe('Remada X'))
  expect((await get('customExercises'))?.[0].name).toBe('Remada X')
})

const REMADA = { nome: 'Remada X', series: 3, reps: '10' }
const planJson = (exercicios: object[]) => JSON.stringify({ formato: 'pump-plano', versao: 1, treinos: [{ letra: 'A', nome: 'Peito', dias: ['seg'], exercicios }] })

test('gerar com IA: título e anamnese; converter: título, 3 passos e sem anamnese', async () => {
  const { unmount } = await renderLoaded(<PlanImport mode="ia" onDone={vi.fn()} onBack={vi.fn()} />)
  expect(await screen.findByRole('heading', { name: 'Gerar com IA' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'Em casa' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'copiar meu plano' })).toBeInTheDocument()
  unmount()
  await renderLoaded(<PlanImport mode="convert" onDone={vi.fn()} onBack={vi.fn()} />)
  expect(await screen.findByRole('heading', { name: 'Converter ficha' })).toBeInTheDocument()
  expect(screen.getByText('Mande pra sua IA junto com sua ficha')).toBeInTheDocument()
  expect(screen.getByText('PDF, foto ou texto')).toBeInTheDocument()
  expect(screen.getByText('Cole a resposta aqui')).toBeInTheDocument()
  expect(screen.queryByRole('radio', { name: 'Em casa' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'copiar meu plano' })).not.toBeInTheDocument()
})

test('converter: Copiar leva o prompt de conversão e colar JSON funciona', async () => {
  const user = userEvent.setup()
  const writeText = vi.fn<(text: string) => Promise<void>>(async () => {})
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  await renderLoaded(<PlanImport mode="convert" onDone={vi.fn()} onBack={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Copiar' }))
  expect(writeText).toHaveBeenCalledWith(buildConvertPrompt())
  await user.click(screen.getByRole('textbox', { name: 'Resposta da IA' }))
  await user.paste(planJson([REMADA]))
  expect(await screen.findByText('1 treino · 1 exercício')).toBeInTheDocument()
})

test('revisão lista exercícios sem prévia, até 5 e "e mais N"', async () => {
  const user = userEvent.setup()
  const { unmount } = await renderLoaded(<PlanImport mode="convert" onDone={vi.fn()} onBack={vi.fn()} />)
  await user.click(await screen.findByRole('textbox', { name: 'Resposta da IA' }))
  await user.paste(planJson([REMADA]))
  expect(await screen.findByText('1 exercício sem prévia (fora do catálogo)')).toBeInTheDocument()
  expect(screen.getByText('Remada X')).toBeInTheDocument()
  unmount()
  await renderLoaded(<PlanImport mode="convert" onDone={vi.fn()} onBack={vi.fn()} />)
  await user.click(await screen.findByRole('textbox', { name: 'Resposta da IA' }))
  await user.paste(planJson(['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((n) => ({ ...REMADA, nome: `Ex ${n}` }))))
  expect(await screen.findByText('7 exercícios sem prévia (fora do catálogo)')).toBeInTheDocument()
  expect(screen.getByText('Ex A, Ex B, Ex C, Ex D, Ex E e mais 2')).toBeInTheDocument()
})

test.each(['ia', 'convert'] as const)('%s: "Copiar a lista de exercícios" busca a lista do app e copia', async (mode) => {
  const user = userEvent.setup()
  const writeText = vi.fn<(text: string) => Promise<void>>(async () => {})
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  const f = vi.fn(async () => new Response('Exercícios\nSupino (barra)\n'))
  vi.stubGlobal('fetch', f)
  await renderLoaded(<PlanImport mode={mode} onDone={vi.fn()} onBack={vi.fn()} />)
  expect(await screen.findByText('Se sua IA não abrir o link')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Copiar a lista de exercícios/ }))
  expect(f).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}catalog/exercicios.txt`)
  await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('Exercícios\nSupino (barra)\n'))
})

test('lista de exercícios sem internet avisa', async () => {
  const user = userEvent.setup()
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
  await renderLoaded(<PlanImport mode="convert" onDone={vi.fn()} onBack={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: /Copiar a lista de exercícios/ }))
  expect(await screen.findByText('Sem internet pra copiar a lista.')).toBeInTheDocument()
})

test('sem prévia conta todo exercício custom do plano, também os que já eram seus, sem repetir nome', async () => {
  const user = userEvent.setup()
  await save('customExercises', [{ id: 'custom-1', name: 'Remada X', muscles: [] }])
  await renderLoaded(<PlanImport mode="convert" onDone={vi.fn()} onBack={vi.fn()} />)
  await user.click(await screen.findByRole('textbox', { name: 'Resposta da IA' }))
  await user.paste(planJson([REMADA, REMADA, { ...REMADA, nome: 'Novo Y' }]))
  expect(await screen.findByText('2 exercícios sem prévia (fora do catálogo)')).toBeInTheDocument()
  expect(screen.getByText('Remada X, Novo Y')).toBeInTheDocument()
})
