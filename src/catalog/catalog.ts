import type { Exercise, TacoFood } from './types'
import { CATALOG_DIR, EXERCISES_JSON, IMAGE_BASE, TACO_JSON } from './urls'

export const imageUrl = (path: string): string => IMAGE_BASE + path

export const catalogFile = (file: string): Promise<Response> =>
  fetch(import.meta.env.BASE_URL + CATALOG_DIR + file).then((res) => { if (!res.ok) throw new Error(String(res.status)); return res })

/** sem internet ou HTTP com erro: quem usa o catálogo segue sem ele */
export const catalogOrNull = <T>(p: Promise<T>): Promise<T | null> => p.catch(() => null)

const memo = new Map<string, Promise<unknown[]>>()
function getJson<T>(file: string): Promise<T[]> {
  if (!memo.has(file)) {
    const p = catalogFile(file)
      .then((res) => res.json() as Promise<unknown[]>)
      .catch((e: unknown) => {
        memo.delete(file) // a próxima tentativa busca de novo
        throw e
      })
    memo.set(file, p)
  }
  return memo.get(file) as Promise<T[]>
}

export const fetchExercises = () => getJson<Exercise>(EXERCISES_JSON)
export const fetchTaco = () => getJson<TacoFood>(TACO_JSON)
