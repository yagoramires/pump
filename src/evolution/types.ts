export type Angle = 'frente' | 'lado' | 'costas'
export interface MeasureFields { weightKg?: number; neckCm?: number; waistCm?: number; hipCm?: number; armCm?: number; chestCm?: number; thighCm?: number }
export interface Measurement extends MeasureFields { id: string; date: string }
/** valores dos ângulos = id da foto (chave photo:<id>) */
export interface PhotoSet { id: string; date: string; frente?: string; lado?: string; costas?: string }
