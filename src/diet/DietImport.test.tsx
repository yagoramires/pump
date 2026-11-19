import type { DietLog, DietPlan, TacoFood } from './types'
import { screen, within } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import userEvent from '@testing-library/user-event'
import { clear, get } from 'idb-keyval'
import { resetStoreForTests, save } from '@/storage/db'
import { fetchTaco } from '@/catalog/catalog'
import { Toaster } from '@/components/ui/sonner'
import { DietImport } from './DietImport'
import { buildDietConvertPrompt } from './prompt'

// fetchTaco guarda a promessa no módulo; mockado, cada teste escolhe online ou offline
vi.mock('@/catalog/catalog', async (orig) => ({ ...(await orig<typeof import('@/catalog/catalog')>()), fetchTaco: vi.fn() }))

const TACO: TacoFood[] = [
  { id: 1, name: 'Pão, trigo, francês', kcal: 300, p: 8, c: 58.6, f: 3.1 },
  { id: 2, name: 'Arroz, tipo 1, cozido', kcal: 128, p: 2.5, c: 28.1, f: 0.2 },
]
const WHEY = { nome: 'Whey protein', gramas: 30, porcao: '1 scoop', kcal: 120, proteinaG: 24, carboG: 3, gorduraG: 1.5 }
const PAO = { nome: 'Pão francês', gramas: 50, porcao: '1 un', kcal: 150, proteinaG: 4, carboG: 29, gorduraG: 1.5 }
const json = (alimentos: object[]) =>
  JSON.stringify({ formato: 'pump-plano', versao: 1, dieta: { metaKcal: 2000, macros: { proteinaG: 150, carboG: 200, gorduraG: 60 }, refeicoes: [{ nome: 'Café da manhã', horario: '07:00', alimentos }] } })

beforeEach(async () => {
  await clear()
  resetStoreForTests()
  vi.mocked(fetchTaco).mockRejectedValue(new Error('offline'))
})

async function paste(text: string) {
  const user = userEvent.setup()
  await user.upload(await screen.findByLabelText('Escolher arquivo'), new File([text], 'cardapio.json', { type: 'application/json' }))
  return user
}

test('gerar com IA: copiar prompt grava a anamnese', async () => {
  const user = userEvent.setup()
  const writeText = vi.fn<(text: string) => Promise<void>>(async () => {})
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  const { unmount } = await renderLoaded(<DietImport mode="ia" onDone={vi.fn()} onBack={vi.fn()} />)
  const copy = await screen.findByRole('button', { name: 'Copiar prompt pra IA' })
  await user.click(screen.getByRole('radio', { name: '5' }))
  await user.click(screen.getByRole('button', { name: 'Sem lactose' }))
  await user.type(screen.getByLabelText('Não como'), 'fígado')
  expect(copy).toBeEnabled()
  await user.click(copy)
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('- Refeições por dia: 5\n'))
  expect(writeText.mock.calls[0][0]).toContain('- Não como: fígado')
  await vi.waitFor(async () => expect((await get('profile'))?.dietAnamnesis).toEqual({ meals: 5, restrictions: ['lactose'], avoid: 'fígado' }))
  unmount()
  await renderLoaded(<DietImport mode="ia" onDone={vi.fn()} onBack={vi.fn()} />)
  expect(await screen.findByRole('radio', { name: '5' })).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByLabelText('Não como')).toHaveValue('fígado')
})

