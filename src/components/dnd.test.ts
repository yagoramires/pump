import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { useDragUndo } from './dnd'

test('cancelar o arrasto devolve o estado de quando ele começou; soltar num alvo mantém', () => {
  const { result } = renderHook(() => {
    const [v, setV] = useState(['a', 'b'])
    return { v, setV, undo: useDragUndo(v, setV) }
  })
  act(() => result.current.undo.start())
  act(() => result.current.setV(['b', 'a']))
  act(() => result.current.undo.cancel())
  expect(result.current.v).toEqual(['a', 'b'])
  act(() => result.current.undo.start())
  act(() => result.current.setV(['b', 'a']))
  act(() => result.current.undo.end())
  act(() => result.current.undo.cancel())
  expect(result.current.v).toEqual(['b', 'a'])
})
