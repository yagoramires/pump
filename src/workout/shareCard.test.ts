import { CARD_DEFAULTS, cardFoot, cardRows, stickerText, type CardInput } from './shareCard'

const input: CardInput = {
  label: 'A', name: 'Pernas', date: '2026-11-16', minutes: 104, sets: 12, exercises: 4,
  highlight: { kind: 'record', name: 'Agachamento livre', mark: { kind: 'reps', kg: 40, reps: 8, prevReps: 6 } },
  week: { days: 2, goal: 4 }, levels: new Map(),
}

test('placar padrão: duração, séries e o destaque sem carga', () => {
  expect(cardRows(input, CARD_DEFAULTS)).toEqual([
    { big: '1h44', label: 'de treino' },
    { big: '12', label: 'séries em 4 exercícios' },
    { big: '+2', label: 'reps no Agachamento livre, recorde pessoal', lime: true },
  ])
  expect(cardFoot(input, CARD_DEFAULTS)).toEqual({ title: ['Treino A', 'Pernas'], week: '2 de 4 treinos na semana', date: undefined })
})

test('com cargas e data; sem duração; recorde de carga escondido vira PR', () => {
  expect(cardRows({ ...input, minutes: null }, { ...CARD_DEFAULTS, loads: true })).toEqual([
    { big: '12', label: 'séries em 4 exercícios' },
    { big: '+2', label: 'reps no Agachamento livre, recorde com 40 kg', lime: true },
  ])
  const load = { ...input, minutes: 52, highlight: { kind: 'record', name: 'Supino', mark: { kind: 'load', kg: 65, reps: 6, prevKg: 60, prevReps: 8 } } } as const
  expect(cardRows(load, CARD_DEFAULTS).map((r) => r.big)).toEqual(['52', '12', 'PR'])
  expect(cardRows(load, { ...CARD_DEFAULTS, loads: true })[2]).toEqual({ big: '+5', label: 'kg no Supino, recorde de carga', lime: true })
  expect(cardFoot({ ...input, label: 'Extra', name: 'Treino extra' }, { ...CARD_DEFAULTS, date: true, week: false })).toEqual({ title: ['Treino extra'], week: undefined, date: 'seg, 16 nov' })
})

test('destaque neutro não ganha linha verde', () => {
  expect(cardRows({ ...input, highlight: { kind: 'neutral' } }, CARD_DEFAULTS)).toHaveLength(2)
})

test('Stories: nome, destaque numa frase e os números em colunas', () => {
  expect(stickerText(input, { ...CARD_DEFAULTS, format: 'stories' })).toEqual({
    eyebrow: 'Treino A', name: 'Pernas', highlight: '+2 reps no Agachamento livre, recorde pessoal',
    stats: [['1h44', 'duração'], ['12', 'séries'], ['2/4', 'na semana']], date: undefined,
  })
  const extra = stickerText({ ...input, label: 'Extra', name: 'Treino extra', minutes: 40, highlight: { kind: 'neutral' } }, { ...CARD_DEFAULTS, format: 'stories', week: false })
  expect(extra).toMatchObject({ eyebrow: undefined, highlight: undefined, stats: [['40min', 'duração'], ['12', 'séries']] })
})
