import { useState, type ReactNode } from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderLoaded } from '../../test/render'
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
