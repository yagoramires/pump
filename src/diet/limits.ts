// limites do formato Pump: o import recusa o que passa deles, então o editor e o prompt usam os mesmos
export const MAX_MENUS = 5
export const MAX_MEALS = 10
export const MAX_ITEMS = 30
export const MAX_OPTIONS = 4
export const GRAMS = [1, 2000] as const
export const GOAL_KCAL = [800, 6000] as const
export const MACRO_G = [0, 600] as const
export const MAX_KCAL_PER_100G = 900
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export const WATER_LIMITS = { goalMl: [250, 10000], cupMl: [50, 1000] } as const
