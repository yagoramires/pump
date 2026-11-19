import type { Extra, Level, Muscle, Place, Split } from './types'

export const LEVEL_LABEL: Record<Level, string> = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }
export const PLACE_LABEL: Record<Place, string> = { academia: 'Academia', casa: 'Em casa' }
export const SPLIT_LABEL: Record<Split, string> = { fullbody: 'Full body', ab: 'AB', abc: 'ABC', abcd: 'ABCD', abcde: 'ABCDE', ppl: 'Push/Pull/Legs' }
export const EXTRA_LABEL: Record<Extra, string> = { cardio: 'Cardio', abdomen: 'Abdômen', mobilidade: 'Mobilidade' }
export const MUSCLE_LABEL: Record<Muscle, string> = { peito: 'Peito', costas: 'Costas', ombros: 'Ombros', biceps: 'Bíceps', triceps: 'Tríceps', pernas: 'Pernas', gluteos: 'Glúteos', panturrilha: 'Panturrilha' }
