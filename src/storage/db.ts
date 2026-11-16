import { useCallback, useEffect, useRef, useState } from 'react'
import { delMany, entries, get, keys, set, setMany } from 'idb-keyval'
import type { UserData } from '../types'

type Listener = (v: unknown) => void
const cache = new Map<string, unknown>()
const listeners = new Map<string, Set<Listener>>()

export const resetStoreForTests = () => cache.clear()

const notify = (k: string) => listeners.get(k)?.forEach((fn) => fn(cache.get(k)))

async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    window.dispatchEvent(new CustomEvent('pump:storage-error', { detail: { message } }))
    throw e
  }
}

export async function load<K extends keyof UserData>(k: K): Promise<UserData[K] | undefined> {
  if (cache.has(k)) return cache.get(k) as UserData[K]
  const v = await get<UserData[K]>(k)
  if (v !== undefined) cache.set(k, v)
  return v
}

export async function save<K extends keyof UserData>(k: K, v: UserData[K]): Promise<void> {
  await guarded(() => set(k, v))
  cache.set(k, v)
  notify(k)
}

export async function allData(): Promise<Record<string, unknown>> {
  return Object.fromEntries(await entries<string, unknown>())
}

// grava o novo primeiro e só depois apaga as sobras: uma falha no meio nunca deixa o banco vazio
export async function replaceAll(data: Record<string, unknown>): Promise<void> {
  const old = (await keys<string>()).filter((k) => !(k in data))
  await guarded(async () => {
    await setMany(Object.entries(data))
    await delMany(old)
  })
  const touched = new Set([...Object.keys(data), ...old, ...cache.keys()])
  cache.clear()
  Object.entries(data).forEach(([k, v]) => cache.set(k, v))
  touched.forEach(notify)
}

export async function requestPersist(): Promise<boolean> {
  return (await navigator.storage?.persist?.()) ?? false
}

export function usePersisted<K extends keyof UserData>(
  k: K,
  initial: UserData[K],
): [value: UserData[K], set: (v: UserData[K]) => void, loaded: boolean] {
  const initialRef = useRef(initial)
  const [value, setValue] = useState(initial)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const fn: Listener = (v) => setValue((v as UserData[K] | undefined) ?? initialRef.current)
    if (!listeners.has(k)) listeners.set(k, new Set())
    listeners.get(k)!.add(fn)
    let alive = true
    load(k).then((v) => {
      if (!alive) return
      if (v !== undefined) setValue(v)
      setLoaded(true)
    })
    return () => {
      alive = false
      listeners.get(k)!.delete(fn)
    }
  }, [k])

  // o erro já virou o evento pump:storage-error dentro de save
  const update = useCallback((v: UserData[K]) => void save(k, v).catch(() => {}), [k])
  return [value, update, loaded]
}
