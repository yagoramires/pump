import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { Exercise } from '../src/workout/types.ts'
import { exerciseList } from './build-catalog-lists.ts'
import { EXERCISE_LIST } from '../src/catalog/urls.ts'

export interface Upstream {
  id: string
  name: string
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  images: string[]
}
export interface Glossary {
  muscles: Record<string, string>
  equipment: Record<string, string>
}
export type Translations = Record<string, { name: string; instructions: string[] }>

const BATCH_SIZE = 50

export function makeBatches(ids: string[]): string[][] {
  const sorted = [...ids].sort()
  const out: string[][] = []
  for (let i = 0; i < sorted.length; i += BATCH_SIZE) out.push(sorted.slice(i, i + BATCH_SIZE))
  return out
}

export function buildCatalog(up: Upstream[], g: Glossary, t: Translations): Exercise[] {
  return up
    .map((x) => {
      const tr = t[x.id]
      if (!tr) throw new Error(`Falta tradução para o id ${x.id}`)
      if (!tr.name.trim()) throw new Error(`Nome vazio para o id ${x.id}`)
      if (tr.instructions.length !== x.instructions.length)
        throw new Error(`Número de passos diferente para o id ${x.id}: ${tr.instructions.length} em vez de ${x.instructions.length} passos`)
      const muscles = [...new Set([...x.primaryMuscles, ...x.secondaryMuscles].map((m) => g.muscles[m]))]
      return { id: x.id, name: tr.name, muscles, equipment: g.equipment[String(x.equipment)], instructions: tr.instructions, images: x.images }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

if (import.meta.main) {
  const up: Upstream[] = JSON.parse(readFileSync('data/exercises.upstream.json', 'utf8'))
  const g: Glossary = JSON.parse(readFileSync('data/glossary.pt.json', 'utf8'))
  const batchesPath = 'data/translations/batches.json'
  if (!existsSync(batchesPath)) {
    mkdirSync('data/translations', { recursive: true })
    writeFileSync(batchesPath, JSON.stringify(makeBatches(up.map((x) => x.id)), null, 2) + '\n')
  }
  const t: Translations = {}
  for (const f of readdirSync('data/translations').filter((f) => /^\d\d\.json$/.test(f)))
    Object.assign(t, JSON.parse(readFileSync(`data/translations/${f}`, 'utf8')))
  const missing = up.map((x) => x.id).filter((id) => !t[id])
  if (missing.length) {
    console.error(`Faltam ${missing.length} traduções:\n${missing.join('\n')}`)
    process.exit(1)
  }
  mkdirSync('public/catalog', { recursive: true })
  const catalog = buildCatalog(up, g, t)
  writeFileSync('public/catalog/exercises.json', JSON.stringify(catalog))
  writeFileSync(`public/catalog/${EXERCISE_LIST}`, exerciseList(catalog))
  console.log(`public/catalog/exercises.json e ${EXERCISE_LIST} escritos`)
}
