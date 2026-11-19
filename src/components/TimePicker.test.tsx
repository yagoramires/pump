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
  expect(screen.getByRole('button', { name: /^Horário/ })).toHaveTextContent('--:--')
  await user.click(screen.getByRole('button', { name: /^Horário/ }))
  await user.click(screen.getByRole('radio', { name: '07 h' }))
  await user.click(screen.getByRole('radio', { name: '30 min' }))
  expect(onChange).toHaveBeenLastCalledWith('07:30')
  expect(screen.getByRole('button', { name: /^Horário/ })).toHaveTextContent('07:30')
})

test('mostra o valor atual, inclui minuto fora do passo de 5 e limpa', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  render(<Host initial="06:42" onChange={onChange} />)
  expect(screen.getByRole('button', { name: /^Horário/ })).toHaveTextContent('06:42')
  await user.click(screen.getByRole('button', { name: /^Horário/ }))
  expect(screen.getByRole('radio', { name: '42 min' })).toBeChecked()
  await user.click(screen.getByRole('button', { name: 'Limpar' }))
  expect(onChange).toHaveBeenLastCalledWith(undefined)
})

test('minuto antes da hora não grava nem fecha; a hora completa e fecha', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  render(<Host onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: /^Horário/ }))
  await user.click(screen.getByRole('radio', { name: '30 min' }))
  expect(onChange).not.toHaveBeenCalled()
  expect(screen.getByRole('radio', { name: '07 h' })).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: '07 h' }))
  expect(onChange).toHaveBeenLastCalledWith('07:30')
  expect(screen.queryByRole('radio', { name: '07 h' })).not.toBeInTheDocument()
})

test('centraliza o valor atual rolando só a coluna, sem scrollIntoView', async () => {
  const user = userEvent.setup()
  const into = vi.fn()
  Element.prototype.scrollIntoView = into
  const rect = (top: number, height: number) => ({ top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON() {} }) as DOMRect
  const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.dataset.state === 'on' ? rect(500, 44) : rect(100, 224)
  })
  const clientSpy = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(224)
  render(<Host initial="06:30" onChange={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: /^Horário/ }))
  const vp = screen.getByRole('radiogroup', { name: 'Horas' }).closest('[data-slot=scroll-area-viewport]') as HTMLElement
  expect(vp.scrollTop).toBe(500 - 100 - (224 - 44) / 2)
  expect(into).not.toHaveBeenCalled()
  rectSpy.mockRestore(); clientSpy.mockRestore()
  delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
})
