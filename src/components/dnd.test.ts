import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import type { DragStartEvent, Over } from '@dnd-kit/core'
import { useEditorDrag } from './dnd'

const setup = () => renderHook(() => {
  const [v, setV] = useState(['a', 'b'])
  return { v, setV, drag: useEditorDrag(v, setV) }
})
const start = (r: ReturnType<typeof setup>['result']) => act(() => r.current.drag.context.onDragStart({ active: { id: 'a' } } as DragStartEvent))
const moved = (r: ReturnType<typeof setup>['result']) => act(() => r.current.setV(['b', 'a']))

test('Esc devolve o estado do começo do arrasto', () => {
  const { result } = setup()
  start(result)
  expect(result.current.drag.dragging).toBe('a')
  moved(result)
  act(() => result.current.drag.context.onDragCancel())
  expect(result.current.v).toEqual(['a', 'b'])
  expect(result.current.drag.dragging).toBeUndefined()
})

test('soltar fora de tudo desfaz e avisa; soltar num alvo mantém', () => {
  const { result } = setup()
  start(result)
  moved(result)
  let landed = true
  act(() => { landed = result.current.drag.finish(null) })
  expect(landed).toBe(false)
  expect(result.current.v).toEqual(['a', 'b'])
  start(result)
  moved(result)
  act(() => { landed = result.current.drag.finish({ id: 'b' } as Over) })
  expect(landed).toBe(true)
  expect(result.current.v).toEqual(['b', 'a'])
})
