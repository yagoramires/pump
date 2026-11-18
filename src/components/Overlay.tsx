import type { ReactNode } from 'react'

export const Overlay = ({ children }: { children: ReactNode }) => (
  <div className="fixed inset-0 z-(--z-overlay) overflow-y-auto bg-bg">
    <div className="mx-auto max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</div>
  </div>
)
