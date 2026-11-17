import type { ReactNode } from 'react'
import { Document, Font, Image, Page, Path, Polyline, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'
import type { Angle } from '../types'
import { daysBetween, formatDayMonth, parseDayKey } from '../../lib/date'
import { formatDec } from '../../lib/number'
import type { Report } from '../report'

// cores do mockup (docs/design/evolucao-e-pdf.html); medidas = mockup × 2,2 pra virar A4 (595 × 842 pt)
const BG = '#0b0c0d'
const TEXT = '#d6d8dd'
const T2 = '#8a8d96'
const FAINT = '#5d6068'
const LINE = '#222428'
const SURFACE = '#1a1b1f'
const ACC = '#c6ff3d'
const ACC_BG = '#1a2309'
const ACC_LINE = '#34440d'
const BOLD = 'Helvetica-Bold'
// a hifenização padrão é em inglês ("gordu-ra"): quebra só nos espaços
Font.registerHyphenationCallback((word) => [word])

const s = StyleSheet.create({
  page: { backgroundColor: BG, color: TEXT, fontFamily: 'Helvetica', fontSize: 20, padding: 40, paddingBottom: 70 },
  lb: { fontSize: 15, letterSpacing: 1.3, textTransform: 'uppercase', color: FAINT, fontFamily: BOLD },
  h4: { fontSize: 33, color: '#fff', fontFamily: BOLD, marginBottom: 9 },
  big: { fontSize: 57, color: '#fff', fontFamily: BOLD, letterSpacing: -1 },
  unit: { fontSize: 26 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', marginBottom: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderTopWidth: 2, borderTopColor: LINE },
  val: { flexDirection: 'row', alignItems: 'center' },
  strong: { color: '#fff', fontFamily: BOLD },
  pair: { flexDirection: 'row', justifyContent: 'center', gap: 13, marginTop: 13, marginBottom: 22 },
  photo: { width: 191, height: 255, borderRadius: 18, backgroundColor: SURFACE, overflow: 'hidden' },
  tag: { position: 'absolute', left: 11, top: 11, fontSize: 15, backgroundColor: 'rgba(0,0,0,0.67)', color: '#fff', borderRadius: 9, paddingVertical: 2, paddingHorizontal: 9 },
  badge: { width: 57, height: 57, borderRadius: 18, backgroundColor: ACC_BG, borderWidth: 2, borderColor: ACC_LINE, alignItems: 'center', justifyContent: 'center' },
  foot: { position: 'absolute', left: 40, right: 40, bottom: 26, flexDirection: 'row', justifyContent: 'space-between', color: FAINT, fontSize: 15 },
})

const ANGLE: Record<Angle, string> = { frente: 'Frente', lado: 'Lado', costas: 'Costas' }
// Helvetica padrão (WinAnsi) não tem "−" nem "→": o sinal vira "–" e a seta é desenhada
// shortcut: outros caracteres fora do WinAnsi (emoji em nome de exercício) somem; registrar uma fonte se aparecer
const winAnsi = (t: string) => t.replace(/−/g, '–')
const signed = (d: number) => `${d < 0 ? '–' : d > 0 ? '+' : ''}${formatDec(Math.abs(d))}`
const dayYear = (k: string) => `${formatDayMonth(k)} ${parseDayKey(k).getFullYear()}`

function Arrow({ size = 16, color = T2 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ marginHorizontal: size / 3 }}>
      <Path d="M4 12h16M14 6l6 6-6 6" stroke={color} strokeWidth={2.5} fill="none" />
    </Svg>
  )
}

