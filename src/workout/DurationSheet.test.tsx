import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DurationSheet } from './DurationSheet'

test('o passo soma 5 minutos', async () => {
  const onSave = vi.fn()
  render(<DurationSheet minutes={65} onSave={onSave} onClose={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: 'Aumentar duração' }))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(onSave).toHaveBeenCalledWith(70)
})

test('digitar os minutos salva essa duração', async () => {
  const onSave = vi.fn()
  render(<DurationSheet minutes={104} onSave={onSave} onClose={() => {}} />)
  const campo = screen.getByRole('textbox', { name: 'Duração em minutos' })
  await userEvent.clear(campo)
  await userEvent.type(campo, '90')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(onSave).toHaveBeenCalledWith(90)
})
