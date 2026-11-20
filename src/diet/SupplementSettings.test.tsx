import { useState, type ReactNode } from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderLoaded } from '../../test/render'
import { seedStore, stored } from '../../test/store'
import { DEFAULTS } from '@/schema'
import { todayKey } from '@/lib/date'
import { DietSettings } from './DietSettings'

function Settings() {
  const [view, setView] = useState<ReactNode>()
  return view ?? <DietSettings open={(next) => setView(next)} />
}

test('adiciona com nome, dose e quando; espaços viram ausentes', async () => {
  const user = userEvent.setup()
  await renderLoaded(<Settings />)
  await user.click(await screen.findByRole('button', { name: /^Suplementos\s*Nenhum/ }))
  await user.click(await screen.findByRole('button', { name: 'Adicionar suplemento' }))
  const salvar = await screen.findByRole('button', { name: 'Salvar' })
  expect(salvar).toBeDisabled()
  await user.type(screen.getByRole('textbox', { name: 'Nome' }), '   ')
  expect(salvar).toBeDisabled()
  await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Creatina  ')
  await user.type(screen.getByRole('textbox', { name: 'Dose' }), '5 g')
  await user.type(screen.getByRole('textbox', { name: 'Quando' }), '   ')
  await user.click(salvar)
  expect(await screen.findByRole('button', { name: /Creatina\s*5 g/ })).toBeInTheDocument()
  await waitFor(async () => expect((await stored('settings'))?.supplements).toEqual([{ id: expect.any(String), name: 'Creatina', dose: '5 g' }]))
})

test('editar renomeia e remover tira da lista e do dia de hoje', async () => {
  const today = todayKey()
  await seedStore({
    settings: { ...DEFAULTS.settings, supplements: [{ id: 'a', name: 'Creatina' }, { id: 'b', name: 'Vitamina D' }] },
    supplementLog: { [today]: { taken: ['a', 'b'], total: 2 } },
  })
  const user = userEvent.setup()
  await renderLoaded(<Settings />)
  await user.click(await screen.findByRole('button', { name: /^Suplementos\s*2 suplementos/ }))
  await user.click(await screen.findByRole('button', { name: /Vitamina D/ }))
  const nome = await screen.findByRole('textbox', { name: 'Nome' })
  await user.clear(nome)
  await user.type(nome, 'Vitamina D3')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await user.click(await screen.findByRole('button', { name: /Creatina/ }))
  await user.click(await screen.findByRole('button', { name: 'Remover suplemento' }))
  expect(await screen.findByRole('button', { name: /Vitamina D3/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Creatina/ })).not.toBeInTheDocument()
  await waitFor(async () => expect((await stored('settings'))?.supplements).toEqual([{ id: 'b', name: 'Vitamina D3' }]))
  expect((await stored('supplementLog'))?.[today]).toEqual({ taken: ['b'], total: 1 })
})
