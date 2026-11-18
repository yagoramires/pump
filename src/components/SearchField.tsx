import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** busca com lupa; `className` vai no contêiner */
export function SearchField({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <div className={cn('relative', className)}>
      <Search size={16} className="absolute top-3.5 left-3 text-faint" />
      <Input type="search" className="pl-9" autoComplete="off" enterKeyHint="search" {...props} />
    </div>
  )
}
