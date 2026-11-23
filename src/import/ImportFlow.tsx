import type { ReactNode } from 'react'
import { AlertTriangle, Copy, FileUp, ListChecks } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { copy } from '@/lib/share'
import { catalogFile } from '@/catalog/catalog'
import { HEADER, type Half } from '@/format/envelope'
import { PLAN_FILE_ACCEPT } from '@/format/planFile'
import { namesText } from '@/lib/text'
import { BottomBar } from '@/components/BottomBar'
import { Chip, ChipRow } from '@/components/ChipRow'

export type ImportMode = 'ia' | 'convert'

function Step({ n, title, sub, children }: { n: number; title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t border-line p-3.5 first:border-t-0">
      <Badge variant="tile" className="size-8">{n}</Badge>
      <div className="min-w-0 flex-1">
        <div className="text-body font-semibold text-strong">{title}</div>
        {sub && <div className="text-meta text-text-2">{sub}</div>}
      </div>
      {children}
    </div>
  )
}

export function ImportGuide({ mode, made, source, prompt, children }: { mode: ImportMode; made: string; source: string; prompt: () => string; children?: ReactNode }) {
  const ia = mode === 'ia'
  return (
    <>
      <p className="text-meta text-text-2">
        {ia
          ? `O Pump não tem IA própria. Você leva um prompt pra sua IA (ChatGPT ou outra), ela monta seu ${made} e você cola a resposta aqui pra revisar antes de salvar.`
          : `Já tem uma ${source}? Mande ela pra sua IA junto com o prompt. A IA reescreve no formato do Pump e você cola a resposta aqui pra revisar antes de salvar.`}
      </p>
      {children}
      <Card size="flush">
        <Step n={1} title="Copie o prompt">
          <Button type="button" variant="outline" size="sm" onClick={() => copy(prompt(), 'Prompt copiado. Cole na sua IA.')}><Copy size={14} aria-hidden="true" />Copiar</Button>
        </Step>
        <Step n={2} title="Abra sua IA e cole o prompt" sub={ia ? 'ChatGPT, Gemini, Claude…' : `Junto com sua ${source} (PDF, foto ou texto)`} />
        <Step n={3} title="Copie a resposta inteira dela" sub="Não precisa escolher só o código" />
        <Step n={4} title="Volte aqui e cole abaixo" sub="Ou escolha o arquivo, se ela mandar um" />
        <Step n={5} title="Revise e salve" sub="Nada é salvo antes da sua revisão" />
      </Card>
    </>
  )
}

type PasteProps = { paste: { text: string; set: (t: string, now?: boolean) => void; problems: string[] }; half: Half; children?: ReactNode }

/** `paste`: o retorno de usePastedReview */
export function PasteBox({ paste: { text, set, problems }, half, children }: PasteProps) {
  return (
    <>
      <Textarea
        aria-label="Resposta da IA"
        rows={8}
        className="p-3.5"
        placeholder={`{ "formato": "${HEADER.formato}", "${half}": ... }`}
        value={text}
        onChange={(e) => set(e.target.value)}
      />
      <Button asChild variant="secondary" className="cursor-pointer font-medium">
       <label>
        <FileUp size={16} aria-hidden="true" />
        Escolher arquivo
        <input type="file" hidden accept={PLAN_FILE_ACCEPT} onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = '' // o mesmo arquivo de novo dispara de novo
          if (f) set(await f.text(), true)
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
export function CopyListButton({ file, noun }: { file: string; noun: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="h-auto min-h-11 justify-start gap-3 px-3.5 py-2 text-left"
      onClick={() => copy(catalogFile(file).then((r) => r.text()), 'Lista copiada. Cole na sua IA.')}
    >
      <ListChecks size={16} aria-hidden="true" />
      <span>
        <span className="block text-sm font-medium">{`Copiar a lista de ${noun}`}</span>
        <span className="block text-meta font-normal text-text-2">Se sua IA não abrir o link</span>
      </span>
    </Button>
  )
}

export function ReviewTabs({ label, items, current, onPick }: { label: string; items: { id: string; name: string }[]; current: string; onPick: (n: number) => void }) {
  if (items.length < 2) return null
  return (
    <ChipRow label={label} className="-mx-4">
      {items.map((it, n) => <Chip key={it.id} pressed={it.id === current} onPressedChange={() => onPick(n)}>{it.name}</Chip>)}
    </ChipRow>
  )
}

export function OutsideCatalog({ title, names }: { title: string; names: string[] }) {
  if (!names.length) return null
  return (
    <Card className="flex-row items-start gap-2 text-meta text-text-2">
      <AlertTriangle size={16} className="mt-px shrink-0 text-warning" aria-hidden="true" />
      <span>
        {title}
        <span className="block">{namesText(names)}</span>
      </span>
    </Card>
  )
}

/** a revisão da metade `half` avisa que a outra, ignorada, vai na outra aba */
const IGNORED: Record<Half, string> = {
  dieta: 'Os treinos deste arquivo podem ser importados na aba Treino',
  treinos: 'A dieta deste arquivo pode ser importada na aba Dieta',
}

export function ReviewActions({ half, ignored, use, onEdit, onUse }: { half: Half; ignored: boolean; use: string; onEdit: () => void; onUse: () => void }) {
  return (
    <>
      {ignored && <p className="text-meta text-text-2">{IGNORED[half]}</p>}
      <BottomBar className="gap-2">
        <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={onEdit}>Editar</Button>
        <Button type="button" className="flex-1" onClick={onUse}>{use}</Button>
      </BottomBar>
    </>
  )
}
