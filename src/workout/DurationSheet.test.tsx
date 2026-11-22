import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DurationSheet } from './DurationSheet'

const inicio = new Date(2026, 10, 16, 23, 30).toISOString()

test('ajustar os minutos mantém o início e move o fim, mesmo passando da meia-noite', async () => {
  const onSave = vi.fn()
  render(<DurationSheet startedAt={inicio} minutes={65} onSave={onSave} onClose={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: 'Aumentar duração' }))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(onSave).toHaveBeenCalledWith(new Date(2026, 10, 17, 0, 40).toISOString())
})

test('digitar os minutos salva essa duração', async () => {
  const onSave = vi.fn()
  render(<DurationSheet startedAt={inicio} minutes={104} onSave={onSave} onClose={() => {}} />)
  const campo = screen.getByRole('textbox', { name: 'Duração em minutos' })
  await userEvent.clear(campo)
  await userEvent.type(campo, '90')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(onSave).toHaveBeenCalledWith(new Date(2026, 10, 17, 1, 0).toISOString())
})
