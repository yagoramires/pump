import { shareFile } from './share'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const stubShare = (err: DOMException) => {
  Object.assign(navigator, { canShare: () => true, share: vi.fn().mockRejectedValue(err) })
}

test('iOS sem gesto do usuário (NotAllowedError): baixa o arquivo em vez de falhar', async () => {
  stubShare(new DOMException('not allowed', 'NotAllowedError'))
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} }))
  await expect(shareFile(new File(['{}'], 'a.json'))).resolves.toBe('downloaded')
  expect(click).toHaveBeenCalled()
})
test('cancelar a folha não é erro', async () => {
  stubShare(new DOMException('abort', 'AbortError'))
  await expect(shareFile(new File(['{}'], 'a.json'))).resolves.toBe('cancelled')
})