test('import offline: tudo vira estimativa com aviso e dá pra usar', async () => {
  const onDone = vi.fn()
  await renderLoaded(<DietImport mode="convert" onDone={onDone} onBack={vi.fn()} />)
  expect(screen.queryByRole('button', { name: 'Copiar prompt pra IA' })).not.toBeInTheDocument()
  const user = await paste(json([WHEY, PAO]))
  expect(await screen.findByText('Sem internet: usei os números da IA. Dá pra trocar depois.')).toBeInTheDocument()
  expect(screen.getAllByText('estimativa da IA')).toHaveLength(2)
  expect(screen.getByText('2 itens fora da TACO usam os números da IA. Toque pra trocar.')).toBeInTheDocument()
  expect(screen.getByText(/2\.000 kcal/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Usar cardápios' }))
  await vi.waitFor(() => expect(onDone).toHaveBeenCalled())
  const plan = (await get('dietPlan')) as DietPlan
  const items = plan.menus[0].meals[0].options[0].items
  expect(items.map((i) => [i.name, i.source])).toEqual([['Whey protein', 'ia'], ['Pão francês', 'ia']])
  expect(plan.lastMenuId).toBe(plan.menus[0].id)
  expect(await get('dietLog')).toBeUndefined() // dia sem marca não é dado (B7)
})

test('casado por palavras com nome diferente mostra "na TACO"', async () => {
  vi.mocked(fetchTaco).mockResolvedValue(TACO)
  await renderLoaded(<DietImport mode="convert" onDone={vi.fn()} onBack={vi.fn()} />)
  const user = await paste(json([PAO, WHEY]))
  expect(await screen.findByText('na TACO: Pão, trigo, francês')).toBeInTheDocument()
  expect(screen.queryByText('Sem internet: usei os números da IA. Dá pra trocar depois.')).not.toBeInTheDocument()
  expect(screen.getAllByText('estimativa da IA')).toHaveLength(1)
  expect(screen.getByText('1 item fora da TACO usa os números da IA. Toque pra trocar.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Whey protein/ }))
  await user.type(await screen.findByRole('searchbox', { name: 'Buscar alimento' }), 'arroz')
  const results = await screen.findByRole('list', { name: 'Resultados da TACO' })
  await user.click(within(results).getByRole('button', { name: /Arroz, tipo 1, cozido/ }))
  await user.click(screen.getByRole('button', { name: 'Trocar' }))
  await vi.waitFor(() => expect(screen.queryByText('estimativa da IA')).not.toBeInTheDocument())
  expect(screen.getAllByText('Arroz, tipo 1, cozido').length).toBeGreaterThan(0)
  expect(screen.queryByText(/fora da TACO/)).not.toBeInTheDocument()
})

test('JSON inválido lista os erros e não grava', async () => {
  await renderLoaded(<DietImport mode="convert" onDone={vi.fn()} onBack={vi.fn()} />)
  await paste(JSON.stringify({ formato: 'pump-plano', versao: 1, dieta: { refeicoes: [{ nome: '', horario: '7h', alimentos: [{ nome: 'Ovo', gramas: 50 }] }] } }))
  const alert = await screen.findByRole('alert')
  expect(within(alert).getByText('Refeição 1: falta o nome')).toBeInTheDocument()
  expect(within(alert).getByText('Refeição 1: horário inválido (use HH:MM)')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Usar cardápios' })).not.toBeInTheDocument()
  expect(await get('dietPlan')).toBeUndefined()
})

test('substituir cardápio pede confirmação e preserva o que foi marcado hoje', async () => {
  const old: DietPlan = { menus: [{ id: 'old', name: 'Antigo', meals: [{ id: 'm1', name: 'Café', time: '07:00', options: [{ id: 'o1', items: [] }] }] }], lastMenuId: 'old' }
  const log: DietLog = { '2026-11-18': { menuId: 'old', menuName: 'Antigo', meals: [{ id: 'm1', name: 'Café', time: '07:00', done: true, items: [] }] } }
  await save('dietPlan', old)
  await save('dietLog', log)
  resetStoreForTests()
  const onDone = vi.fn()
  await renderLoaded(<DietImport mode="convert" onDone={onDone} onBack={vi.fn()} />)
  const user = await paste(json([PAO]))
  await user.click(await screen.findByRole('button', { name: 'Usar cardápios' }))
  const dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).getByText('O cardápio atual será substituído. O que você já marcou hoje continua.')).toBeInTheDocument()
  expect(((await get('dietPlan')) as DietPlan).menus[0].id).toBe('old')
  await user.click(within(dialog).getByRole('button', { name: 'Substituir' }))
  await vi.waitFor(() => expect(onDone).toHaveBeenCalled())
  const plan = (await get('dietPlan')) as DietPlan
  expect(plan.menus).toHaveLength(1)
  expect(plan.menus[0].name).toBe('Cardápio')
  expect(plan.lastMenuId).toBe(plan.menus[0].id)
  expect(await get('dietLog')).toEqual(log)
})

test('enquanto a TACO carrega mostra "Conferindo na TACO…"', async () => {
  let resolve!: (t: TacoFood[]) => void
  vi.mocked(fetchTaco).mockReturnValue(new Promise((r) => { resolve = r }))
  await renderLoaded(<DietImport mode="convert" onDone={vi.fn()} onBack={vi.fn()} />)
  await paste(json([PAO]))
  expect(await screen.findByRole('status')).toHaveTextContent('Conferindo na TACO…')
  resolve(TACO)
  expect(await screen.findByRole('heading', { name: 'Revisar cardápio' })).toBeInTheDocument()
  expect(screen.queryByText('Conferindo na TACO…')).not.toBeInTheDocument()
})

test('Editar e salvar por cima de um cardápio salvo passa pela mesma confirmação', async () => {
  await save('dietPlan', { menus: [{ id: 'X', name: 'Antigo', meals: [{ id: 'm', name: 'Café', time: '07:00', options: [{ id: 'o', items: [] }] }] }], lastMenuId: 'X' })
  resetStoreForTests()
  const onDone = vi.fn()
  await renderLoaded(<DietImport mode="convert" onDone={onDone} onBack={vi.fn()} />)
  const user = await paste(json([PAO]))
  await user.click(await screen.findByRole('button', { name: 'Editar' }))
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  const dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).getByText('O cardápio atual será substituído. O que você já marcou hoje continua.')).toBeInTheDocument()
  expect(((await get('dietPlan')) as DietPlan).menus[0].id).toBe('X')
  await user.click(within(dialog).getByRole('button', { name: 'Substituir' }))
  await vi.waitFor(() => expect(onDone).toHaveBeenCalled())
  expect(((await get('dietPlan')) as DietPlan).menus.map((m) => m.name)).toEqual(['Cardápio'])
})

test('Editar sem cardápio salvo grava direto', async () => {
  const onDone = vi.fn()
  await renderLoaded(<DietImport mode="convert" onDone={onDone} onBack={vi.fn()} />)
  const user = await paste(json([PAO]))
  await user.click(await screen.findByRole('button', { name: 'Editar' }))
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  await vi.waitFor(() => expect(onDone).toHaveBeenCalled())
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(((await get('dietPlan')) as DietPlan).menus).toHaveLength(1)
})

test('criar alimento próprio na revisão não refaz a revisão nem perde as trocas', async () => {
  vi.mocked(fetchTaco).mockResolvedValue(TACO)
  await renderLoaded(<DietImport mode="convert" onDone={vi.fn()} onBack={vi.fn()} />)
  const user = await paste(json([PAO, WHEY]))
  await user.click(await screen.findByRole('button', { name: /Whey protein/ }))
  await user.click(await screen.findByRole('button', { name: 'Criar alimento próprio' }))
  await user.type(screen.getByRole('textbox', { name: 'Nome do alimento' }), 'Meu whey')
  await user.type(screen.getByRole('textbox', { name: 'kcal por 100 g' }), '400')
  await user.click(screen.getByRole('button', { name: 'Criar' }))
  await user.click(await screen.findByRole('button', { name: 'Trocar' }))
  expect(await screen.findByText('Meu whey')).toBeInTheDocument()
  await vi.waitFor(async () => expect(await get('foods')).toHaveLength(1))
  expect(screen.getByText('Meu whey')).toBeInTheDocument()
  expect(screen.getByText('na TACO: Pão, trigo, francês')).toBeInTheDocument()
})

test('converter: título, 3 passos, Copiar leva o prompt de conversão e lista os nomes fora da TACO', async () => {
  const user = userEvent.setup()
  const writeText = vi.fn<(text: string) => Promise<void>>(async () => {})
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  await renderLoaded(<DietImport mode="convert" onDone={vi.fn()} onBack={vi.fn()} />)
  expect(await screen.findByRole('heading', { name: 'Converter dieta' })).toBeInTheDocument()
  expect(screen.getByText('Mande pra sua IA junto com sua dieta')).toBeInTheDocument()
  expect(screen.getByText('PDF, foto ou texto')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Copiar' }))
  expect(writeText).toHaveBeenCalledWith(buildDietConvertPrompt())
  await paste(json([WHEY, PAO]))
  expect(await screen.findByText('2 itens fora da TACO usam os números da IA. Toque pra trocar.')).toBeInTheDocument()
  expect(screen.getByText('Whey protein, Pão francês')).toBeInTheDocument()
})

test('fora da TACO: nome repetido aparece e conta uma vez só', async () => {
  await renderLoaded(<DietImport mode="convert" onDone={vi.fn()} onBack={vi.fn()} />)
  await paste(json([WHEY, WHEY, PAO]))
  expect(await screen.findByText('2 itens fora da TACO usam os números da IA. Toque pra trocar.')).toBeInTheDocument()
  expect(screen.getByText('Whey protein, Pão francês')).toBeInTheDocument()
})

test.each(['ia', 'convert'] as const)('%s: "Copiar a lista de alimentos" busca a lista do app e copia', async (mode) => {
  const user = userEvent.setup()
  const writeText = vi.fn<(text: string) => Promise<void>>(async () => {})
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  const f = vi.fn(async () => new Response('Alimentos TACO\nArroz\n'))
  vi.stubGlobal('fetch', f)
  await renderLoaded(<DietImport mode={mode} onDone={vi.fn()} onBack={vi.fn()} />)
  expect(await screen.findByText('Se sua IA não abrir o link')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Copiar a lista de alimentos/ }))
  expect(f).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}catalog/alimentos.txt`)
  await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('Alimentos TACO\nArroz\n'))
  vi.unstubAllGlobals()
})

test('lista de alimentos sem internet avisa', async () => {
  const user = userEvent.setup()
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
  await renderLoaded(<><DietImport mode="convert" onDone={vi.fn()} onBack={vi.fn()} /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: /Copiar a lista de alimentos/ }))
  expect(await screen.findByText('Sem internet pra copiar a lista.')).toBeInTheDocument()
  vi.unstubAllGlobals()
})
