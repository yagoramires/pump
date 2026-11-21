import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { startSession } from './session'
import { DurationSheet } from './DurationSheet'
import { pe } from '../../test/helpers'

const sessao = (startedAt: Date, endedAt: Date) => ({
  ...startSession({ id: 'a', label: 'A', name: 'Peito', exercises: [pe({ name: 'Supino' })] }, '2026-11-16'),
  startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(),
})

test('treino que passa da meia-noite salva com o fim no dia seguinte', async () => {
  const onSave = vi.fn()
  render(<DurationSheet session={sessao(new Date(2026, 10, 16, 23, 30), new Date(2026, 10, 17, 0, 40))} onSave={onSave} onClose={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  const [start, end] = onSave.mock.calls[0]
  expect(start).toBe(new Date(2026, 10, 16, 23, 30).toISOString())
  expect(end).toBe(new Date(2026, 10, 17, 0, 40).toISOString())
  expect((Date.parse(end) - Date.parse(start)) / 60000).toBe(70)
})

test('início igual ao fim não salva', () => {
  const t = new Date(2026, 10, 16, 18, 0)
  render(<DurationSheet session={sessao(t, t)} onSave={() => {}} onClose={() => {}} />)
  expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
})
