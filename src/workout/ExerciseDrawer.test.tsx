import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pe } from '../../test/helpers'
import { ExerciseDrawer } from './ExerciseDrawer'

test('séries vão até 20, como no formato: um plano importado com 12 séries segue editável', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  const { rerender } = render(<ExerciseDrawer open ex={pe({ sets: 12 })} onChange={onChange} onRemove={vi.fn()} onClose={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'Aumentar séries' }))
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ sets: 13 }))
  rerender(<ExerciseDrawer open ex={pe({ sets: 20 })} onChange={onChange} onRemove={vi.fn()} onClose={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'Aumentar séries' })).toBeDisabled()
})
