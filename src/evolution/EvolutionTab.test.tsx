import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { resetStoreForTests, save } from '@/storage/db'
import { todayKey } from '@/lib/date'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { dietDay } from '../../test/helpers'
import { renderLoaded } from '../../test/render'
import { EvolutionTab } from './EvolutionTab'
import { generatePdf, sharePdf } from './pdf/generate'

vi.mock('./pdf/generate', () => ({ generatePdf: vi.fn().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' })), sharePdf: vi.fn().mockResolvedValue('shared') }))

beforeEach(async () => {
  await clear()
  resetStoreForTests()
  toast.dismiss() // a fila do sonner é global: toasts de testes anteriores apareceriam no Toaster
})

test('sem dados: estado vazio com Registrar', async () => {
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByRole('heading', { name: 'Sua evolução começa aqui' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Registrar' })).toBeInTheDocument()
})
test('perfil sem altura: gordura mostra —', async () => {
  await save('profile', { sex: 'M', heightCm: 0, weightKg: 0 })
  await save('measurements', [{ id: 'a', date: '2026-11-17', neckCm: 38, waistCm: 85, weightKg: 80 }])
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByText('Gordura')).toBeInTheDocument()
  // célula do KPI: valor e diferença
  expect(screen.getByText('Gordura').parentElement).toHaveTextContent(/^Gordura——$/)
})
test('diferença de peso verde quando o objetivo é emagrecer e o peso caiu', async () => {
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
  expect(vi.mocked(sharePdf)).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^pump-evolucao-/))
})
test('erro ao gerar o PDF mostra toast', async () => {
  const user = userEvent.setup()
  vi.mocked(generatePdf).mockRejectedValueOnce(new Error('boom'))
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
  await save('measurements', [{ id: 'a', date: todayKey(), weightKg: 80 }])
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByText(/· 1 dia$/)).toBeInTheDocument()
})
test('gráfico: filtro de período com menos de 2 pesos avisa que é o período, não falta de registro', async () => {
  const user = userEvent.setup()
  const old = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return todayKey(d) }
  await save('measurements', [{ id: 'a', date: old(200), weightKg: 82 }, { id: 'b', date: old(100), weightKg: 80 }])
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByText('Poucos registros nesse período')).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: 'Tudo' }))
  expect(screen.getByRole('img', { name: 'Gráfico de peso' })).toBeInTheDocument()
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
  const today = todayKey()
  await save('dietLog', { [today]: dietDay([true, true]) })
  await save('waterLog', { [today]: { ml: 2500, goalMl: 2000 } })
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByText('Dieta · 30 dias')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Sua evolução começa aqui' })).not.toBeInTheDocument()
  expect(screen.getByText('Média de kcal').parentElement).toHaveTextContent('400 / 2.000')
  expect(screen.getByText('Dias no plano').parentElement).toHaveTextContent('1 de 1')
  expect(screen.getByText('Água na meta').parentElement).toHaveTextContent('1 de 1')
  expect(screen.getByText('Livres no mês').parentElement).toHaveTextContent('0')
})
