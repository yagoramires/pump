import Body from 'react-muscle-highlighter'
import type { MuscleLevel } from './summary'
import { bodyColors, bodyParts, type BodyColors } from './bodyParts'

/** frente e costas lado a lado; `scale` 1 = 200 × 400 cada */
export function BodyFigures({ levels, colors, scale }: { levels: Map<string, MuscleLevel>; colors: BodyColors; scale: number }) {
  const data = bodyParts(levels, colors)
  return (
    <div className="flex justify-center gap-2" aria-hidden="true">
      {(['front', 'back'] as const).map((side) => <Body key={side} data={data} side={side} scale={scale} border="none" defaultFill={colors.base} />)}
    </div>
  )
}

const names = (levels: Map<string, MuscleLevel>, l: MuscleLevel) => [...levels].filter(([, x]) => x === l).map(([m]) => m)

export function BodyMap({ levels }: { levels: Map<string, MuscleLevel> }) {
  const primary = names(levels, 'primary')
  const secondary = names(levels, 'secondary')
  const label = [primary.length && `Principais: ${primary.join(', ')}`, secondary.length && `Auxiliares: ${secondary.join(', ')}`].filter(Boolean).join('. ')
  return (
    <div role="img" aria-label={`Músculos trabalhados. ${label}`} className="flex flex-col gap-3">
      <BodyFigures levels={levels} colors={bodyColors()} scale={0.8} />
      <div className="flex justify-center gap-4 text-caption text-text-2">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-accent" />Principal</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-accent/35" />Auxiliar</span>
      </div>
      {secondary.length > 0 && <p className="text-center text-caption text-faint">{`Auxiliares: ${secondary.join(' · ')}`}</p>}
    </div>
  )
}
