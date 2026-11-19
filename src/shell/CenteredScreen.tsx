import type { ReactNode } from 'react'

export function CenteredScreen({ role, children }: { role?: 'alert'; children: ReactNode }) {
  return <main role={role} className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">{children}</main>
}