function Trophy() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      {['M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2', 'M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2', 'M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3', 'M4 22h16', 'M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z', 'M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3'].map((d) => (
        <Path key={d} d={d} stroke={ACC} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  )
}

function Big({ label, value, unit, accent, size = 57 }: { label: string; value: string; unit?: string; accent?: boolean; size?: number }) {
  return (
    <View style={s.cell}>
      <Text style={s.lb}>{label}</Text>
      <Text style={[s.big, { fontSize: size }, accent ? { color: ACC } : {}]}>
        {value}
        {unit && <Text style={s.unit}>{` ${unit}`}</Text>}
      </Text>
    </View>
  )
}

function FromTo({ first, last, unit, digits = 0 }: { first: number; last: number; unit: string; digits?: number }) {
  return (
    <View style={s.val}>
      <Text>{formatDec(first, digits)}</Text>
      <Arrow />
      <Text style={s.strong}>{`${formatDec(last, digits)}${unit === '%' ? '%' : ` ${unit}`}`}</Text>
    </View>
  )
}

function WeightChart({ points }: { points: { date: string; value: number }[] }) {
  const W = 515
  const H = 154
  const span = Math.max(1, daysBetween(points[0].date, points[points.length - 1].date))
  const vals = points.map((p) => p.value)
  const min = Math.min(...vals)
  const range = Math.max(...vals) - min || 1
  const pts = points.map((p) => `${(daysBetween(points[0].date, p.date) / span) * W},${8 + (1 - (p.value - min) / range) * (H - 16)}`).join(' ')
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 13, marginBottom: 18 }}>
      <Polyline points={pts} stroke={ACC} strokeWidth={4.4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  )
}

function Badges({ list }: { list: { title: string; earnedAt: string }[] }) {
  if (!list.length) return null
  return (
    <>
      <Text style={[s.lb, { marginTop: 22, marginBottom: 13 }]}>Conquistas no período</Text>
      <View style={[s.grid, { gap: 13 }]}>
        {list.map((a) => (
          <View key={a.title} style={{ width: 112, alignItems: 'center', marginBottom: 9 }}>
            <View style={s.badge}><Trophy /></View>
            <Text style={{ fontSize: 13, color: '#fff', textAlign: 'center', marginTop: 6 }}>{winAnsi(a.title)}</Text>
            <Text style={{ fontSize: 12, color: FAINT, marginTop: 2 }}>{formatDayMonth(a.earnedAt)}</Text>
          </View>
        ))}
      </View>
    </>
  )
}

