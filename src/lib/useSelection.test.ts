import { act, renderHook } from '@testing-library/react'
import { useSelection } from './useSelection'

test('liga, marca e desmarca, e desligar esvazia', () => {
  const { result } = renderHook(() => useSelection())
  expect(result.current.on).toBe(false)
  act(() => result.current.start())
  act(() => result.current.toggle('a'))
  act(() => result.current.toggle('b'))
  act(() => result.current.toggle('a'))
  expect(result.current.on).toBe(true)
  expect([...result.current.selected]).toEqual(['b'])
  act(() => result.current.stop())
  expect(result.current.on).toBe(false)
  expect(result.current.selected.size).toBe(0)
})
