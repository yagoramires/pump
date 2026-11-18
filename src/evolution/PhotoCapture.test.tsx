import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import userEvent from '@testing-library/user-event'
import { clear, set } from 'idb-keyval'
import { load, resetStoreForTests } from '@/storage/db'
import { isPhotoKey, loadPhoto } from '@/storage/photos'
import { Toaster } from '@/components/ui/sonner'
import { PhotoCapture } from './PhotoCapture'

// o jsdom não decodifica imagem nem desenha vídeo no canvas
vi.mock('./resize', () => ({ fileToJpeg: async () => 'data:image/jpeg;base64,FAKE', videoToJpeg: async () => 'data:image/jpeg;base64,CAM' }))
vi.mock('idb-keyval', async (orig) => {
  const m = await orig<typeof import('idb-keyval')>()
  return { ...m, set: vi.fn(m.set) }
})

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})
afterEach(() => {
  delete (navigator as { mediaDevices?: unknown }).mediaDevices
  vi.mocked(set).mockReset()
})

test('sem câmera: só galeria com aviso; foto da galeria salva frente e avança pra lado', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
  const user = userEvent.setup()
  await renderLoaded(<PhotoCapture date="2026-11-17" onClose={vi.fn()} />)
  expect(await screen.findByText('Câmera indisponível — escolha da galeria.')).toBeInTheDocument()
  await user.upload(screen.getByLabelText('Escolher da galeria'), new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
  await user.click(await screen.findByRole('button', { name: 'Usar' }))
  await waitFor(async () => expect((await load('photoSets'))?.[0].frente).toBeTruthy())
  expect(await loadPhoto((await load('photoSets'))![0].frente!)).toBe('data:image/jpeg;base64,FAKE')
  expect(screen.getByRole('tab', { name: 'Lado', selected: true })).toBeInTheDocument()
})
test('falha ao salvar a foto não cria registro', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
  const realSet = vi.mocked(set).getMockImplementation()!
  vi.mocked(set).mockImplementation((k, v) => (isPhotoKey(String(k)) ? Promise.reject(new Error('quota')) : realSet(k, v)))
  const user = userEvent.setup()
  await renderLoaded(<><PhotoCapture date="2026-11-17" onClose={vi.fn()} /><Toaster /></>)
  await user.upload(await screen.findByLabelText('Escolher da galeria'), new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
  await user.click(await screen.findByRole('button', { name: 'Usar' }))
  expect(await screen.findByText('Não consegui salvar a foto')).toBeInTheDocument()
  expect((await load('photoSets')) ?? []).toHaveLength(0)
})
test('fechar para as tracks da câmera; Tirar foto só liga com o vídeo pronto', async () => {
  const stop = vi.fn()
  const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] })
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
  const onClose = vi.fn()
  const user = userEvent.setup()
  await renderLoaded(<PhotoCapture date="2026-11-17" onClose={onClose} />)
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'user' } }))
  expect(screen.getByRole('button', { name: 'Tirar foto' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(stop).toHaveBeenCalled()
  expect(onClose).toHaveBeenCalled()
})
test('escolher da galeria durante a contagem cancela o disparo', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  try {
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop() {} }] })
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
    const user = userEvent.setup()
    const { container } = await renderLoaded(<PhotoCapture date="2026-11-17" onClose={vi.fn()} />)
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled())
    fireEvent.loadedData(container.querySelector('video')!)
    await user.click(screen.getByRole('button', { name: 'Temporizador 5 s' }))
    await user.click(screen.getByRole('button', { name: 'Tirar foto' }))
    await user.upload(screen.getByLabelText('Escolher da galeria'), new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByRole('img', { name: 'Prévia: Frente' })).toHaveAttribute('src', 'data:image/jpeg;base64,FAKE')
    await act(async () => { vi.advanceTimersByTime(6000) })
    expect(screen.getByRole('img', { name: 'Prévia: Frente' })).toHaveAttribute('src', 'data:image/jpeg;base64,FAKE')
  } finally {
    vi.useRealTimers()
  }
})
test('sem câmera traseira: volta pra frontal em vez de cair na galeria', async () => {
  const getUserMedia = vi.fn((c: { video: { facingMode: string } }) =>
    c.video.facingMode === 'environment' ? Promise.reject(new Error('NotFound')) : Promise.resolve({ getTracks: () => [{ stop() {} }] }))
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
  const user = userEvent.setup()
  await renderLoaded(<PhotoCapture date="2026-11-17" onClose={vi.fn()} />)
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1))
  await user.click(screen.getByRole('button', { name: 'Trocar câmera' }))
  await waitFor(() => expect(getUserMedia).toHaveBeenLastCalledWith({ video: { facingMode: 'user' } }))
  expect(screen.queryByText('Câmera indisponível — escolha da galeria.')).not.toBeInTheDocument()
})
test('mediaDevices sem getUserMedia: aviso da galeria', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true })
  await renderLoaded(<PhotoCapture date="2026-11-17" onClose={vi.fn()} />)
  expect(await screen.findByText('Câmera indisponível — escolha da galeria.')).toBeInTheDocument()
})
