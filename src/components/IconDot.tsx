import type { ReactNode } from 'react'

export function IconDot({ color, size, children }: { color: string; size: 32 | 36 | 72; children: ReactNode }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, color, background: `color-mix(in srgb, ${color} 13%, transparent)` }}
    >
      {children}
    </span>
  )
}
