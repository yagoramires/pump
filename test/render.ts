// fora de helpers.ts: o setup importa helpers, e o db.ts carregado ali escaparia do vi.mock('idb-keyval') dos testes
import { act, render, renderHook } from '@testing-library/react'
import { createElement, Suspense, type ReactElement, type ReactNode } from 'react'
import { migrateOnBoot } from '../src/profile/migrate'
import { boot } from '../src/storage/db'

const Loaded = ({ children }: { children: ReactNode }) => createElement(Suspense, { fallback: null }, children)
// usePersisted suspende até ler a chave, e o React 19 só sai da suspensão dentro de um act aguardado.
// Faz o mesmo boot do App antes: um overlay aberto depois por um clique não suspende fora desse act.
// O erro de leitura quem mostra é o use() do componente
const readAll = () => boot(migrateOnBoot).catch(() => {})
export const renderLoaded = async (ui: ReactElement) => {
  await readAll()
  return act(async () => render(ui, { wrapper: Loaded }))
}
export const renderHookLoaded = async <T>(cb: () => T) => {
  await readAll()
  return act(async () => renderHook(cb, { wrapper: Loaded }))
}
