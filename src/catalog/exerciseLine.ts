import type { Exercise } from './types.ts'

/** a linha do exercício na lista que a IA copia: "nome (equipamento)" */
export const exerciseLine = (e: Pick<Exercise, 'name' | 'equipment'>) => (e.equipment ? `${e.name} (${e.equipment})` : e.name)

/** o inverso: o parêntese final, se houver, é o equipamento */
export function splitExerciseLine(line: string): { name: string; equipment?: string } {
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(line)
  return m ? { name: m[1], equipment: m[2] } : { name: line }
}
