import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Report } from './report'
import { FAT, WEIGHT, deltaUnit, formatValue, type BodyRow, type Point } from './measurements'
import { PERIODS, inPeriod, type Period } from './chart'
import { BodyRowLine } from './BodyRowLine'
import { Delta } from './Delta'
import { LineChart } from './LineChart'
import { PeriodTabs } from './PeriodTabs'

type Tab = 'peso' | 'gordura' | 'medidas'
const LABEL: Record<Tab, string> = { peso: 'Peso', gordura: 'Gordura', medidas: 'Medidas' }
const METRIC = {
  peso: { field: WEIGHT, chart: 'Gráfico de peso', more: 'peso' },
  gordura: { field: FAT, chart: 'Gráfico de gordura', more: 'valor' },
} as const

function Metric({ tab, rows, points, range, onRange, today }: { tab: keyof typeof METRIC; rows: BodyRow[]; points: Point[]; range: Period; onRange: (p: Period) => void; today: string }) {
  const { field, chart, more } = METRIC[tab]
  const row = rows.find((r) => r.key === field.key)
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5">
        <span className="flex items-baseline gap-2">
          <span className="text-display font-bold text-strong tabular-nums">{row ? formatValue(field, row.last.value) : '—'}</span>
          <Delta value={row?.delta} good={!!row?.good} unit={deltaUnit(field)} className="text-meta" />
        </span>
        <PeriodTabs value={range} onChange={onRange} options={PERIODS} label="Período do gráfico" />
      </div>
      <div className="px-3.5 pb-3 pt-2">
        <LineChart points={points.filter((p) => inPeriod(range, p.date, today))} label={chart} empty={points.length >= 2 ? 'Poucos registros nesse período' : `Registre mais um ${more} pra ver o gráfico`} />
      </div>
    </>
  )
}

export function BodyCard({ body, range, onRange, today, onRegister }: { body: Report['body']; range: Period; onRange: (p: Period) => void; today: string; onRegister: () => void }) {
  const weights = body?.weight ?? []
  const fat = body?.fat ?? []
  const all = body?.rows ?? []
  const rows = all.filter((r) => r.key !== WEIGHT.key && r.key !== FAT.key)
  const tabs = ([weights.length && 'peso', fat.length && 'gordura', rows.length && 'medidas'] as const).filter((t): t is Tab => !!t)
  const [picked, setPicked] = useState<Tab>()
  const tab = picked && tabs.includes(picked) ? picked : tabs[0]

  if (!tab) {
    return (
      <Card size="flush">
        <Button variant="ghost" className="h-auto w-full justify-start rounded-none px-3.5 py-3 text-sm font-normal text-text-2" onClick={onRegister}>Registre seu peso pra ver aqui</Button>
      </Card>
    )
  }
  return (
    <Card size="flush">
      <CardHeader>
        {tabs.length > 1 ? (
          <Tabs value={tab} onValueChange={(v) => setPicked(v as Tab)}>
            <TabsList variant="segmented" aria-label="Dados do corpo" className="w-auto">
              {tabs.map((t) => <TabsTrigger key={t} variant="segmented" value={t}>{LABEL[t]}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        ) : <CardTitle>{LABEL[tab]}</CardTitle>}
      </CardHeader>
      {tab === 'medidas'
        ? <div className="pb-1">{rows.map((r) => <BodyRowLine key={r.key} row={r} />)}</div>
        : <Metric tab={tab} rows={all} points={tab === 'peso' ? weights : fat} range={range} onRange={onRange} today={today} />}
    </Card>
  )
}
