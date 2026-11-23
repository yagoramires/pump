// tema antes da primeira pintura: espelho do settings.theme (src/shell/theme.ts faz o resto depois do boot)
;(function () {
  var t
  try { t = localStorage.getItem('pump-theme') } catch {}
  if (t !== 'light' && t !== 'system') t = 'dark'
  var light = matchMedia('(prefers-color-scheme: light)').matches
  var d = document.documentElement
  d.dataset.theme = t
  d.dataset.mode = t === 'system' ? (light ? 'light' : 'dark') : t
  if (t === 'light') document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { m.content = '#f2f3f5' })
  if (t === 'system') document.querySelector('meta[media*="light"]').content = '#f2f3f5'
})()
