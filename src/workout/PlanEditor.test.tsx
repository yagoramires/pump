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

test('tocar no exercício abre a gaveta; +2,5 kg e Pronto atualiza a pílula de carga', async () => {
  const user = userEvent.setup()
  await renderLoaded(<PlanEditor initial={{ workouts: [workoutOf([supino], { name: 'Peito' })] }} onSave={vi.fn()} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Supino reto' }))
  await user.click(screen.getByRole('button', { name: 'Aumentar carga' }))
  await user.click(screen.getByRole('button', { name: 'Pronto' }))
  expect(screen.getByRole('textbox', { name: 'Carga de Supino reto em kg' })).toHaveValue('42,5')
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
  expect(within(screen.getByRole('button', { name: 'Agachamento' })).queryByRole('img')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Ver prévia de Agachamento' })).not.toBeInTheDocument()
  await user.click(thumbnail)
  const preview = screen.getByRole('dialog', { name: 'Supino reto' })
  expect(within(preview).getByRole('img', { name: 'Supino reto' })).toBeInTheDocument()
  expect(within(preview).getByText('Mantenha os pés no chão.')).toBeInTheDocument()
  await user.click(within(preview).getByRole('button', { name: 'Fechar' }))
  await waitFor(() => expect(thumbnail).toHaveFocus())
  await user.click(screen.getByRole('button', { name: 'Supino reto' }))
  expect(screen.getByRole('textbox', { name: 'Carga em kg' })).toBeInTheDocument()
})

test('carga digitada com vírgula na gaveta', async () => {
  const user = userEvent.setup()
  await renderLoaded(<PlanEditor initial={{ workouts: [workoutOf([supino], { name: 'Peito' })] }} onSave={vi.fn()} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Supino reto' }))
  const kg = screen.getByRole('textbox', { name: 'Carga em kg' })
  await user.clear(kg)
  await user.type(kg, '22,5')
  await user.click(screen.getByRole('button', { name: 'Pronto' }))
  expect(screen.getByRole('textbox', { name: 'Carga de Supino reto em kg' })).toHaveValue('22,5')
})
test('Renomear fecha o menu e põe o foco no nome do treino depois da animação', async () => {
  const user = userEvent.setup()
  await renderLoaded(<PlanEditor initial={{ workouts: [workoutOf([], { name: 'Peito' })] }} onSave={vi.fn()} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Mais ações do treino A' }))
  await user.click(await screen.findByRole('button', { name: 'Renomear' }))
  await waitFor(() => expect(screen.getByDisplayValue('Peito')).toHaveFocus())
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

const ppl = () => ({ workouts: [
  workoutOf([supino, { ...supino, name: 'Crucifixo' }, { name: 'Tríceps corda', muscles: ['tríceps'] }].map((e) => ({ muscles: ['peito'], ...e })), { id: 'p', label: 'A', name: 'Peito' }),
  workoutOf([{ name: 'Puxada' }], { id: 'c', label: 'B', name: 'Costas' }),
  workoutOf([{ name: 'Agachamento' }], { id: 'l', label: 'C', name: 'Pernas' }),
] })
const saved = (onSave: ReturnType<typeof vi.fn>) => onSave.mock.calls.at(-1)![0]

test('Salvar não grava a chave interna das linhas', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn()
  await renderLoaded(<PlanEditor initial={ppl()} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  expect(saved(onSave).workouts[0].exercises.some((e: object) => 'key' in e)).toBe(false)
})

test('pílulas editam séries, reps e carga sem abrir a gaveta', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn()
  await renderLoaded(<PlanEditor initial={{ workouts: [workoutOf([supino], { name: 'Peito' })] }} onSave={onSave} onCancel={vi.fn()} />)
  const sets = await screen.findByRole('textbox', { name: 'Séries de Supino reto' })
  await user.clear(sets)
  await user.type(sets, '5')
  const reps = screen.getByRole('textbox', { name: 'Repetições de Supino reto' })
  await user.clear(reps)
  await user.type(reps, '8')
  const kg = screen.getByRole('textbox', { name: 'Carga de Supino reto em kg' })
  await user.clear(kg)
  await user.type(kg, '22,5')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(saved(onSave).workouts[0].exercises[0]).toMatchObject({ sets: 5, reps: '8', weightKg: 22.5 })
})

test('Selecionar remove vários de uma vez com confirmação', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn()
  await renderLoaded(<PlanEditor initial={ppl()} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Selecionar' }))
  expect(screen.queryByRole('button', { name: 'Mover Supino reto' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('checkbox', { name: 'Selecionar Supino reto' }))
  await user.click(screen.getByRole('checkbox', { name: 'Selecionar Crucifixo' }))
  await user.click(screen.getByRole('button', { name: 'Remover (2)' }))
  await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remover' }))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(saved(onSave).workouts[0].exercises.map((e: { name: string }) => e.name)).toEqual(['Tríceps corda'])
})

test('Remover treino pede confirmação e refaz as letras', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn()
  await renderLoaded(<PlanEditor initial={ppl()} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Mais ações do treino B' }))
  await user.click(await screen.findByRole('button', { name: 'Remover treino' }))
  await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Remover' }))
  // jsdom: a gaveta do menu fechada continua montada (sem fim de animação) e deixa o resto aria-hidden
  await user.click(screen.getByRole('button', { name: 'Salvar', hidden: true }))
  expect(saved(onSave).workouts.map((w: { label: string; name: string }) => `${w.label} ${w.name}`)).toEqual(['A Peito', 'B Pernas'])
})

test('+ Novo treino entra com a próxima letra', async () => {
  const user = userEvent.setup()
  await renderLoaded(<PlanEditor initial={ppl()} onSave={vi.fn()} onCancel={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Novo treino' }))
  expect(screen.getByDisplayValue('Treino D')).toBeInTheDocument()
})

test('a barrinha mostra a divisão dos músculos do treino', async () => {
  await renderLoaded(<PlanEditor initial={ppl()} onSave={vi.fn()} onCancel={vi.fn()} />)
  expect(await screen.findByText('peito 2, braços 1')).toBeInTheDocument()
})

test('com onChange não mostra Salvar e avisa cada mudança', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  await renderLoaded(<PlanEditor initial={ppl()} onChange={onChange} />)
  expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument()
  expect(onChange).not.toHaveBeenCalled()
  await user.click(await screen.findByRole('button', { name: 'Novo treino' }))
  expect(onChange.mock.calls.at(-1)![0].workouts).toHaveLength(4)
})
