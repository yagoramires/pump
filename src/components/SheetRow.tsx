import type { ReactNode } from 'react'

/** corpo rolável de uma gaveta de opções */
export const SheetBody = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-0 flex-col overflow-y-auto px-4 pt-2 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
)

/** linha de ação numa lista de gaveta */
export const SheetRow = ({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) => (
  <li className="border-t border-line first:border-t-0">
    <button type="button" className="flex min-h-14 w-full items-center gap-3 px-3 text-left text-[15px] text-strong" onClick={onClick}>{icon}{label}</button>
  </li>
)
