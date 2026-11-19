import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export const SheetBody = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-0 flex-col overflow-y-auto px-4 pt-2 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
)

export const SheetRow = ({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) => (
  <li className="border-t border-line first:border-t-0">
    <Button type="button" variant="ghost" className="h-auto min-h-14 w-full justify-start gap-3 rounded-none px-3 text-[15px] font-normal text-strong" onClick={onClick}>{icon}{label}</Button>
  </li>
)
