import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { pe } from '../../test/helpers'
import type { PlanExercise } from './types'
import { ExerciseDrawer } from './ExerciseDrawer'
import { KG } from './limits'

test('séries vão até 20, como no formato: um plano importado com 12 séries segue editável', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  const { rerender } = render(<ExerciseDrawer ex={pe({ sets: 12 })} onChange={onChange} onRemove={vi.fn()} onClose={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'Aumentar séries' }))
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ sets: 13 }))
  rerender(<ExerciseDrawer ex={pe({ sets: 20 })} onChange={onChange} onRemove={vi.fn()} onClose={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'Aumentar séries' })).toBeDisabled()
})

test('B9: a carga digitada não sobrevive quando o exercício muda por outro caminho (reps, outro valor)', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  const props = { onChange, onRemove: vi.fn(), onClose: vi.fn() }
  const { rerender } = render(<ExerciseDrawer {...props} ex={pe({ weightKg: 20 })} />)
  const kg = screen.getByRole('textbox', { name: 'Carga em kg' })
  await user.clear(kg)
  await user.type(kg, '7a')
  expect(kg).toHaveValue('7a')
  rerender(<ExerciseDrawer {...props} ex={pe({ weightKg: 25, reps: '12' })} />)
  expect(screen.getByRole('textbox', { name: 'Carga em kg' })).toHaveValue('25')
})

let current: PlanExercise
function Harness() {
  const [ex, setEx] = useState(pe({ weightKg: 20 }))
  return <ExerciseDrawer ex={ex} onChange={(next) => { current = next; setEx(next) }} onRemove={vi.fn()} onClose={vi.fn()} />
}

test('carga: o texto digitado fica enquanto digita; acima do máximo fica inválido e não grava; o blur mostra o valor', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  const kg = screen.getByRole('textbox', { name: 'Carga em kg' })
  await user.clear(kg)
  await user.type(kg, '22,')
  expect(kg).toHaveValue('22,')
  expect(current.weightKg).toBe(22)
  await user.clear(kg)
  await user.type(kg, `${KG[1] + 1}`)
  expect(kg).toHaveValue(`${KG[1] + 1}`)
  expect(kg).toHaveAttribute('aria-invalid', 'true')
  expect(current.weightKg).toBe(50)
  await user.click(screen.getByRole('button', { name: 'Aumentar séries' }))
  expect(kg).toHaveValue('50')
})
