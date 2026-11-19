import type { ReactNode } from 'react'
import { FileUp, ListChecks } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'

export function Step({ n, title, sub, children }: { n: number; title: string; sub: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t border-line p-3.5 first:border-t-0">
      <Badge variant="outline" className="size-8 shrink-0 rounded-lg border-accent-line bg-accent-bg text-sm font-bold text-accent">{n}</Badge>
      <div className="min-w-0 flex-1">
        <div className="text-body font-semibold text-strong">{title}</div>
        <div className="text-meta text-text-2">{sub}</div>
      </div>
      {children}
    </div>
  )
}

type PasteProps = { text: string; onText: (t: string) => void; onFile: (t: string) => void; problems: string[]; placeholder: string; children?: ReactNode }

export function PasteBox({ text, onText, onFile, problems, placeholder, children }: PasteProps) {
  return (
    <>
      <Textarea
        aria-label="Resposta da IA"
        rows={8}
        className="p-3.5"
        placeholder={placeholder}
        value={text}
        onChange={(e) => onText(e.target.value)}
      />
      <Button asChild variant="secondary" className="cursor-pointer font-medium">
       <label>
        <FileUp size={16} aria-hidden="true" />
        Escolher arquivo
        <input type="file" hidden accept=".json,application/json,text/plain" onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = '' // o mesmo arquivo de novo dispara de novo
          if (f) onFile(await f.text())
        }} />
       </label>
      </Button>
      {children}
      {problems.length > 0 && (
        <Alert variant="destructive">
          <ul className="flex flex-col gap-1">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </Alert>
      )}
    </>
  )
}

/** a IA nem sempre abre o link da lista: copia a mesma lista, servida pelo próprio app */
export function CopyListButton({ file, noun, copy, fail }: { file: string; noun: string; copy: (text: string) => void; fail: (msg: string) => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="h-auto min-h-11 justify-start gap-3 px-3.5 py-2 text-left"
      onClick={async () => {
        try {
          const r = await fetch(`${import.meta.env.BASE_URL}catalog/${file}`)
          if (!r.ok) throw new Error(String(r.status))
          copy(await r.text())
        } catch {
          fail('Sem internet pra copiar a lista.')
        }
      }}
    >
      <ListChecks size={16} aria-hidden="true" />
      <span>
        <span className="block text-sm font-medium">{`Copiar a lista de ${noun}`}</span>
        <span className="block text-meta font-normal text-text-2">Se sua IA não abrir o link</span>
      </span>
    </Button>
  )
}
