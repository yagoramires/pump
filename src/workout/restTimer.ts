type AudioCtor = typeof AudioContext
let ctx: AudioContext | undefined

/** Chamar dentro do handler do toque: o iOS só libera áudio num gesto. */
export function unlockAudio(): void {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
  if (!Ctor) return
  // iOS 16.4+: "ambient" mistura com a música do usuário em vez de pausá-la
  const session = (navigator as { audioSession?: { type: string } }).audioSession
  if (session) session.type = 'ambient'
  ctx ??= new Ctor()
  void ctx.resume()
}

export function beep(): void {
  if (ctx) {
    const audio = ctx
    const osc = audio.createOscillator()
    osc.frequency.value = 880
    osc.connect(audio.destination)
    // contexto rodando segura a sessão de áudio do iOS e corta a música ao voltar pro app
    osc.onended = () => void audio.suspend()
    osc.start()
    osc.stop(audio.currentTime + 0.2)
  }
  navigator.vibrate?.(300)
}