export function ReportDocument({ report: r, photos }: { report: Report; photos: Record<string, string> }) {
  const good = (label: string) => !!r.body?.rows.find((x) => x.label === label)?.good
  const pages: { body: ReactNode; note?: string }[] = []

  pages.push({
    body: (
      <>
        <Text style={{ fontFamily: BOLD, color: '#fff', fontSize: 29 }}>
          pump<Text style={{ color: ACC }}>.</Text>
        </Text>
        <Text style={[s.lb, { marginTop: 154 }]}>Relatório de evolução</Text>
        <View style={[s.val, { marginTop: 9 }]}>
          <Text style={[s.h4, { fontSize: 40, marginBottom: 0 }]}>{dayYear(r.period.start)}</Text>
          <Arrow size={34} color="#fff" />
          <Text style={[s.h4, { fontSize: 40, marginBottom: 0 }]}>{dayYear(r.period.end)}</Text>
        </View>
        <Text style={[s.lb, { marginTop: 4 }]}>{`${r.period.days} ${r.period.days === 1 ? 'dia' : 'dias'} de acompanhamento`}</Text>
        <View style={[s.grid, { marginTop: 62 }]}>
          <Big label="Peso" value={r.summary.weightDelta === undefined ? '—' : signed(r.summary.weightDelta)} unit={r.summary.weightDelta === undefined ? undefined : 'kg'} accent={r.summary.weightDelta !== undefined && good('Peso')} />
          <Big label="Gordura" value={r.summary.fatDelta === undefined ? '—' : signed(r.summary.fatDelta)} unit={r.summary.fatDelta === undefined ? undefined : 'pt'} accent={r.summary.fatDelta !== undefined && good('Gordura')} />
          <Big label="Treinos" value={String(r.summary.workouts)} />
          <Big label="Volume" value={formatDec(r.summary.volumeTons)} unit="t" />
        </View>
      </>
    ),
  })

  for (let i = 0; i < r.photoPairs.length; i += 2) {
    const next = r.photoPairs[i + 2]
    pages.push({
      note: next && `${ANGLE[next.angle]} na próxima página`,
      body: (
        <>
          <Text style={s.lb}>Antes e depois</Text>
          {r.photoPairs.slice(i, i + 2).map((p) => (
            <View key={p.angle}>
              <Text style={[s.h4, { marginTop: 4 }]}>{ANGLE[p.angle]}</Text>
              <View style={s.pair}>
                {[p.before, p.after].map((x) => (
                  <View key={x.id} style={s.photo}>
                    {photos[x.id] && <Image src={photos[x.id]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <Text style={s.tag}>{formatDayMonth(x.date)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </>
      ),
    })
  }

  if (r.body) {
    pages.push({
      note: r.body.rows.some((x) => x.label === 'Gordura') ? '% de gordura: estimativa (US Navy)' : undefined,
      body: (
        <>
          <Text style={s.lb}>Corpo</Text>
          <Text style={s.h4}>Peso e medidas</Text>
          {r.body.weight.length > 1 && <WeightChart points={r.body.weight} />}
          {r.body.rows.map((x) => (
            <View key={x.label} style={s.row}>
              <Text>{x.label}</Text>
              <View style={s.val}>
                <FromTo first={x.first} last={x.last} unit={x.unit} digits={x.unit === 'cm' ? 0 : 1} />
                <Text style={{ marginLeft: 11, color: x.good ? ACC : T2 }}>{signed(x.delta)}</Text>
              </View>
            </View>
          ))}
        </>
      ),
    })
  }

  const t = r.training
  if (t.workouts || t.achievements.length) {
    pages.push({
      body: (
        <>
          <Text style={s.lb}>Treino</Text>
          <Text style={s.h4}>Constância e força</Text>
          <View style={[s.grid, { marginTop: 9 }]}>
            <Big label="Treinos" value={String(t.workouts)} size={44} />
            <Big label="Por semana" value={formatDec(t.perWeek)} size={44} />
          </View>
          {t.topLifts.length > 0 && <Text style={[s.lb, { marginBottom: 9 }]}>Maiores cargas</Text>}
          {t.topLifts.map((x, i) => (
            <View key={i} style={s.row}>
              <Text>{winAnsi(x.name)}</Text>
              <FromTo first={x.first} last={x.max} unit="kg" />
            </View>
          ))}
          <Badges list={t.achievements} />
        </>
      ),
    })
  }

  const dt = r.diet
  if (dt) {
    pages.push({
      body: (
        <>
          <Text style={s.lb}>Dieta</Text>
          <Text style={s.h4}>Plano e água</Text>
          <View style={[s.grid, { marginTop: 9 }]}>
            <Big label="Média de kcal" value={dt.avgKcal ? formatDec(dt.avgKcal) : '—'} unit={dt.avgKcal && dt.avgGoal ? `/ ${formatDec(dt.avgGoal)}` : undefined} size={44} />
            <Big label="Dias no plano" value={String(dt.fullDays)} unit={`de ${dt.days}`} size={44} />
            {dt.waterDays !== undefined && <Big label="Água na meta" value={String(dt.waterDays)} unit={`de ${dt.days}`} size={44} />}
            <Big label="Livres" value={String(dt.freeUses)} size={44} />
          </View>
          <Badges list={dt.achievements} />
        </>
      ),
    })
  }

  return (
    <Document title="Relatório de evolução · Pump" author="Pump" language="pt-BR">
      {pages.map((p, i) => (
        <Page key={i} size="A4" style={s.page}>
          {p.body}
          <View style={s.foot} fixed>
            <Text>{p.note ?? ''}</Text>
            <Text render={({ pageNumber, totalPages }) => `Gerado pelo Pump · ${pageNumber}/${totalPages}`} />
          </View>
        </Page>
      ))}
    </Document>
  )
}
