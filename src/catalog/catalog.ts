import type { Exercise } from '@/workout/types'
import type { TacoFood } from '@/diet/types'
import { IMAGE_BASE } from './urls'

export const imageUrl = (path: string): string => IMAGE_BASE + path

export const catalogFile = (file: string): Promise<Response> =>
  fetch(`${import.meta.env.BASE_URL}catalog/${file}`).then((res) => { if (!res.ok) throw new Error(String(res.status)); return res })

const memo = new Map<string, Promise<unknown[]>>()
function getJson<T>(file: string): Promise<T[]> {
  if (!memo.has(file)) {
    const p = catalogFile(file)
      .then((res) => res.json() as Promise<unknown[]>)
      .catch(() => {
        memo.delete(file)
        throw new Error('Sem internet para carregar o catálogo')
      })
    memo.set(file, p)
  }
  return memo.get(file) as Promise<T[]>
}

export const fetchExercises = () => getJson<Exercise>('exercises.json')
export const fetchTaco = () => getJson<TacoFood>('taco.json')
