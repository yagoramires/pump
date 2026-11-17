import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from '../storage/db'
import { todayKey } from '../lib/date'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { dietDay } from '../../test/helpers'
import { EvolutionTab } from './EvolutionTab'
import { generatePdf, sharePdf } from './pdf/generate'

vi.mock('./pdf/generate', () => ({ generatePdf: vi.fn().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' })), sharePdf: vi.fn().mockResolvedValue('shared') }))

beforeEach(async () => {
  await clear()
  resetStoreForTests()
  toast.dismiss() // a fila do sonner é global: toasts de testes anteriores apareceriam no Toaster
})

test('sem dados: estado vazio com Registrar', async () => {
  render(<EvolutionTab />)
  expect(await screen.findByRole('heading', { name: 'Sua evolução começa aqui' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Registrar' })).toBeInTheDocument()
})
test('registrar medidas com vírgula atualiza peso, gordura e perfil', async () => {
  const user = userEvent.setup()
  await save('profile', { sex: 'M', heightCm: 178, weightKg: 80 })
  render(<EvolutionTab />)
  await user.click(await screen.findByRole('button', { name: 'Registrar' }))
  await user.click(await screen.findByRole('button', { name: 'Medidas' }))
  await user.type(await screen.findByLabelText('Peso'), '78,4')
  await user.type(screen.getByLabelText('Pescoço'), '38')
  await user.type(screen.getByLabelText('Cintura'), '85')
  expect(screen.getByText('18,4%')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(async () => expect((await load('profile'))?.weightKg).toBe(78.4))
  expect((await load('measurements'))?.[0]).toMatchObject({ weightKg: 78.4, neckCm: 38, waistCm: 85 })
})
test('perfil sem altura: gordura mostra —', async () => {
  await save('profile', { sex: 'M', heightCm: 0, weightKg: 0 })
  await save('measurements', [{ id: 'a', date: '2026-11-17', neckCm: 38, waistCm: 85, weightKg: 80 }])
  render(<EvolutionTab />)
  expect(await screen.findByText('Gordura')).toBeInTheDocument()
  expect(screen.getAllByText('—').length).toBeGreaterThan(0)
})
test('diferença de peso verde quando o objetivo é emagrecer e o peso caiu', async () => {
  await save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 80 }, { id: 'b', date: '2026-11-17', weightKg: 78.4 }])
  render(<EvolutionTab />)
  expect(await screen.findByText('−1,6 kg')).toHaveClass('text-accent')
})

const openMeasures = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: 'Registrar' }))
  await user.click(await screen.findByRole('button', { name: 'Medidas' }))
}
test('mesmo dia: reabre preenchida e limpar um campo tira ele do registro', async () => {
  const user = userEvent.setup()
  await save('profile', { sex: 'M', heightCm: 178, weightKg: 80 })
  await save('measurements', [{ id: 'a', date: todayKey(), weightKg: 80, neckCm: 38, waistCm: 85 }])
  render(<EvolutionTab />)
  await openMeasures(user)
  expect(await screen.findByLabelText('Peso')).toHaveValue('80')
  expect(screen.getByLabelText('Cintura')).toHaveValue('85')
  await user.clear(screen.getByLabelText('Cintura'))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(async () => expect((await load('measurements'))?.[0].waistCm).toBeUndefined())
  expect((await load('measurements'))?.[0]).toMatchObject({ id: 'a', weightKg: 80, neckCm: 38 })
})
test('0 apaga o campo em vez de virar medida', async () => {
  const user = userEvent.setup()
  await save('profile', { sex: 'M', heightCm: 178, weightKg: 80 })
  await save('measurements', [{ id: 'a', date: todayKey(), weightKg: 80, waistCm: 85 }])
  render(<EvolutionTab />)
  await openMeasures(user)
  await user.clear(await screen.findByLabelText('Peso'))
  await user.type(screen.getByLabelText('Peso'), '0')
  expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(async () => expect((await load('measurements'))?.[0].weightKg).toBeUndefined())
  expect((await load('measurements'))?.[0]).toMatchObject({ waistCm: 85 })
  expect((await load('profile'))?.weightKg).toBe(80)
})
test('salvar sem mudar nada não grava nem diz que salvou', async () => {
  const user = userEvent.setup()
  render(<><EvolutionTab /><Toaster /></>)
  await openMeasures(user)
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  expect(await screen.findByText('Nada mudou')).toBeInTheDocument()
  expect(screen.queryByText('Medidas salvas')).not.toBeInTheDocument()
  expect(await load('measurements')).toBeUndefined()
})

