import type { ReactNode } from 'react'
import { CalendarDays, ChevronDown, ChevronRight, Trophy, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { IconDot } from '@/components/IconDot'
import type { EvolutionInput } from './types'
import type { Report } from './report'
import { DietRows } from './DietRows'
import { dietSummary } from './dietStats'

const ROW = 'h-auto min-h-14 w-full justify-start gap-3 rounded-none px-3.5 py-2 text-left font-normal'

function Line({ icon, color, title, summary, chevron }: { icon: ReactNode; color: string; title: string; summary?: string; chevron: ReactNode }) {
  return (
    <>
      <IconDot size={36} color={color}>{icon}</IconDot>
      <span className="flex-1 text-body font-semibold text-strong">{title}</span>
      {summary && <span className="text-meta text-text-2 tabular-nums">{summary}</span>}
      {chevron}
    </>
  )
}

export function MoreList({ input, report, today, onAchievements, onHistory }: { input: EvolutionInput; report: Report; today: string; onAchievements: () => void; onHistory: () => void }) {
  const earned = report.achievements.filter((a) => a.earnedAt).length
  const chevron = <ChevronRight size={18} className="text-faint" aria-hidden="true" />
  return (
    <Card size="flush" className="divide-y divide-line">
      {report.hasDiet && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className={`${ROW} group`}>
              <Line icon={<Utensils size={18} aria-hidden="true" />} color="var(--c6)" title="Dieta" summary={dietSummary(input.dietLog, input.waterLog, today)}
                chevron={<ChevronDown size={18} className="text-faint transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent><DietRows log={input.dietLog} water={input.waterLog} today={today} /></CollapsibleContent>
        </Collapsible>
      )}
      <Button variant="ghost" className={ROW} onClick={onAchievements}>
        <Line icon={<Trophy size={18} aria-hidden="true" />} color="var(--c1)" title="Conquistas" summary={`${earned} de ${report.achievements.length}`} chevron={chevron} />
      </Button>
      <Button variant="ghost" className={ROW} onClick={onHistory}>
        <Line icon={<CalendarDays size={18} aria-hidden="true" />} color="var(--c2)" title="Histórico" chevron={chevron} />
      </Button>
    </Card>
  )
}
