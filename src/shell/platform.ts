export const isIOS = (ua: string, maxTouchPoints = 0): boolean =>
  /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1)

export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