test('Gerar PDF vira Compartilhar PDF e compartilha pump-evolucao-<dia>.pdf', async () => {
  const user = userEvent.setup()
  await save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 80 }])
  render(<EvolutionTab />)
  await user.click(await screen.findByRole('button', { name: 'Gerar PDF' }))
  await user.click(await screen.findByRole('button', { name: 'Compartilhar PDF' }))
  expect(vi.mocked(sharePdf)).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^pump-evolucao-/))
})
test('erro ao gerar o PDF mostra toast', async () => {
  const user = userEvent.setup()
  vi.mocked(generatePdf).mockRejectedValueOnce(new Error('boom'))
  await save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 80 }])
  render(<><EvolutionTab /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: 'Gerar PDF' }))
  expect(await screen.findByText('Não consegui gerar o PDF')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Gerar PDF' })).toBeEnabled()
})
test('registro novo depois de gerar volta pra Gerar PDF', async () => {
  const user = userEvent.setup()
  await save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 80 }])
  render(<EvolutionTab />)
  await user.click(await screen.findByRole('button', { name: 'Gerar PDF' }))
  expect(await screen.findByRole('button', { name: 'Compartilhar PDF' })).toBeInTheDocument()
  await act(() => save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 79 }]))
  expect(await screen.findByRole('button', { name: 'Gerar PDF' })).toBeInTheDocument()
})
test('contagem de dias é inclusiva como no PDF: no primeiro dia diz 1 dia', async () => {
  await save('measurements', [{ id: 'a', date: todayKey(), weightKg: 80 }])
  render(<EvolutionTab />)
  expect(await screen.findByText(/· 1 dia$/)).toBeInTheDocument()
})
test('gráfico: filtro de período com menos de 2 pesos avisa que é o período, não falta de registro', async () => {
  const user = userEvent.setup()
  const old = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return todayKey(d) }
  await save('measurements', [{ id: 'a', date: old(200), weightKg: 82 }, { id: 'b', date: old(100), weightKg: 80 }])
  render(<EvolutionTab />)
  expect(await screen.findByText('Poucos registros nesse período')).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: 'Tudo' }))
  expect(screen.getByRole('img', { name: 'Gráfico de peso' })).toBeInTheDocument()
})
test('PDF offline: avisa que precisa de internet', async () => {
  const user = userEvent.setup()
  vi.mocked(generatePdf).mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module: /assets/x.js'))
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 80 }])
  render(<><EvolutionTab /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: 'Gerar PDF' }))
  expect(await screen.findByText('Sem internet pra gerar o PDF. Conecte e tente de novo.')).toBeInTheDocument()
})
test('Evolução de quem só faz dieta mostra o cartão Dieta', async () => {
  const today = todayKey()
  await save('dietLog', { [today]: dietDay([true, true]) })
  await save('waterLog', { [today]: { ml: 2500, goalMl: 2000 } })
  render(<EvolutionTab />)
  expect(await screen.findByText('Dieta · 30 dias')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Sua evolução começa aqui' })).not.toBeInTheDocument()
  expect(screen.getByText('Média de kcal').parentElement).toHaveTextContent('400 / 2.000')
  expect(screen.getByText('Dias no plano').parentElement).toHaveTextContent('1 de 1')
  expect(screen.getByText('Água na meta').parentElement).toHaveTextContent('1 de 1')
  expect(screen.getByText('Livres no mês').parentElement).toHaveTextContent('0')
})
