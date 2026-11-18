import type { ReactNode } from 'react'
import { FileUp } from 'lucide-react'

export function Step({ n, title, sub, children }: { n: number; title: string; sub: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t border-line p-3.5 first:border-t-0">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-accent-line bg-accent-bg text-sm font-bold text-accent">{n}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-strong">{title}</div>
        <div className="text-[13px] text-text-2">{sub}</div>
      </div>
      {children}
    </div>
  )
}

type PasteProps = { text: string; onText: (t: string) => void; onFile: (t: string) => void; problems: string[]; placeholder: string; children?: ReactNode }

export function PasteBox({ text, onText, onFile, problems, placeholder, children }: PasteProps) {
  return (
    <>
      <textarea
        aria-label="Resposta da IA"
        rows={8}
        className="w-full resize-none card p-3.5 text-base text-text outline-none placeholder:text-faint focus-visible:border-accent-line"
        placeholder={placeholder}
        value={text}
        onChange={(e) => onText(e.target.value)}
      />
      <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-medium text-secondary-foreground">
        <FileUp size={16} aria-hidden="true" />
        Escolher arquivo
        <input type="file" hidden accept=".json,application/json,text/plain" onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = '' // o mesmo arquivo de novo dispara de novo
          if (f) onFile(await f.text())
        }} />
      </label>
      {children}
      {problems.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 card p-3.5 text-[13px] text-negative">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
    </>
  )
}
