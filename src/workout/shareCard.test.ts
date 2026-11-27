import { CARD_DEFAULTS, cardContent, cardPng, prepareCard, PHOTO_CENTER, type CardInput } from './shareCard'

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
  const ctx = { clearRect: vi.fn(), drawImage: vi.fn(), fillRect: vi.fn(), fillText: vi.fn(), measureText: () => ({ width: 100 }), createLinearGradient: () => gradient }
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
  const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb) {
    cb(new Blob([`${this.width}×${this.height}`], { type: 'image/png' }))
  })
  try {
    const post = await prepareCard(input, CARD_DEFAULTS, 'transparent')
    canvas.width = post.width
    canvas.height = post.height
    post.draw(canvas, 100, PHOTO_CENTER)
    expect(await (await cardPng(canvas)).text()).toBe('1080×1350')
    expect(ctx.fillRect).not.toHaveBeenCalledWith(0, 0, 1080, 1350)
    const story = await prepareCard(input, { ...CARD_DEFAULTS, format: 'stories' }, 'solid')
    canvas.width = story.width
    canvas.height = story.height
    story.draw(canvas, 100, PHOTO_CENTER)
    expect(await (await cardPng(canvas)).text()).toBe('1080×1920')
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1080, 1920)
    const image = { decode: async () => {}, naturalWidth: 1080, naturalHeight: 1350 }
    const mockedImage = vi.spyOn(globalThis, 'Image').mockImplementation(function () { return image as HTMLImageElement })
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo')
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    try {
      const file = new File([], 'fundo.png', { type: 'image/png' })
      const photo = await prepareCard(input, CARD_DEFAULTS, file)
      canvas.width = photo.width
      canvas.height = photo.height
      photo.draw(canvas, 50, PHOTO_CENTER)
      expect(ctx.drawImage.mock.calls.at(-2)).toEqual([image, 270, 337.5, 540, 675])
      photo.draw(canvas, 200, PHOTO_CENTER)
      expect(ctx.drawImage.mock.calls.at(-2)).toEqual([image, -540, -675, 2160, 2700])
      photo.draw(canvas, 200, { x: 0.25, y: -0.25 })
      expect(ctx.drawImage.mock.calls.at(-2)).toEqual([image, -270, -1012.5, 2160, 2700])
      photo.draw(canvas, 200, { x: 2, y: -2 })
      expect(ctx.drawImage.mock.calls.at(-2)).toEqual([image, 0, -1350, 2160, 2700])
    } finally {
      mockedImage.mockRestore()
      createUrl.mockRestore()
      revokeUrl.mockRestore()
    }
  } finally {
    getContext.mockRestore()
    toBlob.mockRestore()
  }
})
