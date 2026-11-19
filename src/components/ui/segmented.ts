// único estilo "segmentado": Tabs (seleção exclusiva) e ToggleGroup (chips) compartilham lista e item.
// O item selecionado tem o mesmo tamanho dos outros (só cor e anel interno mudam).
export const segmentedList = "inline-flex w-full items-center gap-1 rounded-xl border border-border bg-panel p-[3px]"

export const segmentedItem =
  "inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-transparent px-3 text-meta font-semibold whitespace-nowrap text-text-2 transition-colors outline-none hover:not-data-[state=active]:not-data-[state=on]:text-strong focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-surface data-[state=active]:text-strong data-[state=active]:shadow-[inset_0_0_0_1px_var(--color-border-strong)] data-[state=on]:bg-surface data-[state=on]:text-strong data-[state=on]:shadow-[inset_0_0_0_1px_var(--color-border-strong)]"
