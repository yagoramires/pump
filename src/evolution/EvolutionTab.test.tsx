import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { save } from '@/storage/db'
import { Toaster } from '@/components/ui/sonner'
import { dietDay, pe } from '../../test/helpers'
import type { SetDone, WorkoutSession } from '@/workout/types'
import { renderLoaded } from '../../test/render'
import { EvolutionTab } from './EvolutionTab'
import { generatePdf } from './pdf/generate'
import { shareFile } from '@/lib/share'

vi.mock('./pdf/generate', () => ({ generatePdf: vi.fn().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' })) }))
vi.mock('@/lib/share', () => ({ shareFile: vi.fn().mockResolvedValue('shared') }))

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 18, 12))
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test('sem dados: estado vazio com Registrar', async () => {
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByRole('heading', { name: 'Sua evolução começa aqui' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Registrar' })).toBeInTheDocument()
})
test('perfil sem altura: gordura mostra —', async () => {
  await save('profile', { sex: 'M', heightCm: 0 })
  await save('measurements', [{ id: 'a', date: '2026-11-17', neckCm: 38, waistCm: 85, weightKg: 80 }])
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByText('Gordura')).toBeInTheDocument()
  // célula do KPI: valor e diferença
  expect(screen.getByText('Gordura').parentElement).toHaveTextContent(/^Gordura——$/)
})
test('diferença de peso verde quando o objetivo é emagrecer e o peso caiu', async () => {
  await save('profile', { sex: 'M', heightCm: 178, dietGoal: 'perder' })
  await save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 80 }, { id: 'b', date: '2026-11-17', weightKg: 78.4 }])
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByText('−1,6 kg')).toHaveClass('text-accent')
})

test('Gerar PDF vira Compartilhar PDF e compartilha pump-evolucao-<dia>.pdf', async () => {
  const user = userEvent.setup()
  await save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 80 }])
  await renderLoaded(<EvolutionTab />)
  await user.click(await screen.findByRole('button', { name: 'Gerar PDF' }))
  await user.click(await screen.findByRole('button', { name: 'Compartilhar PDF' }))
  expect(vi.mocked(shareFile)).toHaveBeenCalledWith(expect.objectContaining({ name: 'pump-evolucao-2026-11-18.pdf', type: 'application/pdf' }))
})
test('erro ao gerar o PDF mostra toast', async () => {
  const user = userEvent.setup()
  vi.mocked(generatePdf).mockRejectedValueOnce(new Error('boom'))
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 80 }])
  await renderLoaded(<><EvolutionTab /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: 'Gerar PDF' }))
  expect(await screen.findByText('Não consegui gerar o PDF')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Gerar PDF' })).toBeEnabled()
})
test('registro novo depois de gerar volta pra Gerar PDF', async () => {
  const user = userEvent.setup()
  await save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 80 }])
  await renderLoaded(<EvolutionTab />)
  await user.click(await screen.findByRole('button', { name: 'Gerar PDF' }))
  expect(await screen.findByRole('button', { name: 'Compartilhar PDF' })).toBeInTheDocument()
  await act(() => save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 79 }]))
  expect(await screen.findByRole('button', { name: 'Gerar PDF' })).toBeInTheDocument()
})
test('contagem de dias é inclusiva como no PDF: no primeiro dia diz 1 dia', async () => {
  await save('measurements', [{ id: 'a', date: '2026-11-18', weightKg: 80 }])
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByText(/· 1 dia$/)).toBeInTheDocument()
})
test('gráfico: filtro de período com menos de 2 pesos avisa que é o período, não falta de registro', async () => {
  const user = userEvent.setup()
  await save('measurements', [{ id: 'a', date: '2026-05-02', weightKg: 82 }, { id: 'b', date: '2026-08-10', weightKg: 80 }])
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByText('Poucos registros nesse período')).toBeInTheDocument()
  await user.click(within(screen.getByRole('tablist', { name: 'Período do gráfico' })).getByRole('tab', { name: 'Tudo' }))
  expect(screen.getByRole('img', { name: 'Gráfico de peso' })).toBeInTheDocument()
})
test('gráfico: 7 d mostra só a última semana', async () => {
  const user = userEvent.setup()
  await save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 82 }, { id: 'b', date: '2026-11-10', weightKg: 80 }])
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByRole('img', { name: 'Gráfico de peso' })).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: '7 d' }))
  expect(screen.getByText('Poucos registros nesse período')).toBeInTheDocument()
})
test('PDF offline: avisa que precisa de internet', async () => {
  const user = userEvent.setup()
  vi.mocked(generatePdf).mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module: /assets/x.js'))
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 80 }])
  await renderLoaded(<><EvolutionTab /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: 'Gerar PDF' }))
  expect(await screen.findByText('Sem internet pra gerar o PDF. Conecte e tente de novo.')).toBeInTheDocument()
})
test('Evolução de quem só faz dieta mostra o cartão Dieta', async () => {
  const today = '2026-11-18'
  await save('dietLog', { [today]: dietDay([true, true]) })
  await save('waterLog', { [today]: { ml: 2500, goalMl: 2000 } })
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByText('Dieta · 30 dias')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Sua evolução começa aqui' })).not.toBeInTheDocument()
})

const treino = (date: string, sets: SetDone[]): WorkoutSession => ({
  date, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: `${date}T20:00:00.000Z`,
  exercises: [{ ...pe({ exerciseId: 'Supino', name: 'Supino reto', muscles: ['peito'] }), sets }],
})

test('card Cargas: resumo, grupo e linha com carga e diferença', async () => {
  await save('workoutLog', { '2026-11-01': treino('2026-11-01', [{ reps: '10', weightKg: 55 }]), '2026-11-15': treino('2026-11-15', [{ reps: '10', weightKg: 60 }]) })
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByText('Cargas')).toBeInTheDocument()
  expect(screen.getByText('Peito')).toBeInTheDocument()
  expect(within(screen.getByRole('button', { name: 'Supino reto' })).getByText('+5 kg')).toHaveClass('text-accent')
})
test('card Cargas: período sem treino mostra o estado vazio', async () => {
  const user = userEvent.setup()
  await save('workoutLog', { '2026-09-15': treino('2026-09-15', [{ reps: '10', weightKg: 55 }]) })
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByRole('button', { name: 'Supino reto' })).toBeInTheDocument()
  await user.click(within(screen.getByRole('tablist', { name: 'Período das cargas' })).getByRole('tab', { name: '30 d' }))
  expect(screen.getByText('Nenhum treino com carga nesse período')).toBeInTheDocument()
})
