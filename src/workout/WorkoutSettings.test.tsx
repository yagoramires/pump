import { useState, type ReactNode } from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderLoaded } from '../../test/render'
import { Toaster } from '@/components/ui/sonner'
import { save } from '@/storage/db'
import { COPY_FAIL } from '@/lib/share'
import { planWith } from '../../test/helpers'
import { WorkoutSettings } from './WorkoutSettings'

function Settings() {
  const [view, setView] = useState<ReactNode>()
  return view ?? <WorkoutSettings open={(next) => setView(next)} />
}

test('linhas Gerar com IA e Converter abrem cada tela', async () => {
  const user = userEvent.setup()
  await renderLoaded(<Settings />)
  await user.click(await screen.findByRole('button', { name: /Gerar com IA/ }))
  expect(await screen.findByRole('heading', { name: 'Gerar com IA' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  await user.click(await screen.findByRole('button', { name: 'Converter' }))
  expect(await screen.findByRole('heading', { name: 'Converter ficha' })).toBeInTheDocument()
})

const writeText = vi.fn<(text: string) => Promise<void>>(async () => {})
// depois do userEvent.setup(), que troca o clipboard pelo dele
const setupUser = () => {
  const user = userEvent.setup()
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  return user
}

test('Ajustar com IA copia o prompt com o plano salvo e avisa', async () => {
  writeText.mockClear()
  await save('workoutPlan', planWith([{ name: 'Remada curvada (barra)' }]))
  const user = setupUser()
  await renderLoaded(<><Settings /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: /Ajustar com IA/ }))
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('"nome": "Remada curvada (barra)"'))
  expect(await screen.findByText('Plano copiado. Cole na IA e peça os ajustes.')).toBeInTheDocument()
})

test('Ajustar com IA: clipboard negado mostra o erro', async () => {
  const user = setupUser()
  writeText.mockRejectedValueOnce(new Error('denied'))
  await renderLoaded(<><Settings /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: /Ajustar com IA/ }))
  expect(await screen.findByText(COPY_FAIL)).toBeInTheDocument()
})
