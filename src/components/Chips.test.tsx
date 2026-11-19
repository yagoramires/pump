import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chips, MultiChips } from './Chips'

test('opções numéricas devolvem número; tocar de novo desmarca', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  const { rerender } = render(<Chips label="Dias" options={[1, 2, 3]} value={undefined} onChange={onChange} />)
  await user.click(screen.getByRole('radio', { name: '2' }))
  expect(onChange).toHaveBeenLastCalledWith(2)
  rerender(<Chips label="Dias" options={[1, 2, 3]} value={2} onChange={onChange} />)
  expect(screen.getByRole('radio', { name: '2' })).toBeChecked()
  await user.click(screen.getByRole('radio', { name: '2' }))
  expect(onChange).toHaveBeenLastCalledWith(undefined)
})

test('várias escolhas guardam a ordem em que foram tocadas', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  render(<MultiChips<'peito' | 'costas'> label="Fracos" options={{ peito: 'Peito', costas: 'Costas' }} value={['costas']} onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: 'Peito' }))
  expect(onChange).toHaveBeenLastCalledWith(['costas', 'peito'])
})

test('optional mostra "opcional" sem mudar o nome do grupo', () => {
  render(<Chips label="Dias de treino por semana" options={[1, 2, 3] as const} optional onChange={vi.fn()} />)
  expect(screen.getByText('opcional')).toBeInTheDocument()
  expect(screen.getByRole('radiogroup', { name: 'Dias de treino por semana' })).toBeInTheDocument()
})
