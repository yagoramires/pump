import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomNav } from './BottomNav'

test('menu tem 3 abas com rótulo acessível e marca a ativa', async () => {
  const onChange = vi.fn()
  render(<BottomNav tab="treino" onChange={onChange} />)
  expect(screen.getByRole('button', { name: 'Treino' })).toHaveAttribute('aria-current', 'page')
  await userEvent.click(screen.getByRole('button', { name: 'Dieta' }))
  expect(onChange).toHaveBeenCalledWith('dieta')
  expect(screen.getByRole('button', { name: 'Evolução' })).toBeInTheDocument()
})
