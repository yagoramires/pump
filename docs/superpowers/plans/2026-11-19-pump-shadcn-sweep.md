# Troca dos componentes feitos à mão por shadcn/ui · Plano

> Pedido do Yago (2026-11-19): "ajusta os date pickers e todos os componentes pra serem bonitos, usa shadcn e tailwind no app, dá replace em todos os componentes" + "não faz nada hardcoded, usa a lib pra deixar o app mais profissional".

**Goal:** Toda a interface usa componentes do shadcn/ui (adicionados pelo CLI oficial, `components.json` já existe, estilo new-york, Tailwind v4, radix-ui), sem botões, campos, cartões ou controles montados à mão.

## Regras para todas as ondas

- Componente que faltar entra com `bunx shadcn@latest add <nome>` (nunca escrito à mão). Ajustes visuais só via tokens/variáveis do tema (Grafite) e variantes (`cva`) dos próprios componentes — nada de cores/tamanhos soltos por tela quando houver variante ou token.
- Mapeamento:
  - `<button>` cru → `Button` (variant/size; `size="icon"` pra ícone) ou o primitivo certo (`ToggleGroupItem`, `TabsTrigger`, `AccordionTrigger`, `DropdownMenuItem`…).
  - `<input>` cru → `Input` (+ `Label`); arquivo escondido pode continuar `<input type="file" hidden>` acionado por `Button`.
  - `<textarea>` → `Textarea`; `<select>` → `Select`.
  - Horário (`type="time"`) → `TimePicker` composto de `Popover` + `ScrollArea` (colunas hora/minuto, passo de 5 min) + `Button`, com o valor `HH:MM` igual ao de hoje.
  - Bloco `card` → `Card`/`CardHeader`/`CardContent`; separadores → `Separator`; etiquetas/contagens → `Badge`.
  - Controles com `role="switch|checkbox|radio|radiogroup"` ou `aria-pressed` feitos à mão → `Switch`, `Checkbox`, `RadioGroup`, `ToggleGroup`.
  - Acordeão de exercícios → `Accordion`/`Collapsible`; abas/ângulos → `Tabs`; gaveta continua `Drawer` (vaul) e diálogo `AlertDialog`; barra de progresso → `Progress`.
- **Espaçamento e alinhamento** (Yago, 2026-11-19: "achei uns problemas de UI, como gaps, alinhamentos"): uma escala só — padding de cartão pelos defaults de `CardHeader`/`CardContent`; um `gap-*`/`space-y-*` por contêiner em vez de `mb-`/`mt-` soltos nos filhos; linhas de lista com mesma altura e padding; ícone centrado com o texto; números `tabular-nums` com alinhamento consistente; botões lado a lado com a mesma altura. Sem margens avulsas (`mt-0.5`, `-mt-2`, `mb-2.5`) onde o gap do contêiner resolve. A onda 2 registra as convenções no relatório e as próximas seguem.
- Comportamento igual: mesmos textos, mesmas ações, mesmos nomes acessíveis (os testes procuram por papel e nome). Se um teste quebrar só porque o elemento mudou de tipo, ajustar o teste para o papel novo, sem perder a asserção.
- Cada onda: `bunx tsc -b && bun run test && bun run lint && bun run build` verdes; graphify (`graphify query` antes de explorar, `graphify update .` depois, sem commitar `graphify-out`); commits sem Co-Authored-By; sem push; nunca apagar pastas inteiras nem usar pkill; não parar o dev server do Yago (porta 5180).

## Ondas

1. **Base:** adicionar pelo CLI `card textarea select popover scroll-area label separator badge switch checkbox radio-group tabs accordion progress dropdown-menu`; criar `src/components/TimePicker.tsx`; trocar os 2 horários (AboutForm, DietEditor), os 3 textarea, o select (CatalogPicker); kit compartilhado (`BackHeader`, `SheetRow`, `SettingsSection`, `ImportFlow`, `Chips`, `EmptyState`, `Step`, `NumberField`) pra componentes da lib.
2. **Treino:** TreinoTab, ExerciseCard (Accordion), SetTable (Checkbox + Input), PlanEditor, ExerciseDrawer, CatalogPicker, SwitchWorkout, PastWorkouts, PlanImport, UnfinishedCard, RestCard.
3. **Dieta:** DietTab, MealScreen, DietEditor, FoodPicker, WaterCard, WaterSettings, DietImport, DietStart.
4. **Evolução, Ajustes, montagem, perfil:** EvolutionTab, HistoryScreen, PhotoCapture, PhotoCompare, AngleTabs (Tabs), AnamnesisCard, CheckInFlow, BottomNav, SettingsScreen, App (engrenagem), Onboarding, DayZero, AboutForm, GoalsForm, CheckInDayChips, ProfileScreen.
5. **Conferência visual** (Playwright 390×844, todas as telas) + revisão geral.

**Feito quando:** `grep` não acha `<button`, `<input` (fora o de arquivo), `<textarea`, `<select`, `type="time"` nem `role="switch|radio|checkbox"` à mão fora de `src/components/ui`.
