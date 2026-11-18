import { act, renderHook } from '@testing-library/react'
import { FormatError } from '@/format/envelope'
import { usePastedReview } from './usePastedReview'

const parse = (t: string) => {
  if (!t.startsWith('{')) throw new FormatError(['sem JSON'])
  return t
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0) })

test('digitar espera 400 ms; arquivo revisa na hora, inclusive o mesmo de novo', async () => {
  const review = vi.fn(async (f: string) => f.length)
  const { result } = renderHook(() => usePastedReview(parse, review, 'nf'))
  act(() => result.current.set('{a}'))
  await act(async () => { await vi.advanceTimersByTimeAsync(399) })
  expect(review).not.toHaveBeenCalled()
  await act(async () => { await vi.advanceTimersByTimeAsync(1) })
  expect(result.current.result).toBe(3)

  act(() => result.current.set('{a}', true))
  expect(result.current.result).toBeUndefined()
  await flush()
  expect(review).toHaveBeenCalledTimes(2)
  expect(result.current.result).toBe(3)
})

test('problemas do FormatError viram a lista; outro erro vira failed', async () => {
  const { result } = renderHook(() => usePastedReview(parse, async () => { throw new Error('offline') }, 'nf'))
  act(() => result.current.set('oi', true))
  await flush()
  expect(result.current.problems).toEqual(['sem JSON'])
  act(() => result.current.set('{a}', true))
  expect(result.current.problems).toEqual([])
  await flush()
  expect(result.current.failed).toBe(true)
})

test('revisão antiga que chega depois de editar é descartada; trocar o review não refaz', async () => {
  let resolve!: (n: number) => void
  const { result, rerender } = renderHook(({ n }) => usePastedReview(parse, () => new Promise<number>((r) => { resolve = (x) => r(x + n) }), 'nf'), { initialProps: { n: 0 } })
  act(() => result.current.set('{a}', true))
  await flush()
  expect(result.current.reviewing).toBe(true)
  const late = resolve
  act(() => result.current.set('', true))
  await act(async () => { late(1) })
  expect(result.current.result).toBeUndefined()

  act(() => result.current.set('{b}', true))
  await flush()
  await act(async () => { resolve(5) })
  expect(result.current.result).toBe(5)
  rerender({ n: 100 }) // ex.: alimento criado muda o `foods` lido pela revisão
  await flush()
  expect(result.current.result).toBe(5)
})

test('erro inesperado do parse vira o aviso de não encontrado, não o de falha na revisão', async () => {
  const review = vi.fn(async () => 1)
  const { result } = renderHook(() => usePastedReview(() => { throw new TypeError('x') }, review, 'Não achei'))
  act(() => result.current.set('{a}', true))
  await flush()
  expect(result.current.problems).toEqual(['Não achei'])
  expect(result.current.failed).toBe(false)
  expect(review).not.toHaveBeenCalled()
})
