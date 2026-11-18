import type { Exercise } from '@/workout/types'
import type { TacoFood } from '@/diet/types'
import { IMAGE_BASE } from './urls'

export const imageUrl = (path: string): string => IMAGE_BASE + path

// uma promessa por arquivo; falha não fica guardada, a próxima chamada tenta de novo
const memo = new Map<string, Promise<unknown[]>>()
function getJson<T>(file: string): Promise<T[]> {
  if (!memo.has(file)) {
    const p = fetch(`${import.meta.env.BASE_URL}catalog/${file}`)
      .then((res) => { if (!res.ok) throw new Error(res.statusText); return res.json() as Promise<unknown[]> })
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
