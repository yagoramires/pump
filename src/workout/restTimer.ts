type AudioCtor = typeof AudioContext
let ctx: AudioContext | undefined

/** Chamar dentro do handler do toque: o iOS só libera áudio num gesto. */
export function unlockAudio(): void {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
  if (!Ctor) return
  ctx ??= new Ctor()
  void ctx.resume()
}

export function beep(): void {
  if (ctx) {
    const osc = ctx.createOscillator()
    osc.frequency.value = 880
    osc.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.2)
  }
  navigator.vibrate?.(300)
}
