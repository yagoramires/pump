import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests } from '../storage/db'
import * as photos from '../storage/photos'
import * as resize from './resize'
import { PhotoCapture } from './PhotoCapture'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
  vi.restoreAllMocks()
  vi.spyOn(resize, 'fileToJpeg').mockResolvedValue('data:image/jpeg;base64,FAKE')
})

test('sem câmera: só galeria com aviso; foto da galeria salva frente e avança pra lado', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
  const user = userEvent.setup()
  render(<PhotoCapture date="2026-11-17" onClose={vi.fn()} />)
  expect(await screen.findByText('Câmera indisponível — escolha da galeria.')).toBeInTheDocument()
  await user.upload(screen.getByLabelText('Escolher da galeria'), new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
  await user.click(await screen.findByRole('button', { name: 'Usar' }))
  await waitFor(async () => expect((await load('photoSets'))?.[0].frente).toBeTruthy())
  expect(screen.getByRole('tab', { name: 'Lado', selected: true })).toBeInTheDocument()
})
test('falha ao salvar a foto não cria registro', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
  vi.spyOn(photos, 'savePhoto').mockRejectedValue(new Error('quota'))
  const user = userEvent.setup()
  render(<PhotoCapture date="2026-11-17" onClose={vi.fn()} />)
  await user.upload(await screen.findByLabelText('Escolher da galeria'), new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
  await user.click(await screen.findByRole('button', { name: 'Usar' }))
  await waitFor(() => expect(photos.savePhoto).toHaveBeenCalled())
  expect((await load('photoSets')) ?? []).toHaveLength(0)
})
test('fechar para as tracks da câmera; Tirar foto só liga com o vídeo pronto', async () => {
  const stop = vi.fn()
  const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] })
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
  const onClose = vi.fn()
  const user = userEvent.setup()
  render(<PhotoCapture date="2026-11-17" onClose={onClose} />)
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'user' } }))
  expect(screen.getByRole('button', { name: 'Tirar foto' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(stop).toHaveBeenCalled()
  expect(onClose).toHaveBeenCalled()
})
test('escolher da galeria durante a contagem cancela o disparo', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  try {
    vi.spyOn(resize, 'videoToJpeg').mockResolvedValue('data:image/jpeg;base64,CAM')
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop() {} }] })
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
    const user = userEvent.setup()
    const { container } = render(<PhotoCapture date="2026-11-17" onClose={vi.fn()} />)
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled())
    fireEvent.loadedData(container.querySelector('video')!)
    await user.click(screen.getByRole('button', { name: 'Temporizador 5 s' }))
    await user.click(screen.getByRole('button', { name: 'Tirar foto' }))
    await user.upload(screen.getByLabelText('Escolher da galeria'), new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByRole('img', { name: 'Prévia: Frente' })).toHaveAttribute('src', 'data:image/jpeg;base64,FAKE')
    await act(async () => { vi.advanceTimersByTime(6000) })
    expect(resize.videoToJpeg).not.toHaveBeenCalled()
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
  render(<PhotoCapture date="2026-11-17" onClose={vi.fn()} />)
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1))
  await user.click(screen.getByRole('button', { name: 'Trocar câmera' }))
  await waitFor(() => expect(getUserMedia).toHaveBeenLastCalledWith({ video: { facingMode: 'user' } }))
  expect(screen.queryByText('Câmera indisponível — escolha da galeria.')).not.toBeInTheDocument()
})
test('mediaDevices sem getUserMedia: aviso da galeria', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true })
  render(<PhotoCapture date="2026-11-17" onClose={vi.fn()} />)
  expect(await screen.findByText('Câmera indisponível — escolha da galeria.')).toBeInTheDocument()
})
