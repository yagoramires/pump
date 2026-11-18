import { createElement } from 'react'
import { CalendarCheck, Camera, Dumbbell, GlassWater, ListChecks, Percent, Sparkles, Timer, TrendingUp, Utensils, type LucideIcon } from 'lucide-react'
import type { AchievementId } from './achievements'

const ICON: Record<AchievementId, LucideIcon> = {
  'first-workout': Dumbbell,
  'streak-3': Timer,
  'streak-7': Timer,
  'streak-30': Timer,
  'workouts-10': ListChecks,
  'workouts-50': ListChecks,
  'workouts-100': ListChecks,
  record: TrendingUp,
  'first-photo': Camera,
  'weight-small': Sparkles,
  'weight-big': Sparkles,
  'fat-1': Percent,
  'diet-day': Utensils,
  'diet-7': CalendarCheck,
  'water-7': GlassWater,
}

export const AchievementIcon = ({ id }: { id: AchievementId }) => createElement(ICON[id], { size: 22, 'aria-hidden': true })
