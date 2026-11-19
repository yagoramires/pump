import type { Exercise, TacoFood } from './types'
import { CATALOG_DIR, EXERCISES_JSON, IMAGE_BASE, TACO_JSON } from './urls'

export const imageUrl = (path: string): string => IMAGE_BASE + path

export const catalogFile = (file: string): Promise<Response> =>
  fetch(import.meta.env.BASE_URL + CATALOG_DIR + file).then((res) => { if (!res.ok) throw new Error(String(res.status)); return res })

/** sem internet ou HTTP com erro: quem usa o catálogo segue sem ele */
export class CatalogUnavailable extends Error {}

/** catálogo fora do ar vira null pra seguir sem ele; outro erro sobe */
export const catalogOrNull = <T>(p: Promise<T>): Promise<T | null> =>
  p.catch((e: unknown) => {
    if (e instanceof CatalogUnavailable) return null
    throw e
  })

const memo = new Map<string, Promise<unknown[]>>()
function getJson<T>(file: string): Promise<T[]> {
  if (!memo.has(file)) {
    const p = catalogFile(file)
      .then((res) => res.json() as Promise<unknown[]>)
      .catch(() => {
        memo.delete(file)
        throw new CatalogUnavailable('Sem internet para carregar o catálogo')
      })
    memo.set(file, p)
  }
  return memo.get(file) as Promise<T[]>
}

export const fetchExercises = () => getJson<Exercise>(EXERCISES_JSON)
export const fetchTaco = () => getJson<TacoFood>(TACO_JSON)
