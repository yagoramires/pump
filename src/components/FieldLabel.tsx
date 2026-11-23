import { Label } from '@/components/ui/label'
import { Optional } from './Optional'

/** rótulo em caixa alta de um campo, com "opcional" ao lado */
export function FieldLabel({ label, optional, htmlFor }: { label: string; optional?: boolean; htmlFor?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5">
      {htmlFor ? <Label htmlFor={htmlFor} className="label-section">{label}</Label> : <span className="label-section">{label}</span>}
      {optional && <Optional />}
    </div>
  )
}
