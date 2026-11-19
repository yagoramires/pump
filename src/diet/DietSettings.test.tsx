import { useState, type ReactNode } from 'react'
import { screen } from '@testing-library/react'
import { renderLoaded } from '../../test/render'
import { setupClipboard } from '../../test/helpers'
import { Toaster } from '@/components/ui/sonner'
import { save } from '@/storage/db'
import { COPY_FAIL } from '@/lib/share'
import type { DietPlan } from './types'
import { DietSettings } from './DietSettings'

function Settings() {
  const [view, setView] = useState<ReactNode>()
  return view ?? <DietSettings open={(next) => setView(next)} />
}

const plan: DietPlan = { menus: [{ id: 'A', name: 'Corte', meals: [{ id: 'm', name: 'Café', time: '07:00', options: [{ id: 'o', items: [{ id: 'arroz', name: 'Arroz', grams: 100, per100: { kcal: 1, p: 1, c: 1, f: 1 }, source: 'custom' }] }] }] }], lastMenuId: 'A' }

test('Ajustar com IA copia o prompt com a dieta salva e avisa', async () => {
  await save('dietPlan', plan)
  const { user, writeText } = setupClipboard()
  await renderLoaded(<><Settings /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: /Ajustar com IA/ }))
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('"Corte"'))
  expect(await screen.findByText('Plano copiado. Cole na IA e peça os ajustes.')).toBeInTheDocument()
})

test('Ajustar com IA: clipboard negado mostra o erro', async () => {
  const { user, writeText } = setupClipboard()
  writeText.mockRejectedValueOnce(new Error('denied'))
  await renderLoaded(<><Settings /><Toaster /></>)
  await user.click(await screen.findByRole('button', { name: /Ajustar com IA/ }))
  expect(await screen.findByText(COPY_FAIL)).toBeInTheDocument()
})
