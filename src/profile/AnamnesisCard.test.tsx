import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderLoaded } from '../../test/render'
import { seedStore } from '../../test/store'
import { AnamnesisCard } from './AnamnesisCard'

test('cartão de anamnese aparece para quem não completou e, dispensado, não volta', async () => {
  const user = userEvent.setup()
  await seedStore({ settings: { lastTab: 'evolucao', onboardingDone: true } })
  const { unmount } = await renderLoaded(<AnamnesisCard onStart={vi.fn()} />)
  expect(screen.getByText('Complete sua anamnese')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Dispensar' }))
  expect(screen.queryByText('Complete sua anamnese')).not.toBeInTheDocument()
  unmount()
  await renderLoaded(<AnamnesisCard onStart={vi.fn()} />)
  expect(screen.queryByText('Complete sua anamnese')).not.toBeInTheDocument()
})
