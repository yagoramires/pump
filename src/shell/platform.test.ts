import { isIOS } from './platform'

afterEach(() => vi.unstubAllGlobals())

test.each([
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 0, true],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5, true], // iPad se apresentando como Mac
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0, false],
])('isIOS: %s com %i toques → %s', (userAgent, maxTouchPoints, expected) => {
  vi.stubGlobal('navigator', { userAgent, maxTouchPoints })
  expect(isIOS()).toBe(expected)
})
