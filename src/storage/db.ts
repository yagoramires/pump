import { use, useCallback, useSyncExternalStore } from 'react'
import { createStore, entries, get, keys, promisifyRequest, set } from 'idb-keyval'
import { DEFAULTS, USER_KEYS, type UserData } from '@/schema'

type Key = keyof UserData
type Value<K extends Key> = UserData[K]

// Estes são os nomes que o idb-keyval já usava para guardar os dados dos aparelhos.
export const pumpStore = createStore('keyval-store', 'keyval')

// só chaves do schema: fotos não passam pelo cache, loadPhoto lê direto do banco e o base64 aqui só gastaria memória
const cache = new Map<Key, unknown>()
const reads = new Map<Key, Promise<unknown>>()
const listeners = new Map<Key, Set<() => void>>()
const errorListeners = new Set<(message: string) => void>()
let booted: Promise<void> | undefined

export class StorageReadError extends Error {}

export const resetStoreForTests = () => {
  cache.clear()
  reads.clear()
  booted = undefined
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

// o use() do React lê status/value: promise já resolvida não suspende nem num componente que monta depois
const tracked = <T>(p: Promise<T>): Promise<T> => {
  p.then(
    (value) => void Object.assign(p, { status: 'fulfilled', value }),
    (reason) => void Object.assign(p, { status: 'rejected', reason }),
  )
  return p
}

function readKey<K extends Key>(k: K): Promise<Value<K>> {
  const cached = reads.get(k)
  if (cached) return cached as Promise<Value<K>>
  const p = tracked(get<Value<K>>(k, pumpStore).then(
    (v) => {
      if (!cache.has(k) && v !== undefined) cache.set(k, v)
      return current(k)
    },
    (e) => {
      throw new StorageReadError(message(e), { cause: e })
    },
  ))
  // leitura que falhou fica no cache de propósito: apagar faria o use() suspender de novo pra sempre em vez de mostrar o erro; o "Tentar de novo" recarrega a página
  reads.set(k, p)
  return p
}

/** lê todas as chaves e só então roda as migrações, uma vez por carga do store; a mesma promise para quem pedir de novo */
export function boot(migrate: () => Promise<void>): Promise<void> {
  booted ??= tracked(Promise.all(USER_KEYS.map((k) => readKey(k))).then(migrate))
  return booted
}

/** valor atual, ou o padrão do schema se a chave nunca foi gravada (o valor do readKey é o da primeira leitura) */
export async function readCurrent<K extends Key>(k: K): Promise<Value<K>> {
  await readKey(k)
  return current(k)
}

export function save<K extends Key>(k: K, v: Value<K>): Promise<void> {
  cache.set(k, v)
  notify(k)
  return guarded(() => set(k, v, pumpStore))
}

export async function allData(): Promise<Record<string, unknown>> {
  return Object.fromEntries(await entries<string, unknown>(pumpStore))
}

export const hasAnyData = async () => (await keys(pumpStore)).length > 0

/** troca tudo numa transação só; o cache em memória fica velho: quem chama recarrega a página (as migrações só rodam no boot) */
export async function replaceAll(data: Record<string, unknown>): Promise<void> {
  await guarded(() => pumpStore('readwrite', (store) => {
    try {
      store.clear()
      for (const [key, value] of Object.entries(data)) store.put(value, key)
    } catch (error) {
      store.transaction.abort()
      throw error
    }
    return promisifyRequest(store.transaction)
  }))
}

export async function requestPersist(): Promise<void> {
  await navigator.storage?.persist?.()
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
