import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { readCurrent, resetStoreForTests, save } from '@/storage/db'
import { addDays, todayKey, weekday } from '@/lib/date'
import { renderLoaded } from '../../test/render'
import { EvolutionTab } from './EvolutionTab'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})
const today = todayKey()
const settings = (over: object) => save('settings', { lastTab: 'evolucao', onboardingDone: true, anamnesisAt: today, ...over })
const old = [{ id: 'a', date: addDays(today, -7), weightKg: 82.4 }]

test('cartão de anamnese aparece para quem não completou e some ao dispensar', async () => {
  const user = userEvent.setup()
  await settings({ anamnesisAt: undefined })
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByText('Complete sua anamnese')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Dispensar' }))
  expect(screen.queryByText('Complete sua anamnese')).not.toBeInTheDocument()
  expect(await readCurrent('settings')).toMatchObject({ anamnesisAt: today })
})

test('cartão de check-in no dia e fluxo até o resumo', async () => {
  const user = userEvent.setup()
  await settings({ checkInDay: weekday(today) })
  await save('measurements', old)
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByText(/^Hoje é .*, seu dia de atualizar\.$/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Atualizar' }))
  await user.type(screen.getByLabelText('Peso'), '81,6')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.getByText('−0,8 kg')).toBeInTheDocument()
  expect(screen.getByText(/desde a semana passada · 81,6 kg/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Pronto' }))
  expect(screen.queryByText('Atualizar semana')).not.toBeInTheDocument()
})

test('check-in atrasado diz "Era"', async () => {
  await settings({ checkInDay: weekday(addDays(today, -1)) })
  await save('measurements', [{ id: 'a', date: addDays(today, -8), weightKg: 82.4 }])
  await renderLoaded(<EvolutionTab />)
  expect(await screen.findByText(/^Era /)).toBeInTheDocument()
})
