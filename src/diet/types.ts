export interface Per100 { kcal: number; p: number; c: number; f: number }
export interface DietItem { id: string; name: string; grams: number; portion?: string; per100: Per100; source: 'taco' | 'custom' | 'ia'; tacoId?: number }
export interface Macros { p: number; c: number; f: number }
export interface MealOption { id: string; name?: string; items: DietItem[] }
export interface Meal { id: string; name: string; time: string; options: MealOption[] }
export interface Menu { id: string; name: string; meals: Meal[]; goalKcal?: number; goalMacros?: Macros }
export interface DietPlan { menus: Menu[]; lastMenuId?: string }
/** original = item do cardápio antes da 1ª troca (pra desfazer) */
export interface DayItem extends DietItem { skipped?: boolean; swappedFrom?: string; extra?: boolean; original?: DietItem }
/** optionId = opção do cardápio escolhida (ausente = 1ª); swappedMeal = nome da opção/refeição escolhida em "Trocar refeição" */
export interface DayMeal extends Omit<Meal, 'options'> { done: boolean; free?: boolean; swappedMeal?: string; optionId?: string; items: DayItem[] }
export interface DietDay { menuId: string; menuName: string; meals: DayMeal[]; goalKcal?: number; goalMacros?: Macros; free?: boolean }
/** chave = todayKey */
export type DietLog = Record<string, DietDay>
export interface WaterDay { ml: number; goalMl: number }
export type WaterLog = Record<string, WaterDay>
export type Restriction = 'lactose' | 'gluten' | 'vegetariano' | 'vegano'
export interface DietAnamnesis { meals?: number; restrictions?: Restriction[]; avoid?: string; eatOut?: 'casa' | 'fora' | 'misto'; notes?: string }
export interface WaterSettings { enabled: boolean; goalMl: number; cupMl: number }
export interface TacoFood { id: number; name: string; kcal: number; p: number; c: number; f: number }
