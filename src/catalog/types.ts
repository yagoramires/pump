// sem imports: os scripts de build (bun, fora do Vite) também usam
/** primary: os músculos principais (subconjunto de muscles, que vem com eles primeiro) */
export interface Exercise { id: string; name: string; muscles: string[]; primary?: string[]; equipment: string; instructions: string[]; images: string[] }
export interface TacoFood { id: number; name: string; kcal: number; p: number; c: number; f: number }
