import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { usePersisted } from '@/storage/db'
import { BackHeader } from '@/components/BackHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { makeCopy } from '@/components/ImportFlow'
import { countText, formatAmount, shoppingList, shoppingText } from './shopping'

const PERIODS = [{ v: '7', label: 'Semana' }, { v: '30', label: 'Mês' }]

export function ShoppingList({ onClose }: { onClose: () => void }) {
  const [plan] = usePersisted('dietPlan')
  const [settings, setSettings] = usePersisted('settings')
  const [days, setDays] = useState('30')
  const items = shoppingList(plan, Number(days))
  const keys = new Set(items.map((i) => i.key))
  // só vale o que está na lista de agora; marcas de planos antigos são podadas a cada alteração
  const checked = (settings.shoppingChecked ?? []).filter((k) => keys.has(k))
  const setChecked = (next: string[]) => setSettings((s) => ({ ...s, shoppingChecked: next.filter((k) => keys.has(k)) }))
  const toggle = (key: string) => setChecked(checked.includes(key) ? checked.filter((k) => k !== key) : [...checked, key])
  const missing = items.filter((i) => !checked.includes(i.key))
  return (
    <>
      <BackHeader title="Lista de compras" onBack={onClose} />
      {!items.length ? (
        <EmptyState icon={<ShoppingCart size={32} aria-hidden="true" />} title="Sem dieta ainda">
          <p className="text-body text-text-2">Monte um cardápio e a lista de compras aparece aqui.</p>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3 pt-2">
          <Tabs value={days} onValueChange={setDays}>
            <TabsList variant="segmented" aria-label="Período da lista">
              {PERIODS.map((p) => <TabsTrigger key={p.v} variant="segmented" value={p.v}>{p.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <Card size="flush"><ul>
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-3 border-t border-line px-3.5 py-2 first:border-t-0">
                <Checkbox size="check" checked={checked.includes(i.key)} aria-label={i.name} onCheckedChange={() => toggle(i.key)} />
                <span className="min-w-0 flex-1 text-body font-medium text-strong">{i.name}</span>
                <span className="shrink-0 text-right">
                  <span className="block text-body font-semibold text-strong">{formatAmount(i.grams)}</span>
                  {i.count && <span className="block text-meta text-text-2">{countText(i.count)}</span>}
                </span>
              </li>
            ))}
          </ul></Card>
          <Button variant="outline" onClick={() => makeCopy(toast)(shoppingText(checked.length ? missing : items), 'Lista copiada')}>{checked.length ? 'Copiar o que falta' : 'Copiar lista'}</Button>
          {checked.length > 0 && <Button variant="link" onClick={() => setChecked([])}>Limpar marcações</Button>}
        </div>
      )}
    </>
  )
}
