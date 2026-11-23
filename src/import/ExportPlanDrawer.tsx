import { Copy, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { EDITOR_URL } from '@/catalog/urls'
import { planFileOf, planFileText, type PlanFile } from '@/format/planFile'
import { FILE_FAIL, copy, shareFile } from '@/lib/share'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'

/** leva o plano pra fora (computador, outro app): texto pra quem tem a área de transferência compartilhada, arquivo pros outros */
export function ExportPlanDrawer({ file, onClose }: { file: PlanFile; onClose: () => void }) {
  const sendFile = async () => {
    try {
      await shareFile(planFileOf(file))
    } catch (e) {
      console.error(e)
      toast.error(FILE_FAIL)
    }
  }
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="flex flex-col gap-3 px-4 pb-5">
          <div>
            <DrawerTitle className="text-heading font-bold text-strong">Exportar plano</DrawerTitle>
            <DrawerDescription className="text-meta text-text-2">Edite no computador e importe de volta pelo Converter.</DrawerDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" className="flex-1" onClick={() => copy(planFileText(file), 'Plano copiado.')}><Copy aria-hidden="true" /> Copiar</Button>
            <Button variant="outline" size="lg" className="flex-1" onClick={() => void sendFile()}><FileDown aria-hidden="true" /> Gerar arquivo</Button>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-meta text-text-2">Pra editar no computador, abra:</span>
            <Button variant="link" className="justify-start text-text" onClick={() => copy(EDITOR_URL, 'Endereço copiado.')}>{EDITOR_URL.replace('https://', '')}</Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
