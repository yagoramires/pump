import { DEFAULTS } from '@/schema'
import type { DietItem, DietPlan } from './types'
import { screen, waitFor, within } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import { seedStore } from '../../test/store'
import userEvent from '@testing-library/user-event'
import { DietEditor } from './DietEditor'
import { savePlan } from './plan'

const shake: DietItem = { id: 'f1', name: 'Meu shake', grams: 100, per100: { kcal: 120, p: 20, c: 5, f: 2 }, source: 'custom' }
const pao: DietItem = { id: 'i1', name: 'Pão francês', grams: 50, portion: '1 un', per100: { kcal: 300, p: 8, c: 58, f: 3 }, source: 'taco', tacoId: 9 }
const plan = (time = '07:00'): DietPlan => ({
  menus: [
    { id: 'A', name: 'Dia de treino', goalKcal: 2000, meals: [{ id: 'm1', name: 'Café', time, options: [{ id: 'o1', items: [pao] }] }] },
    { id: 'B', name: 'Descanso', meals: [{ id: 'm2', name: 'Almoço', time: '12:00', options: [{ id: 'o2', items: [shake] }] }] },
  ],
  lastMenuId: 'B',
})
// sem a pausa entre eventos do user-event: o editor não tem timer, e os fluxos longos ficavam perto do timeout de 5 s
const setup = () => userEvent.setup({ delay: null })
const pickTime = async (user: ReturnType<typeof setup>, name: string, h: string, m: string) => {
  await user.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }))
  await user.click(screen.getByRole('radio', { name: `${h} h` }))
  await user.click(screen.getByRole('radio', { name: `${m} min` }))
}
const saved = (onSave: ReturnType<typeof vi.fn>): DietPlan => onSave.mock.calls[0][0]

beforeEach(async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})
afterEach(() => vi.unstubAllGlobals())

test('do zero abre com uma refeição; Salvar entrega o plano e Apagar todos entrega o plano vazio', async () => {
  await seedStore({ foods: [shake] })
  const onSave = vi.fn()
  const user = setup()
  const { unmount } = await renderLoaded(<DietEditor initial={DEFAULTS.dietPlan} onSave={onSave} onCancel={vi.fn()} />)
  const name = await screen.findByRole('textbox', { name: 'Nome da refeição 1' })
  expect(name).toHaveValue('Refeição 1')
  await user.clear(name)
  await user.type(name, 'Café da manhã')
  await pickTime(user, 'Horário da refeição 1', '07', '00')
  await user.click(screen.getByRole('button', { name: 'Alimento' }))
  await user.click(await screen.findByRole('button', { name: /Meu shake/ }))
  await user.click(screen.getByRole('button', { name: 'Usar' }))
  expect(await screen.findByText('Meu shake')).toBeInTheDocument()
  expect(screen.getAllByText('120 kcal')).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: 'Salvar' }))

  expect(onSave).toHaveBeenCalledTimes(1)
  expect(saved(onSave).menus).toHaveLength(1)
  const meal = saved(onSave).menus[0].meals[0]
  expect(meal).toMatchObject({ name: 'Café da manhã', time: '07:00' })
  expect(meal.options[0].items).toEqual([expect.objectContaining({ name: 'Meu shake', grams: 100, source: 'custom' })])

  unmount()
  onSave.mockClear()
  await renderLoaded(<DietEditor initial={plan()} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Apagar todos os cardápios' }))
  await user.click(await screen.findByRole('button', { name: 'Apagar' }))
  expect(onSave).toHaveBeenCalledWith(DEFAULTS.dietPlan)
})

