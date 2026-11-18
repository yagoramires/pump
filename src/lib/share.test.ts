import { shareFile } from './share'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Object.assign(navigator, { canShare: undefined, share: undefined })
})

const stubShare = (err: DOMException) => {
  Object.assign(navigator, { canShare: () => true, share: vi.fn().mockRejectedValue(err) })
}

test('iOS sem gesto do usuário (NotAllowedError): baixa o arquivo em vez de falhar', async () => {
  stubShare(new DOMException('not allowed', 'NotAllowedError'))
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  vi.stubGlobal('URL', class extends URL { static createObjectURL = () => 'blob:x'; static revokeObjectURL = () => {} })
  await expect(shareFile(new File(['{}'], 'a.json'))).resolves.toBe('downloaded')
  expect(click).toHaveBeenCalled()
})
test('cancelar a folha não é erro', async () => {
  stubShare(new DOMException('abort', 'AbortError'))
  await expect(shareFile(new File(['{}'], 'a.json'))).resolves.toBe('cancelled')
})
