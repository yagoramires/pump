import { act, renderHook } from '@testing-library/react'
import { useEditorDraft } from './useEditorDraft'

test('não avisa na montagem e avisa quando volta ao estado inicial (arrasto desfeito)', () => {
  const a = { n: 1 }
  const b = { n: 2 }
  const onChange = vi.fn()
  const { result } = renderHook(() => useEditorDraft(() => a, onChange))
  expect(onChange).not.toHaveBeenCalled()
  act(() => result.current[1](b))
  act(() => result.current[1](a))
  expect(onChange.mock.calls.map((c) => c[0])).toEqual([b, a])
})
