import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const omitKey = <T>(rec: Record<string, T>, key: string): Record<string, T> => {
  const { [key]: _gone, ...rest } = rec
  return rest
}
