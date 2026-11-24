import { formatDayMonth } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card'
import type { Report } from './report'
import { ANGLES, ANGLE_LABEL } from './types'
import { PhotoThumb } from './PhotoThumb'

const LINK = 'text-meta text-accent disabled:text-faint'
const CAPTION = 'flex items-end justify-center rounded-lg pb-1.5 text-xs text-text-2'

export function PhotosCard({ report, sets, onNew, onCompare }: { report: Report; sets: number; onNew: () => void; onCompare: () => void }) {
  const pair = report.photoPairs[0]
  return (
    <Card size="flush">
      <CardHeader>
        <CardTitle>Fotos</CardTitle>
        <CardAction className="flex gap-4">
          <Button type="button" variant="link" className={LINK} onClick={onNew}>Nova foto</Button>
          <Button type="button" variant="link" className={LINK} disabled={sets < 2} onClick={onCompare}>Comparar</Button>
        </CardAction>
      </CardHeader>
      {pair ? (
        <div className="grid grid-cols-2 gap-2 px-3.5 pb-3.5">
          {[pair.before, pair.after].map((p) => {
            const caption = `${formatDayMonth(p.date)} · ${ANGLE_LABEL[pair.angle]}`
            return <PhotoThumb key={p.id} id={p.id} alt={caption} className={CAPTION} zoom><span className="relative">{caption}</span></PhotoThumb>
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 px-3.5 pb-3.5">
          {ANGLES.map((angle) => (
            <PhotoThumb key={angle} id={report.lastSet?.[angle]} alt={`Foto de ${angle}`} className={CAPTION} zoom>
              <span className="relative">{ANGLE_LABEL[angle]}</span>
            </PhotoThumb>
          ))}
        </div>
      )}
    </Card>
  )
}
