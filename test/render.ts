// fora de helpers.ts: o setup importa helpers, e o db.ts carregado ali escaparia do vi.mock('idb-keyval') dos testes
import { act, render, renderHook } from '@testing-library/react'
import { createElement, Suspense, type ReactElement, type ReactNode } from 'react'
import { USER_KEYS } from '../src/schema'
import { readKey } from '../src/storage/db'

const Loaded = ({ children }: { children: ReactNode }) => createElement(Suspense, { fallback: null }, children)
// usePersisted suspende até ler a chave, e o React 19 só sai da suspensão dentro de um act aguardado.
// Lê todas as chaves antes, como o App: um overlay aberto depois por um clique não suspende fora desse act
const readAll = () => Promise.allSettled(USER_KEYS.map((k) => readKey(k)))
export const renderLoaded = async (ui: ReactElement) => {
  await readAll()
  return act(async () => render(ui, { wrapper: Loaded }))
}
export const renderHookLoaded = async <T>(cb: () => T) => {
  await readAll()
  return act(async () => renderHook(cb, { wrapper: Loaded }))
}
