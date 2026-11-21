import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderLoaded } from '../../test/render'
import { seedStore, stored } from '../../test/store'
import { todayKey } from '@/lib/date'
import { WaterSettings } from './WaterSettings'


test('liga com a meta pelo peso, grava a meta válida, e religar mantém o ajuste', async () => {
  await seedStore({
    settings: { lastTab: 'dieta', onboardingDone: true },
    profile: { sex: 'M', heightCm: 180 },
    measurements: [{ id: 'm', date: '2026-11-17', weightKg: 80 }],
  })
  const user = userEvent.setup()
  const { unmount } = await renderLoaded(<WaterSettings />)
  const sw = () => screen.getByRole('switch', { name: 'Contador de água' })
  const meta = () => screen.getByRole('textbox', { name: 'Meta (ml)' })
  expect(sw()).toHaveAttribute('aria-checked', 'false')
  await user.click(sw())
  expect(await screen.findByRole('textbox', { name: 'Meta (ml)' })).toHaveValue('2750')
  expect(screen.queryByRole('textbox', { name: 'Copo (ml)' })).toBeNull()
  await user.clear(meta())
  await user.type(meta(), '3000')
  await user.click(sw())
  expect(screen.queryByRole('textbox', { name: 'Meta (ml)' })).not.toBeInTheDocument()
  await user.click(sw())
  expect(meta()).toHaveValue('3000')
  await waitFor(async () => expect((await stored('settings'))?.water).toEqual({ enabled: true, goalMl: 3000 }))
  unmount()
  await renderLoaded(<WaterSettings />)
  expect(sw()).toHaveAttribute('aria-checked', 'true')
  expect(meta()).toHaveValue('3000')
})

test('mudar a meta atualiza a meta gravada no dia de hoje', async () => {
  const today = todayKey()
  await seedStore({
    settings: { lastTab: 'dieta', onboardingDone: true, water: { enabled: true, goalMl: 2000 } },
    waterLog: { [today]: { ml: 2000, goalMl: 2000 } },
  })
  const user = userEvent.setup()
  await renderLoaded(<WaterSettings />)
  const meta = screen.getByRole('textbox', { name: 'Meta (ml)' })
  await user.clear(meta)
  await user.type(meta, '3000')
  await waitFor(async () => expect((await stored('waterLog'))?.[today]).toEqual({ ml: 2000, goalMl: 3000 }))
})
