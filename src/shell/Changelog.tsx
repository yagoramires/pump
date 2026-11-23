import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { SheetBody } from '@/components/SheetRow'
import { formatDayMonth } from '@/lib/date'
import { CHANGELOG, type Release } from './releases'

const LIST = [['Novidades', 'novidades'], ['Correções', 'correcoes']] as const

export function ReleaseNotes({ release }: { release: Release }) {
  return (
    <>
      {LIST.map(([title, key]) => release[key].length > 0 && (
        <section key={key} className="pt-2">
          <h3 className="label-section pb-1">{title}</h3>
          <ul className="list-disc space-y-1 pl-5 text-body text-text">
            {release[key].map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ))}
    </>
  )
}

export function ChangelogList() {
  return (
    <div className="mt-3 space-y-5">
      {CHANGELOG.map((r) => (
        <article key={r.version}>
          <h2 className="text-title font-semibold text-strong">{formatDayMonth(r.date)}</h2>
          <ReleaseNotes release={r} />
        </article>
      ))}
    </div>
  )
}

/** abre sozinho uma vez quando entra uma versão nova no topo do CHANGELOG */
export function WhatsNew({ seen, onClose }: { seen?: number; onClose: (version: number) => void }) {
  const latest = CHANGELOG[0]
  if (seen === latest.version) return null
  return (
    <Drawer open onOpenChange={(o) => !o && onClose(latest.version)}>
      <DrawerContent>
        <SheetBody>
          <DrawerTitle className="shrink-0 text-title font-semibold text-strong">Novidades</DrawerTitle>
          <DrawerDescription className="text-meta text-text-2">{`Atualização de ${formatDayMonth(latest.date)}`}</DrawerDescription>
          <ReleaseNotes release={latest} />
          <Button className="mt-4 w-full font-bold" onClick={() => onClose(latest.version)}>Entendi</Button>
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}
