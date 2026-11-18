import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const BottomBar = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn('fixed inset-x-0 bottom-0 mx-auto flex max-w-md bg-bg px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]', className)}>{children}</div>
)
