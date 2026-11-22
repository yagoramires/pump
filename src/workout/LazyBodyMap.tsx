import { lazy, Suspense } from 'react'
import { Card } from '@/components/ui/card'
import type { MuscleLevel } from './summary'

// o desenho do corpo pesa ~60 KB: só carrega quando aparece
const BodyMap = lazy(() => import('./BodyMap').then((m) => ({ default: m.BodyMap })))

export function BodyMapCard({ levels }: { levels: Map<string, MuscleLevel> }) {
  return levels.size > 0 ? <Card className="min-h-80 py-4"><Suspense><BodyMap levels={levels} /></Suspense></Card> : null
}
