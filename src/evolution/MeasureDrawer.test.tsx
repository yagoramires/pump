import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from '@/storage/db'
import { Toaster } from '@/components/ui/sonner'
import { renderLoaded } from '../../test/render'
import { MeasureDrawer } from './MeasureDrawer'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 18, 12))
})
afterEach(() => vi.useRealTimers())
const TODAY = '2026-11-18'

const open = () => renderLoaded(<><MeasureDrawer open onClose={vi.fn()} date={TODAY} /><Toaster /></>)

test('medidas com vírgula: grava, mostra a gordura e leva o peso pro perfil', async () => {
  const user = userEvent.setup()
  await save('profile', { sex: 'M', heightCm: 178 })
  await open()
  await user.type(await screen.findByLabelText('Peso'), '78,4')
  await user.type(screen.getByLabelText('Pescoço'), '38')
  await user.type(screen.getByLabelText('Cintura'), '85')
  expect(screen.getByText('18,4%')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(await screen.findByText('Medidas salvas')).toBeInTheDocument()
  expect((await load('measurements'))?.[0]).toMatchObject({ weightKg: 78.4, neckCm: 38, waistCm: 85 })
})
test('mesmo dia: reabre preenchida e limpar um campo tira ele do registro', async () => {
  const user = userEvent.setup()
  await save('profile', { sex: 'M', heightCm: 178 })
  await save('measurements', [{ id: 'a', date: TODAY, weightKg: 80, neckCm: 38, waistCm: 85 }])
  await open()
  expect(await screen.findByLabelText('Peso')).toHaveValue('80')
  expect(screen.getByLabelText('Cintura')).toHaveValue('85')
  await user.clear(screen.getByLabelText('Cintura'))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(await screen.findByText('Medidas salvas')).toBeInTheDocument()
  expect((await load('measurements'))?.[0].waistCm).toBeUndefined()
  expect((await load('measurements'))?.[0]).toMatchObject({ id: 'a', weightKg: 80, neckCm: 38 })
})
test('0 apaga o campo em vez de virar medida', async () => {
  const user = userEvent.setup()
  await save('profile', { sex: 'M', heightCm: 178 })
  await save('measurements', [{ id: 'a', date: TODAY, weightKg: 80, waistCm: 85 }])
  await open()
  await user.clear(await screen.findByLabelText('Peso'))
  await user.type(screen.getByLabelText('Peso'), '0')
  expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(async () => expect((await load('measurements'))?.[0].weightKg).toBeUndefined())
  expect((await load('measurements'))?.[0]).toMatchObject({ waistCm: 85 })
})
test('limpar tudo apaga o registro do dia e avisa "Medidas apagadas"', async () => {
  const user = userEvent.setup()
  await save('measurements', [{ id: 'a', date: TODAY, waistCm: 85 }])
  await open()
  await user.clear(await screen.findByLabelText('Cintura'))
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(await screen.findByText('Medidas apagadas')).toBeInTheDocument()
  expect(await load('measurements')).toEqual([])
})
test('salvar sem mudar nada não grava nem diz que salvou', async () => {
  const user = userEvent.setup()
  await save('measurements', [{ id: 'a', date: TODAY, waistCm: 85 }])
  await open()
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  expect(await screen.findByText('Nada mudou')).toBeInTheDocument()
  expect(screen.queryByText('Medidas salvas')).not.toBeInTheDocument()
  expect(await load('measurements')).toEqual([{ id: 'a', date: TODAY, waistCm: 85 }])
})
test('dia vazio sem nada digitado: "Nada mudou" e nada gravado', async () => {
  const user = userEvent.setup()
  await open()
  await user.click(await screen.findByRole('button', { name: 'Salvar' }))
  expect(await screen.findByText('Nada mudou')).toBeInTheDocument()
  expect(await load('measurements')).toBeUndefined()
})
