/** barrinha de divisão (músculos do treino, macros da refeição) com a legenda em frase embaixo */
export function SplitBar({ parts, legend }: { parts: { color: string; value: number }[]; legend: string }) {
  const shown = parts.filter((p) => p.value > 0)
  if (!shown.length) return null
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {shown.map((p, i) => <span key={i} style={{ flexGrow: p.value, background: p.color }} />)}
      </div>
      <span className="text-caption text-text-2">{legend}</span>
    </div>
  )
}
