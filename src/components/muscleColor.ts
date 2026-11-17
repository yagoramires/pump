const GROUPS: Record<string, string[]> = {
  c2: ['peito'],
  c6: ['dorsais', 'meio das costas', 'lombar', 'trapézio'],
  c1: ['quadríceps', 'posteriores de coxa', 'glúteos', 'panturrilhas', 'adutores', 'abdutores'],
  c4: ['ombros'],
  c3: ['bíceps', 'tríceps', 'antebraços'],
  c7: ['abdominais'],
}
const BY_MUSCLE = new Map(Object.entries(GROUPS).flatMap(([c, ms]) => ms.map((m) => [m, c] as const)))

export function muscleColor(muscles: string[]): string {
  const m = muscles.find((x) => BY_MUSCLE.has(x))
  return `var(--${m ? BY_MUSCLE.get(m) : 'c5'})`
}
