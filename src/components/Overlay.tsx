import type { ReactNode } from 'react'

// tela cheia por cima da barra de abas (z-30; gavetas e diálogos são z-50)
export const Overlay = ({ children }: { children: ReactNode }) => (
  <div className="fixed inset-0 z-30 overflow-y-auto bg-bg">
    <div className="mx-auto max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</div>
  </div>
)
