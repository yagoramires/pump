import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumberField } from './NumberField'

function Field({ onChange }: { onChange: (n: number | undefined | null) => void }) {
  const [v, setV] = useState<number | undefined>(100)
  return <NumberField aria-label="Gramas" min={1} max={2000} value={v} onChange={(n) => { onChange(n); if (n !== null) setV(n) }} />
}

test('texto fora da faixa devolve o valor de antes da edição, não o último prefixo válido', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  render(<Field onChange={onChange} />)
  const input = screen.getByRole('textbox', { name: 'Gramas' })
  await user.tripleClick(input)
  await user.keyboard('250')
  expect(onChange).toHaveBeenLastCalledWith(250)
  await user.keyboard('0')
  expect(onChange).toHaveBeenLastCalledWith(100)
  expect(input).toHaveValue('2500')
  expect(input).toHaveAttribute('aria-invalid', 'true')
  await user.tab()
  expect(input).toHaveValue('100')
})
