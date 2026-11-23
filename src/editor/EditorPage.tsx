import { Suspense, useEffect, useId, useState } from 'react'
import { ClipboardPaste, Copy, FileDown, FileUp } from 'lucide-react'
import { toast } from 'sonner'
import { catalogOrNull, fetchExercises, fetchTaco } from '@/catalog/catalog'
import { DietEditor } from '@/diet/DietEditor'
import { planProblem as dietProblem } from '@/diet/dietFormat'
import { FormatError } from '@/format/envelope'
import { PLAN_FILE_ACCEPT, planFileOf, planFileText, readPlanFile, type PlanFile } from '@/format/planFile'
import { FILE_FAIL, copy, downloadFile } from '@/lib/share'
import { PlanEditor } from '@/workout/PlanEditor'
import { planProblem as workoutProblem } from '@/workout/planFormat'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { Loading } from '@/components/Loading'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type Half = keyof PlanFile
const LOAD = { exercises: () => catalogOrNull(fetchExercises()), taco: () => catalogOrNull(fetchTaco()) }

/** editor no computador: abre o arquivo do Pump, edita com os mesmos editores do app e exporta de volta. Nada fica no aparelho */
export function EditorPage() {
  const inputId = useId()
  const [file, setFile] = useState<PlanFile>({})
  const [dirty, setDirty] = useState<Partial<Record<Half, boolean>>>({})
  // trocar o arquivo remonta o editor da metade (ele guarda o próprio rascunho)
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState<Half>('workout')
  const [problems, setProblems] = useState<string[]>([])
  const [pending, setPending] = useState<PlanFile>()
  const [pasting, setPasting] = useState(false)
  const [pasted, setPasted] = useState('')

  const changed = !!(dirty.workout || dirty.diet)
  useEffect(() => {
    if (!changed) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = '' // Safari antigo só pergunta com o returnValue legado
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [changed])

  const apply = (next: PlanFile) => {
    setFile((f) => ({ ...f, ...next }))
    setDirty((d) => ({ ...d, ...(next.workout && { workout: false }), ...(next.diet && { diet: false }) }))
    setVersion((v) => v + 1)
    setTab(next.workout ? 'workout' : 'diet')
    setPending(undefined)
  }

  const load = async (text: string) => {
    setProblems([])
    try {
      const next = await readPlanFile(text, LOAD)
      if ((next.workout && dirty.workout) || (next.diet && dirty.diet)) setPending(next)
      else apply(next)
    } catch (e) {
      setProblems(e instanceof FormatError ? e.problems : ['Não consegui ler esse arquivo.'])
    }
  }

  const exportable = (): PlanFile | undefined => {
    const found = !file.workout && !file.diet
      ? ['Abra um plano antes de exportar.']
      : [file.workout && workoutProblem(file.workout), file.diet && dietProblem(file.diet)?.text].filter((p): p is string => !!p)
    setProblems(found)
    return found.length ? undefined : file
  }

  const copyPlan = async () => {
    const f = exportable()
    if (!f) return
    if (await copy(planFileText(f), 'Plano copiado. Importe no Pump pelo Converter.')) setDirty({})
  }

  const downloadPlan = () => {
    const f = exportable()
    if (!f) return
    try {
      downloadFile(planFileOf(f))
      setDirty({})
    } catch (e) {
      console.error(e)
      toast.error(FILE_FAIL)
    }
  }

  const openFile = () => document.getElementById(inputId)?.click()

  return (
    <div className="mx-auto flex min-h-dvh max-w-screen-2xl flex-col gap-4 px-4 py-5 md:px-8">
      <header className="flex flex-wrap items-center gap-3">
        <span className="text-title font-extrabold tracking-tight text-strong">Pump<span className="ml-1.5 text-meta font-medium text-text-2">Editor</span></span>
        <Tabs value={tab} onValueChange={(v) => setTab(v as Half)}>
          <TabsList>
            <TabsTrigger value="workout">Treino</TabsTrigger>
            <TabsTrigger value="diet">Dieta</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={openFile}><FileUp aria-hidden="true" /> Abrir arquivo</Button>
          <Button variant="outline" onClick={() => setPasting(true)}><ClipboardPaste aria-hidden="true" /> Colar</Button>
          <Button variant="outline" onClick={() => void downloadPlan()}><FileDown aria-hidden="true" /> Baixar arquivo</Button>
          <Button onClick={() => void copyPlan()}><Copy aria-hidden="true" /> Copiar plano</Button>
        </div>
        <input id={inputId} type="file" hidden accept={PLAN_FILE_ACCEPT} aria-label="Arquivo do plano" onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = '' // o mesmo arquivo de novo dispara de novo
          if (f) await load(await f.text())
        }} />
      </header>

      {problems.length > 0 && (
        <Alert variant="destructive">
          <ul className="flex flex-col gap-1">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </Alert>
      )}

      <Suspense fallback={<Loading />}>
        {tab === 'workout' && (file.workout
          ? <PlanEditor key={`w${version}`} initial={file.workout} onChange={(workout) => { setFile((f) => ({ ...f, workout })); setDirty((d) => ({ ...d, workout: true })) }} />
          : <Empty onOpen={openFile} />)}
        {tab === 'diet' && (file.diet
          ? <DietEditor key={`d${version}`} initial={file.diet} onChange={(diet) => { setFile((f) => ({ ...f, diet })); setDirty((d) => ({ ...d, diet: true })) }} />
          : <Empty onOpen={openFile} />)}
      </Suspense>

      <Drawer open={pasting} onOpenChange={setPasting}>
        <DrawerContent>
          <div className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 pb-5">
            <DrawerTitle className="text-heading font-bold text-strong">Colar plano</DrawerTitle>
            <DrawerDescription className="text-meta text-text-2">Cole o texto que o Pump copiou em Exportar plano.</DrawerDescription>
            <Textarea aria-label="Plano copiado" rows={8} value={pasted} onChange={(e) => setPasted(e.target.value)} />
            <Button size="lg" disabled={!pasted.trim()} onClick={() => { setPasting(false); void load(pasted).then(() => setPasted('')) }}>Carregar</Button>
          </div>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={!!pending}
        title="Trocar o plano aberto?"
        text="As mudanças que você ainda não exportou se perdem."
        confirm="Trocar"
        destructive
        onConfirm={() => pending && apply(pending)}
        onCancel={() => setPending(undefined)}
      />
    </div>
  )
}

function Empty({ onOpen }: { onOpen: () => void }) {
  return (
    <EmptyState icon={<FileUp size={28} aria-hidden="true" />} title="Abra o arquivo exportado pelo Pump">
      <p className="max-w-sm text-meta text-text-2">No app, vá em Configurações, Exportar plano, e gere o arquivo ou copie o texto.</p>
      <Button variant="outline" onClick={onOpen}>Abrir arquivo</Button>
    </EmptyState>
  )
}
