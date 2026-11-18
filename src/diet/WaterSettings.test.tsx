import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { renderLoaded } from '../../test/render'
import { load, resetStoreForTests, save } from '@/storage/db'
import { WaterSettings } from './WaterSettings'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

test('liga com a meta pelo peso, grava meta e copo válidos, e religar mantém o ajuste', async () => {
  await save('settings', { lastTab: 'dieta', onboardingDone: true })
  await save('profile', { sex: 'M', heightCm: 180 })
  await save('measurements', [{ id: 'm', date: '2026-11-17', weightKg: 80 }])
  resetStoreForTests()
  const user = userEvent.setup()
  await renderLoaded(<WaterSettings />)
  const sw = screen.getByRole('switch', { name: 'Contador de água' })
  expect(sw).toHaveAttribute('aria-checked', 'false')
  await user.click(sw)
  await waitFor(async () => expect((await load('settings'))?.water).toEqual({ enabled: true, goalMl: 2750, cupMl: 250 }))
  const meta = screen.getByRole('textbox', { name: 'Meta (ml)' })
  await user.clear(meta)
  await user.type(meta, '3000')
  await waitFor(async () => expect((await load('settings'))?.water?.goalMl).toBe(3000))
  await user.clear(screen.getByRole('textbox', { name: 'Copo (ml)' }))
  await user.type(screen.getByRole('textbox', { name: 'Copo (ml)' }), '300')
  await waitFor(async () => expect((await load('settings'))?.water?.cupMl).toBe(300))
  await user.click(screen.getByRole('switch', { name: 'Contador de água' }))
  await waitFor(async () => expect((await load('settings'))?.water).toEqual({ enabled: false, goalMl: 3000, cupMl: 300 }))
  await user.click(screen.getByRole('switch', { name: 'Contador de água' }))
  await waitFor(async () => expect((await load('settings'))?.water).toEqual({ enabled: true, goalMl: 3000, cupMl: 300 }))
})
