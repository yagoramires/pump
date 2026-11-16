import { useCallback, useEffect, useRef, useState } from 'react'
import { delMany, entries, get, keys, set, setMany } from 'idb-keyval'
import type { UserData } from '../types'

type Listener = (v: unknown) => void
const cache = new Map<string, unknown>()
const listeners = new Map<string, Set<Listener>>()
// chaves lidas (ou gravadas) com sucesso: só nelas um update pode gravar sem apagar o que está no banco
const known = new Set<string>()

export const resetStoreForTests = () => {
  cache.clear()
  known.clear()
}

const storageError = (message: string, read = false) =>
  window.dispatchEvent(new CustomEvent('pump:storage-error', { detail: read ? { message, read } : { message } }))

const notify = (k: string) => listeners.get(k)?.forEach((fn) => fn(cache.get(k)))

async function guarded<T>(fn: () => Promise<T>, read = false): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    storageError(e instanceof Error ? e.message : String(e), read)
    throw e
  }
}

export async function load<K extends keyof UserData>(k: K): Promise<UserData[K] | undefined> {
  if (cache.has(k)) return cache.get(k) as UserData[K]
  const v = await guarded(() => get<UserData[K]>(k), true)
  known.add(k)
  // um save/replaceAll pode ter terminado enquanto o get rodava: o cache é mais novo
  if (cache.has(k)) return cache.get(k) as UserData[K]
  if (v !== undefined) cache.set(k, v)
  return v
}

// cache antes do await: um save antigo que termina depois nunca volta o cache pra um valor velho
export async function save<K extends keyof UserData>(k: K, v: UserData[K]): Promise<void> {
  cache.set(k, v)
  try {
    await guarded(() => set(k, v))
    known.add(k)
  } finally {
    notify(k) // manda o valor mais novo do cache, não necessariamente v
  }
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
  touched.forEach((k) => known.add(k))
  touched.forEach(notify)
}

export async function requestPersist(): Promise<boolean> {
  return (await navigator.storage?.persist?.()) ?? false
}

export function usePersisted<K extends keyof UserData>(
  k: K,
  initial: UserData[K],
): [value: UserData[K], set: (v: UserData[K] | ((prev: UserData[K]) => UserData[K])) => void, loaded: boolean] {
  const initialRef = useRef(initial)
  const [value, setValue] = useState(initial)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const fn: Listener = (v) => setValue((v as UserData[K] | undefined) ?? initialRef.current)
    if (!listeners.has(k)) listeners.set(k, new Set())
    listeners.get(k)!.add(fn)
    let alive = true
    load(k)
      .then((v) => alive && v !== undefined && setValue(v))
      .catch(() => {}) // o erro já virou pump:storage-error (read); update fica bloqueado
      .finally(() => alive && setLoaded(true))
    return () => {
      alive = false
      listeners.get(k)!.delete(fn)
    }
  }, [k])

  // o erro já virou o evento pump:storage-error dentro de save
  const update = useCallback(
    (v: UserData[K] | ((prev: UserData[K]) => UserData[K])) => {
      // sem ter lido a chave, gravar a partir de initial apagaria o que está no banco
      if (!known.has(k)) return storageError('seus dados ainda não foram lidos')
      // prev vem do cache (não do render), então dois updaters seguidos se acumulam
      const next = typeof v === 'function' ? v(cache.has(k) ? (cache.get(k) as UserData[K]) : initialRef.current) : v
      cache.set(k, next) // síncrono pro próximo updater enxergar; save regrava e avisa
      void save(k, next).catch(() => {})
    },
    [k],
  )
  return [value, update, loaded]
}
