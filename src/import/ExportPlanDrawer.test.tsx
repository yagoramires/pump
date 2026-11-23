import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderLoaded } from '../../test/render'
import { planWith, setupClipboard } from '../../test/helpers'
import { Toaster } from '@/components/ui/sonner'
import { EDITOR_URL } from '@/catalog/urls'
import { ExportPlanDrawer } from './ExportPlanDrawer'

const file = { workout: planWith([{ name: 'Supino reto' }]) }

test('Copiar copia o arquivo do Pump com a origem marcada', async () => {
  const { user, writeText } = setupClipboard()
  await renderLoaded(<><ExportPlanDrawer file={file} onClose={vi.fn()} /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: 'Copiar' }))
  const text = writeText.mock.calls[0][0] as string
  expect(JSON.parse(text)).toMatchObject({ formato: 'pump-plano', origem: 'pump', treinos: [expect.objectContaining({ letra: 'A' })] })
  expect(await screen.findByText('Plano copiado.')).toBeInTheDocument()
})

test('Gerar arquivo compartilha um .json com o nome do que tem dentro', async () => {
  const user = userEvent.setup()
  const share = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
  Object.defineProperty(navigator, 'share', { value: share, configurable: true })
  onTestFinished(() => {
    delete (navigator as Partial<Navigator>).canShare
    delete (navigator as Partial<Navigator>).share
  })
  await renderLoaded(<ExportPlanDrawer file={file} onClose={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Gerar arquivo' }))
  const shared = share.mock.calls[0][0].files[0] as File
  expect(shared.name).toMatch(/^pump-treino-\d{4}-\d{2}-\d{2}\.json$/)
  expect(JSON.parse(await shared.text())).toMatchObject({ origem: 'pump' })
})

test('mostra o endereço do editor no computador', async () => {
  await renderLoaded(<ExportPlanDrawer file={file} onClose={vi.fn()} />)
  expect(await screen.findByText(EDITOR_URL.replace('https://', ''))).toBeInTheDocument()
})
