import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { load, resetStoreForTests, save } from './storage/db'
import App from './App'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

test('primeira vez abre a montagem; pular leva à aba Treino; depois abre na última aba', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<App />)
  expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Pular' })) // perfil
  await user.click(screen.getByRole('button', { name: 'Pular' })) // treino
  expect(await screen.findByRole('button', { name: 'Treino' })).toHaveAttribute('aria-current', 'page')
  await waitFor(async () => expect((await load('settings'))?.onboardingDone).toBe(true))
  unmount()
  resetStoreForTests()
  await save('settings', { ...(await load('settings'))!, lastTab: 'dieta' })
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Dieta' })).toBeInTheDocument()
  expect(screen.getByText('Em breve')).toBeInTheDocument()
})
