import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimePicker } from './TimePicker'

function Host({ initial, onChange }: { initial?: string; onChange: (v?: string) => void }) {
  const [v, setV] = useState(initial)
  return <TimePicker aria-label="Horário" clearable value={v} onChange={(x) => { setV(x); onChange(x) }} />
}

test('escolher hora e depois minuto entrega HH:MM', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  render(<Host onChange={onChange} />)
  expect(screen.getByRole('button', { name: 'Horário' })).toHaveTextContent('--:--')
  await user.click(screen.getByRole('button', { name: 'Horário' }))
  await user.click(screen.getByRole('button', { name: '07 h' }))
  await user.click(screen.getByRole('button', { name: '30 min' }))
  expect(onChange).toHaveBeenLastCalledWith('07:30')
  expect(screen.getByRole('button', { name: 'Horário' })).toHaveTextContent('07:30')
})

test('mostra o valor atual, inclui minuto fora do passo de 5 e limpa', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  render(<Host initial="06:42" onChange={onChange} />)
  expect(screen.getByRole('button', { name: 'Horário' })).toHaveTextContent('06:42')
  await user.click(screen.getByRole('button', { name: 'Horário' }))
  expect(screen.getByRole('button', { name: '42 min' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('button', { name: 'Limpar' }))
  expect(onChange).toHaveBeenLastCalledWith(undefined)
})
