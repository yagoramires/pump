/** valores de `muscles` do glossário pt-BR (data/glossary.pt.json), na ordem dele, com a cor do grupo; pescoço não tem grupo */
export const MUSCLE_GROUPS = new Map<string, string | undefined>([
  ['abdominais', 'c7'], ['abdutores', 'c1'], ['adutores', 'c1'], ['bíceps', 'c3'], ['panturrilhas', 'c1'], ['peito', 'c2'],
  ['antebraços', 'c3'], ['glúteos', 'c1'], ['posteriores de coxa', 'c1'], ['dorsais', 'c6'], ['lombar', 'c6'],
  ['meio das costas', 'c6'], ['pescoço', undefined], ['quadríceps', 'c1'], ['ombros', 'c4'], ['trapézio', 'c6'], ['tríceps', 'c3'],
])

export const OTHER_GROUP = 'c5'

export const GROUPS: readonly { token: string; label: string }[] = [
  { token: 'c2', label: 'Peito' }, { token: 'c6', label: 'Costas' }, { token: 'c4', label: 'Ombros' }, { token: 'c3', label: 'Braços' },
  { token: 'c1', label: 'Pernas' }, { token: 'c7', label: 'Abdômen' }, { token: OTHER_GROUP, label: 'Outros' },
]

export const muscleGroup = (muscles: string[]): string => muscles.map((m) => MUSCLE_GROUPS.get(m)).find(Boolean) ?? OTHER_GROUP

export const muscleColor = (muscles: string[]): string => `var(--${muscleGroup(muscles)})`