test('DietEditor exige horário HH:MM pra salvar', async () => {
  const onSave = vi.fn()
  const user = setup()
  await renderLoaded(<DietEditor initial={plan('')} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dia de treino: preencha nome e horário (HH:MM) de cada refeição')
  expect(onSave).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox', { name: 'Nome do cardápio' })).toHaveValue('Dia de treino')
  await pickTime(user, 'Horário da refeição 1', '07', '30')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(saved(onSave).menus[0].meals[0].time).toBe('07:30')
})

test('DietEditor duplica e apaga cardápios e edita opções', async () => {
  await seedStore({ foods: [shake] })
  const onSave = vi.fn()
  const user = setup()
  await renderLoaded(<DietEditor initial={plan()} onSave={onSave} onCancel={vi.fn()} />)
  expect(await screen.findByRole('textbox', { name: 'Nome do cardápio' })).toHaveValue('Descanso')
  await user.click(screen.getByRole('button', { name: 'Dia de treino' }))
  await user.click(screen.getByRole('button', { name: 'Duplicar cardápio' }))
  expect(screen.getByRole('textbox', { name: 'Nome do cardápio' })).toHaveValue('Dia de treino (cópia)')
  expect(screen.getByText('Pão francês')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Adicionar opção na refeição 1' }))
  expect(screen.getByRole('button', { name: 'Opção B' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByText('Pão francês')).not.toBeInTheDocument()
  await user.type(screen.getByRole('textbox', { name: 'Nome da opção da refeição 1' }), 'Iogurte')
  await user.click(screen.getByRole('button', { name: 'Alimento' }))
  await user.click(await screen.findByRole('button', { name: /Meu shake/ }))
  await user.click(screen.getByRole('button', { name: 'Usar' }))
  await user.click(screen.getByRole('button', { name: 'Opção A' }))
  expect(screen.getByText('Pão francês')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Descanso' }))
  await user.click(screen.getByRole('button', { name: 'Apagar cardápio' }))
  await user.click(await screen.findByRole('button', { name: 'Apagar' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Descanso' })).not.toBeInTheDocument())
  await user.click(screen.getByRole('button', { name: 'Salvar' }))

  const out = saved(onSave)
  expect(out.menus.map((m) => m.name)).toEqual(['Dia de treino', 'Dia de treino (cópia)'])
  const copy = out.menus[1]
  expect(copy.id).not.toBe('A')
  expect(copy.meals[0].id).not.toBe('m1')
  expect(copy.meals[0].options.map((o) => o.name)).toEqual([undefined, 'Iogurte'])
  expect(copy.meals[0].options[0].items[0]).toMatchObject({ name: 'Pão francês', grams: 50 })
  expect(copy.meals[0].options[0].items[0].id).not.toBe('i1')
  expect(copy.meals[0].options[1].items.map((i) => i.name)).toEqual(['Meu shake'])
  expect(out.menus[0].meals[0].options).toHaveLength(1)
})

test('DietEditor não apaga o último cardápio', async () => {
  await renderLoaded(<DietEditor initial={{ menus: [plan().menus[0]] }} onSave={vi.fn()} onCancel={vi.fn()} />)
  expect(await screen.findByRole('button', { name: 'Apagar cardápio' })).toBeDisabled()
})

test('DietEditor recusa opção vazia e meta fora da faixa; Salvar apara os textos', async () => {
  const onSave = vi.fn()
  const user = setup()
  const initial: DietPlan = {
    menus: [{
      id: 'A', name: ' Dia de treino ', goalKcal: 500,
      meals: [{ id: 'm1', name: ' Café ', time: '07:00', options: [{ id: 'o1', name: '  ', items: [{ ...pao, portion: ' 1 un ' }] }, { id: 'o2', items: [] }] }],
    }],
  }
  await renderLoaded(<DietEditor initial={initial} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dia de treino: cada opção precisa de ao menos 1 alimento')
  await user.click(screen.getByRole('button', { name: 'Opção B' }))
  await user.click(screen.getByRole('button', { name: 'Remover opção B da refeição 1' }))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dia de treino: meta fora da faixa (800 a 6000 kcal)')
  expect(onSave).not.toHaveBeenCalled()
  const kcal = screen.getByRole('textbox', { name: 'Meta diária em kcal' })
  await user.clear(kcal)
  await user.type(kcal, '2100')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  const menu = savePlan(initial, saved(onSave)).menus[0]
  expect(menu).toMatchObject({ name: 'Dia de treino', goalKcal: 2100 })
  expect(menu.meals[0].name).toBe('Café')
  expect(menu.meals[0].options).toHaveLength(1)
  expect(menu.meals[0].options[0].name).toBeUndefined()
  expect(menu.meals[0].options[0].items[0].portion).toBe('1 un')
})

test('DietEditor trava novos cardápios no limite do formato', async () => {
  const five = Array.from({ length: 5 }, (_, i) => ({ ...plan().menus[0], id: `M${i}`, name: `C${i}` }))
  await renderLoaded(<DietEditor initial={{ menus: five }} onSave={vi.fn()} onCancel={vi.fn()} />)
  expect(await screen.findByRole('button', { name: 'Novo cardápio' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Duplicar cardápio' })).toBeDisabled()
})

test('metas fora da faixa do formato marcam o campo e não entram no plano', async () => {
  const onSave = vi.fn()
  const user = setup()
  await renderLoaded(<DietEditor initial={plan()} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Dia de treino' }))
  const kcal = screen.getByRole('textbox', { name: 'Meta diária em kcal' })
  await user.tripleClick(kcal)
  await user.keyboard('7000')
  expect(kcal).toHaveAttribute('aria-invalid', 'true')
  const prot = screen.getByRole('textbox', { name: 'Meta de proteína em g' })
  await user.type(prot, '700')
  expect(prot).toHaveAttribute('aria-invalid', 'true')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  const menu = saved(onSave).menus.find((m) => m.name === 'Dia de treino')!
  expect(menu.goalKcal).toBe(2000)
  expect(menu.goalMacros?.p).toBeUndefined()
})

test('B8: 0 g marca o campo como inválido e não entra no plano (antes sumia calado)', async () => {
  const onSave = vi.fn()
  const user = setup()
  await renderLoaded(<DietEditor initial={plan()} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'Dia de treino' }))
  const grams = screen.getByRole('textbox', { name: 'Gramas de Pão francês' })
  await user.clear(grams)
  await user.type(grams, '0')
  expect(grams).toHaveAttribute('aria-invalid', 'true')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(saved(onSave).menus[0].meals[0].options[0].items[0].grams).toBe(50)
})

test('trocar de cardápio mostra a meta do outro, e voltar mostra a do primeiro', async () => {
  const user = setup()
  await renderLoaded(<DietEditor initial={plan()} onSave={vi.fn()} onCancel={vi.fn()} />)
  const kcal = () => screen.getByRole('textbox', { name: 'Meta diária em kcal' })
  await user.click(screen.getByRole('button', { name: 'Dia de treino' }))
  expect(kcal()).toHaveValue('2000')
  await user.click(screen.getByRole('button', { name: 'Descanso' }))
  expect(kcal()).toHaveValue('')
  await user.click(screen.getByRole('button', { name: 'Dia de treino' }))
  expect(kcal()).toHaveValue('2000')
})

test('pede correção de uma meta fracionária legada antes de salvar', async () => {
  const initial = plan()
  initial.menus[0].goalKcal = 2000.5
  const onSave = vi.fn()
  const user = setup()
  await renderLoaded(<DietEditor initial={initial} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dia de treino: informe a meta em kcal inteiras')
  expect(onSave).not.toHaveBeenCalled()
})

const arroz: DietItem = { id: 'i2', name: 'Arroz', grams: 100, per100: { kcal: 0, p: 10, c: 20, f: 5 }, source: 'custom' }
const twoItems = (): DietPlan => ({ menus: [{ id: 'A', name: 'Base', meals: [{ id: 'm1', name: 'Almoço', time: '12:00', options: [{ id: 'o1', items: [pao, arroz, shake] }] }] }] })

test('Selecionar remove vários alimentos com confirmação', async () => {
  const user = setup()
  const onSave = vi.fn()
  await renderLoaded(<DietEditor initial={twoItems()} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Selecionar' }))
  expect(screen.queryByRole('button', { name: 'Mover Arroz' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('checkbox', { name: 'Selecionar Pão francês' }))
  await user.click(screen.getByRole('checkbox', { name: 'Selecionar Meu shake' }))
  await user.click(screen.getByRole('button', { name: 'Remover (2)' }))
  await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Remover' }))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(saved(onSave).menus[0].meals[0].options[0].items.map((i) => i.name)).toEqual(['Arroz'])
})

test('a barrinha mostra os macros da opção aberta', async () => {
  await renderLoaded(<DietEditor initial={{ menus: [{ id: 'A', name: 'Base', meals: [{ id: 'm1', name: 'Almoço', time: '12:00', options: [{ id: 'o1', items: [arroz] }] }] }] }} onSave={vi.fn()} onCancel={vi.fn()} />)
  expect(await screen.findByText('proteína 10 g, carbo 20 g, gordura 5 g')).toBeInTheDocument()
})

test('cada alimento tem a alça de arrastar fora do modo seleção', async () => {
  await renderLoaded(<DietEditor initial={twoItems()} onSave={vi.fn()} onCancel={vi.fn()} />)
  expect(await screen.findByRole('button', { name: 'Mover Arroz' })).toBeInTheDocument()
})

test('com onChange não mostra Salvar nem Apagar todos e avisa cada mudança', async () => {
  const user = setup()
  const onChange = vi.fn()
  await renderLoaded(<DietEditor initial={twoItems()} onChange={onChange} />)
  expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Apagar todos os cardápios' })).not.toBeInTheDocument()
  expect(onChange).not.toHaveBeenCalled()
  const g = await screen.findByRole('textbox', { name: 'Gramas de Arroz' })
  await user.clear(g)
  await user.type(g, '150')
  expect(onChange.mock.calls.at(-1)![0].menus[0].meals[0].options[0].items[1].grams).toBe(150)
})
