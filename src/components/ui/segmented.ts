// único estilo "segmentado": Tabs (seleção exclusiva) e ToggleGroup (chips) compartilham lista e item.
// Trilho em surface; o selecionado sobe pra raised com sombra leve, no mesmo tamanho dos outros.
export const segmentedList = "inline-flex w-full items-center gap-1 rounded-xl bg-surface p-[3px]"

export const segmentedItem =
  "inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-transparent px-3 text-meta font-semibold whitespace-nowrap text-text-2 transition-colors outline-none hover:not-data-[state=active]:not-data-[state=on]:text-strong focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-raised data-[state=active]:text-strong data-[state=active]:shadow-[0_1px_2px_var(--color-shadow)] data-[state=on]:bg-raised data-[state=on]:text-strong data-[state=on]:shadow-[0_1px_2px_var(--color-shadow)]"
