import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderLoaded } from '../../test/render'
import { seedStore, stored } from '../../test/store'
import { WaterSettings } from './WaterSettings'


test('liga com a meta pelo peso, grava meta e copo válidos, e religar mantém o ajuste', async () => {
  await seedStore({
    settings: { lastTab: 'dieta', onboardingDone: true },
    profile: { sex: 'M', heightCm: 180 },
    measurements: [{ id: 'm', date: '2026-11-17', weightKg: 80 }],
  })
  const user = userEvent.setup()
  const { unmount } = await renderLoaded(<WaterSettings />)
  const sw = () => screen.getByRole('switch', { name: 'Contador de água' })
  const meta = () => screen.getByRole('textbox', { name: 'Meta (ml)' })
  const copo = () => screen.getByRole('textbox', { name: 'Copo (ml)' })
  expect(sw()).toHaveAttribute('aria-checked', 'false')
  await user.click(sw())
  expect(await screen.findByRole('textbox', { name: 'Meta (ml)' })).toHaveValue('2750')
  expect(copo()).toHaveValue('250')
  await user.clear(meta())
  await user.type(meta(), '3000')
  await user.clear(copo())
  await user.type(copo(), '300')
  await user.click(sw())
  expect(screen.queryByRole('textbox', { name: 'Meta (ml)' })).not.toBeInTheDocument()
  await user.click(sw())
  expect(meta()).toHaveValue('3000')
  expect(copo()).toHaveValue('300')
  await waitFor(async () => expect((await stored('settings'))?.water).toEqual({ enabled: true, goalMl: 3000, cupMl: 300 }))
  unmount()
  await renderLoaded(<WaterSettings />)
  expect(sw()).toHaveAttribute('aria-checked', 'true')
  expect(meta()).toHaveValue('3000')
})
