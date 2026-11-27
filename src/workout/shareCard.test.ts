import { CARD_DEFAULTS, cardContent, renderCard, type CardInput } from './shareCard'

const input: CardInput = {
  label: 'A', name: 'Pernas', date: '2026-11-16', minutes: 104, sets: 12, exercises: 4,
  highlight: { kind: 'record', name: 'Agachamento livre', mark: { kind: 'reps', kg: 40, reps: 8, prevReps: 6 } },
  week: { days: 2, goal: 4 }, levels: new Map(),
}

test('mostra duração, séries e exercícios separadamente, com carga e data ocultas por padrão', () => {
  expect(cardContent(input, CARD_DEFAULTS)).toEqual({
    label: 'Treino A',
    title: 'Pernas',
    stats: [['1h44', 'Duração'], ['12', 'Séries'], ['4', 'Exercícios']],
    highlight: '+2 reps no Agachamento livre, recorde pessoal',
    week: '2 de 4 treinos na semana',
    date: undefined,
  })
})

test('cada opção controla seu dado nos dois formatos', () => {
  const post = { ...CARD_DEFAULTS, duration: false, sets: false, loads: true, date: true, week: false }
  const content = cardContent(input, post)
  expect(cardContent(input, { ...post, format: 'stories' })).toEqual(content)
  expect(content).toMatchObject({
    stats: [['4', 'Exercícios']], highlight: '+2 reps no Agachamento livre, recorde com 40 kg', week: undefined, date: 'seg, 16 nov',
  })
  expect(cardContent(input, { ...post, exercises: false, highlight: false })).toMatchObject({ stats: [], highlight: undefined })
})

test('extra sem duração nem recorde não repete o título', () => {
  expect(cardContent({ ...input, label: 'Extra', name: 'Treino extra', minutes: null, highlight: { kind: 'neutral' } }, CARD_DEFAULTS)).toMatchObject({
    label: undefined, title: 'Treino extra', stats: [['12', 'Séries'], ['4', 'Exercícios']], highlight: undefined,
  })
})

test('o PNG usa 1080 × 1350 no post e 1080 × 1920 no Story, com transparência independente do formato', async () => {
  const canvas = document.createElement('canvas')
  const gradient = { addColorStop: vi.fn() }
  const ctx = { canvas, fillRect: vi.fn(), fillText: vi.fn(), measureText: () => ({ width: 100 }), createLinearGradient: () => gradient }
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
  const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb) {
    cb(new Blob([`${this.width}×${this.height}`], { type: 'image/png' }))
  })
  try {
    const post = await renderCard(input, CARD_DEFAULTS, 'transparent')
    expect(await post.text()).toBe('1080×1350')
    expect(ctx.fillRect).not.toHaveBeenCalledWith(0, 0, 1080, 1350)
    const story = await renderCard(input, { ...CARD_DEFAULTS, format: 'stories' }, 'solid')
    expect(await story.text()).toBe('1080×1920')
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1080, 1920)
  } finally {
    getContext.mockRestore()
    toBlob.mockRestore()
  }
})
