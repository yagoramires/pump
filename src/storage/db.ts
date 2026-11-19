import { use, useCallback, useSyncExternalStore } from 'react'
import { createStore, entries, get, promisifyRequest, set } from 'idb-keyval'
import { DEFAULTS, isUserKey, type UserData } from '@/schema'

type Key = keyof UserData
type Value<K extends Key> = UserData[K]

// Estes são os nomes que o idb-keyval já usava para guardar os dados dos aparelhos.
export const pumpStore = createStore('keyval-store', 'keyval')

// só chaves do schema: fotos não passam pelo cache, loadPhoto lê direto do banco e o base64 aqui só gastaria memória
const cache = new Map<Key, unknown>()
const savesDuringRestore = new Set<Set<Key>>()
const reads = new Map<Key, Promise<unknown>>()
const listeners = new Map<Key, Set<() => void>>()
const errorListeners = new Set<(message: string) => void>()

export class StorageReadError extends Error {}

export const resetStoreForTests = () => {
  cache.clear()
  reads.clear()
}

const current = <K extends Key>(k: K): Value<K> => (cache.has(k) ? cache.get(k) : DEFAULTS[k]) as Value<K>
const notify = (k: Key) => listeners.get(k)?.forEach((fn) => fn())
const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function onStorageError(fn: (message: string) => void): () => void {
  errorListeners.add(fn)
  return () => errorListeners.delete(fn)
}

export async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    errorListeners.forEach((fn) => fn(message(e)))
    throw e
  }
}

export function readKey<K extends Key>(k: K): Promise<Value<K>> {
  const cached = reads.get(k)
  if (cached) return cached as Promise<Value<K>>
  const p = get<Value<K>>(k, pumpStore).then(
    (v) => {
      if (!cache.has(k) && v !== undefined) cache.set(k, v)
      return current(k)
    },
    (e) => {
      throw new StorageReadError(message(e), { cause: e })
    },
  )
  // o use() do React lê status/value: chave já lida não suspende nem num componente que monta depois
  p.then(
    (value) => void Object.assign(p, { status: 'fulfilled', value }),
    (reason) => void Object.assign(p, { status: 'rejected', reason }),
  )
  // leitura que falhou fica no cache de propósito: apagar faria o use() suspender de novo pra sempre em vez de mostrar o erro; o "Tentar de novo" recarrega a página
  reads.set(k, p)
  return p
}

/** valor atual, ou o padrão do schema se a chave nunca foi gravada (o valor do readKey é o da primeira leitura) */
export async function readCurrent<K extends Key>(k: K): Promise<Value<K>> {
  await readKey(k)
  return current(k)
}

/** valor guardado, ou undefined se a chave nunca foi gravada */
export async function load<K extends Key>(k: K): Promise<Value<K> | undefined> {
  await readKey(k)
  return cache.get(k) as Value<K> | undefined
}

export function save<K extends Key>(k: K, v: Value<K>): Promise<void> {
  for (const laterWrites of savesDuringRestore) laterWrites.add(k)
  cache.set(k, v)
  notify(k)
  return guarded(() => set(k, v, pumpStore))
}

export async function allData(): Promise<Record<string, unknown>> {
  return Object.fromEntries(await entries<string, unknown>(pumpStore))
}

export async function replaceAll(data: Record<string, unknown>): Promise<void> {
  const restored = new Map(Object.entries(data))
  const laterWrites = new Set<Key>()
  savesDuringRestore.add(laterWrites)
  try {
    await guarded(() => pumpStore('readwrite', (store) => {
      try {
        store.clear()
        for (const [key, value] of restored) store.put(value, key)
      } catch (error) {
        store.transaction.abort()
        throw error
      }
      return promisifyRequest(store.transaction)
    }))
  } finally {
    savesDuringRestore.delete(laterWrites)
  }

  // Um save enfileirado depois da restauração já atualizou o cache de forma otimista.
  const touched = new Set([...cache.keys(), ...listeners.keys(), ...restored.keys()].filter(isUserKey))
  for (const key of touched) {
    if (laterWrites.has(key)) continue
    if (restored.has(key)) cache.set(key, restored.get(key))
    else cache.delete(key)
  }
  touched.forEach(notify)
}

export async function requestPersist(): Promise<boolean> {
  return (await navigator.storage?.persist?.()) ?? false
}

type Update<K extends Key> = Value<K> | ((prev: Value<K>) => Value<K>)

/** suspende até a chave ser lida; o setter grava na hora (a gravação no banco segue em segundo plano) e devolve o valor novo */
export function usePersisted<K extends Key>(k: K): [value: Value<K>, set: (v: Update<K>) => Value<K>] {
  use(readKey(k))
  const subscribe = useCallback(
    (fn: () => void) => {
      if (!listeners.has(k)) listeners.set(k, new Set())
      listeners.get(k)!.add(fn)
      return () => void listeners.get(k)!.delete(fn)
    },
    [k],
  )
  const value = useSyncExternalStore(subscribe, () => current(k))
  const update = useCallback(
    (v: Update<K>) => {
      const next = typeof v === 'function' ? (v as (prev: Value<K>) => Value<K>)(current(k)) : v
      void save(k, next).catch(() => {}) // guarded já avisou onStorageError
      return next
    },
    [k],
  )
  return [value, update]
}
