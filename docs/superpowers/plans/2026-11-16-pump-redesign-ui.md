# Pump — Redesign da UI — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refazer todas as telas do Pump no sistema visual do Yield, adaptado pro celular, com Tailwind + shadcn/ui, sem barras de rolagem visíveis e com o novo jeito de marcar séries (lista compacta + tabela de séries). A lógica de dados, o offline e o backup não mudam.

**Architecture:**
- Tailwind v4 entra pelo plugin do Vite, com os tokens do Yield no `@theme`. As variáveis do shadcn apontam pros mesmos tokens.
- Os componentes do shadcn são copiados pra `src/components/ui/`. Só entra o que é usado: button, input, drawer, sonner, toggle-group, alert-dialog.
- Cada tela é reescrita em cima disso.
- Os cálculos novos são funções puras e testadas em `src/workout/stats.ts`: resumo do treino, "anterior" e reps em número.
- O único dado novo é `WorkoutSession.startedAt`, que é opcional.
- O `theme.css` antigo sai na última task de tela.

**Tech Stack:** o que já existe (React 19, Vite 8, TS, bun, vitest, idb-keyval, lucide-react, vite-plugin-pwa), mais tailwindcss 4 com `@tailwindcss/vite`, e shadcn/ui (CLI) com vaul, sonner, radix toggle-group e alert-dialog, `clsx` e `tailwind-merge`.

**Spec:** [`docs/superpowers/specs/2026-11-16-pump-redesign-ui-design.md`](../specs/2026-11-16-pump-redesign-ui-design.md) · **Mockup:** [`docs/design/redesign-todas-as-telas.html`](../../design/redesign-todas-as-telas.html), com 11 telas. Ele é a referência visual de cada task de tela.

## Global Constraints

- **Tokens** (spec §6.1, modo escuro):

  | token | valor |
  |---|---|
  | bg | `#0b0c0d` |
  | panel | `#121315` |
  | surface | `#1a1b1f` |
  | line | `#222428` |
  | border | `#26282e` |
  | border-strong | `#3a3d45` |
  | text | `#d6d8dd` |
  | text-2 | `#8a8d96` |
  | faint | `#5d6068` |
  | strong | `#fff` |
  | accent | `#c6ff3d` |
  | on-accent | `#0b0c0d` |
  | accent-bg | `#1a2309` |
  | accent-line | `#34440d` |
  | negative | `#ff6e70` |
  | c1 … c8 | `#6d9c04 #3a91dc #dc5f52 #956ed2 #a77e33 #009f99 #c68206 #cd6199` |

- **Fonte:** `-apple-system, "SF Pro Display", Inter, sans-serif`. Números em `tabular-nums`.
- **Raios:** card 14px, controle 10–12px, gaveta 22px no topo. Os rótulos são maiúsculos, de 10px, em `faint`.
- **Rolagem:** sem barras visíveis em nenhuma tela: `* { scrollbar-width: none } *::-webkit-scrollbar { display: none }`.
- **Toque:** alvos de pelo menos 44×44 px (o desenho pode ser menor) e ações principais na metade de baixo da tela.
- **Visual:** pt-BR, só tema escuro, ícones só do lucide, sem emojis nem caractere como ícone. Nada com cara de "shadcn padrão": as variáveis do shadcn sempre usam os tokens acima.
- **Peso:** só os componentes do shadcn listados em Architecture, nunca o kit inteiro.
- **O que não muda:** dados, offline, backup, service worker, formato Pump e `base: '/pump/'`. A única mudança de dado é `WorkoutSession.startedAt?: string`.
- **Testes:** a cobertura de comportamento atual continua existindo: marcar série, descanso restaurado, cópia da sessão, exercício sem foto, toques rápidos, troca de dia, montagem, restauração de backup, tela de erro e dados ilegíveis. Mudam só os seletores de UI.
- **Commits:** em inglês, no formato Conventional Commits, com o assunto em até 72 caracteres. **Sem `Co-Authored-By` e sem rodapé.**
- **Push:** nada de `git push`. Push na `main` publica no Pages, e por isso só se faz com OK do Yago.

## Review Focus

1. **Nome de exercício longo e exercício com 6 séries ou mais** numa tela de 390px: o nome quebra linha e a tabela não rola de lado. Teste na Task 3, e confirmação visual na Task 7.
2. **Vírgula decimal ("22,5")** na carga da tabela, na gaveta do editor e no peso do perfil: grava 22.5. Um valor inválido mantém o anterior. Testes nas Tasks 2, 3 e 4.
3. **Dois checks rápidos em séries diferentes** usando a edição nova: os dois persistem, porque toda gravação parte do último valor salvo. Teste na Task 3.
4. **Sessão ou backup de antes do redesign, sem `startedAt`:** o resumo aparece sem o tempo e nada quebra. Testes nas Tasks 2 e 3.
5. **Sem internet** no seletor de exercícios e na escolha de plano: as mensagens de offline continuam aparecendo na UI nova. Testes nas Tasks 4 e 5.

---

## Estrutura de arquivos

```
src/
  index.css                      Tailwind + @theme (tokens) + vars do shadcn + base (scrollbar, fonte)   [novo; substitui theme.css na Task 6]
  lib/utils.ts                   cn() do shadcn                                                         [novo]
  lib/number.ts                  parseDecimal, formatKg                                                 [novo]
  components/ui/*.tsx            button, input, drawer, sonner, toggle-group, alert-dialog (shadcn)     [novo]
  components/IconDot.tsx         círculo colorido com ícone                                             [novo]
  components/EmptyState.tsx      estado vazio (ícone grande, título, texto, filhos)                     [novo]
  components/muscleColor.ts      grupo muscular → cor c1..c8                                            [novo]
  workout/stats.ts               sessionStats, previousSets, repsNumber, firstIncomplete                [novo]
  workout/TreinoTab.tsx          reescrito
  workout/ExerciseCard.tsx       linha fechada / aberta com SetTable                                    [novo; substitui ExerciseRow]
  workout/SetTable.tsx           Série | Anterior | kg | Reps | ✓                                       [novo; substitui SetEditor]
  workout/RestCard.tsx           cartão flutuante do descanso                                           [novo; substitui RestBanner]
  workout/ExercisePreview.tsx    vira Drawer
  workout/PlanEditor.tsx         reescrito (linhas + ExerciseDrawer)
  workout/ExerciseDrawer.tsx     gaveta de ajuste                                                       [novo]
  workout/PlanImport.tsx         reescrito (revisão automática)
  catalog/CatalogPicker.tsx      reescrito
  onboarding/Onboarding.tsx      reescrito (passos, perfil, planos)
  shell/*                        BottomNav, SettingsScreen, InstallGate, ErrorBoundary, ImportBackupButton, ComingSoon reescritos; Toast.tsx removido (Sonner)
```

## Tasks

### Task 1: Base visual (Tailwind, shadcn, tokens), utilitários e barra de abas

**Files:**
- Create: `src/index.css`, `src/lib/utils.ts`, `src/lib/number.ts`, `src/components/ui/{button,input,drawer,sonner,toggle-group,alert-dialog}.tsx`, `src/components/IconDot.tsx`, `src/components/EmptyState.tsx`, `src/components/muscleColor.ts`, `components.json`
- Modify: `package.json`, `bun.lock`, `vite.config.ts` (plugin `@tailwindcss/vite` e alias `@`), `tsconfig.json` e `tsconfig.app.json` (`paths: { "@/*": ["./src/*"] }`), `src/main.tsx` (importa `index.css` **antes** de `theme.css`), `src/App.tsx` (casca com `<Toaster />`), `src/shell/BottomNav.tsx`
- Test: `src/lib/number.test.ts`, `src/components/muscleColor.test.ts`, `src/shell/BottomNav.test.tsx` (já existe e precisa continuar passando)

**Interfaces:**
- Produces:
  - `cn(...inputs: ClassValue[]): string`
  - `parseDecimal(s: string): number | null`: aceita "22,5", "22.5" e " 80 ". Devolve `null` pra vazio, não-numérico ou negativo.
  - `formatKg(n: number): string`: 42.5 vira `"42,5"` e 40 vira `"40"`.
  - `muscleColor(muscles: string[]): string` devolve o **nome da var CSS** (ex.: `'var(--c2)'`) pelo primeiro músculo do mapa:
    - peito → c2;
    - dorsais, meio das costas, lombar, trapézio → c6;
    - quadríceps, posteriores de coxa, glúteos, panturrilhas, adutores, abdutores → c1;
    - ombros → c4;
    - bíceps, tríceps, antebraços → c3;
    - abdominais → c7;
    - o resto → c5.
  - `<IconDot color={string} size={32 | 36 | 72}>{icon}</IconDot>`: fundo com a cor em ~13% (`color-mix(in srgb, <color> 13%, transparent)`) e o ícone na cor cheia.
  - `<EmptyState icon={ReactNode} title={string} tone?: 'accent' | 'negative'>{children}</EmptyState>`: o título é um `<h1>`.
  - Componentes do shadcn com os nomes padrão (`Button` com as variantes `default` = verde, `secondary` = surface, `ghost` e `destructive`; `Drawer*`; `Toaster`/`toast`; `ToggleGroup*`; `AlertDialog*`).
  - CSS: as classes utilitárias do Tailwind com os tokens como cores (`bg-bg`, `bg-panel`, `bg-surface`, `border-border`, `text-text`, `text-text-2`, `text-faint`, `text-strong`, `bg-accent`, `text-on-accent`, `bg-accent-bg`, `border-accent-line`, `text-negative`, `c1..c8`).

- [ ] **Step 1:** Instalar com `bun add tailwindcss @tailwindcss/vite clsx tailwind-merge class-variance-authority` e rodar `bunx shadcn@latest init`. Respostas: CSS variables, base color neutral (vai ser sobrescrita) e alias `@/components`, `@/lib`. Depois, `bunx shadcn@latest add button input drawer sonner toggle-group alert-dialog`. Conferir que nada além disso entrou.
- [ ] **Step 2: Escrever `src/index.css`:**
  - `@import "tailwindcss"`;
  - `@theme` com os tokens das Global Constraints e a fonte;
  - variáveis do shadcn (`--background: var(--bg)`, `--card: var(--panel)`, `--primary: var(--accent)`, `--primary-foreground: var(--on-accent)`, `--secondary: var(--surface)`, `--border: var(--border)`, `--input: var(--border)`, `--ring: var(--accent)`, `--destructive: var(--negative)`, `--radius: 0.75rem`);
  - base: `html { color-scheme: dark }`, `body { background: var(--bg); color: var(--text) }`, regra de scrollbar, `-webkit-tap-highlight-color: transparent` e `font-variant-numeric` nos números.
- [ ] **Step 3: Escrever os testes que falham**

```ts
test('parseDecimal aceita vírgula e recusa lixo', () => {
  expect(parseDecimal('22,5')).toBe(22.5)
  expect(parseDecimal(' 80 ')).toBe(80)
  expect(parseDecimal('22.5')).toBe(22.5)
  expect(parseDecimal('')).toBeNull()
  expect(parseDecimal('abc')).toBeNull()
  expect(parseDecimal('-3')).toBeNull()
})
test('formatKg usa vírgula e omite ,0', () => {
  expect(formatKg(42.5)).toBe('42,5')
  expect(formatKg(40)).toBe('40')
})
test('muscleColor pelo primeiro músculo conhecido', () => {
  expect(muscleColor(['peito', 'tríceps'])).toBe('var(--c2)')
  expect(muscleColor(['dorsais'])).toBe('var(--c6)')
  expect(muscleColor(['quadríceps'])).toBe('var(--c1)')
  expect(muscleColor([])).toBe('var(--c5)')
})
```

- [ ] **Step 4:** Rodar `bun run test`. Esperado: FAIL (módulos inexistentes).
- [ ] **Step 5:** Implementar `number.ts`, `muscleColor.ts`, `IconDot` e `EmptyState`.
- [ ] **Step 6: Reescrever o `BottomNav`.** Barra fixa embaixo de ponta a ponta, com `bg-panel border-t border-border` e altura de 68px mais a área segura. Cada aba tem ícone de 20px e rótulo de 10px (Treino, Evolução, Dieta), em `faint`, e a ativa fica em `accent`. Manter `aria-current="page"` e os nomes acessíveis. Pôr `<Toaster />` (tema escuro, posição `top-center`) no `App`.
- [ ] **Step 7:** Rodar `bun run test`, `bun run build` e `bun run lint`. Esperado: tudo verde, incluindo o `BottomNav.test.tsx` existente. As telas antigas ainda usam o `theme.css`, que continua importado depois do `index.css`.
- [ ] **Step 8:** Commit `feat(ui): tailwind + shadcn base with yield tokens and new tab bar`.

---

### Task 2: Cálculos do resumo, coluna "Anterior" e `startedAt`

**Files:**
- Create: `src/workout/stats.ts`
- Modify: `src/types.ts` (`WorkoutSession.startedAt?: string`), `src/workout/session.ts` (`startSession(w, date, now = new Date())` grava `startedAt: now.toISOString()`)
- Test: `src/workout/stats.test.ts`, `src/workout/session.test.ts`

**Interfaces:**
- Consumes: os tipos de `src/types.ts` e `pe`/`workoutOf` de `test/helpers.ts`.
- Produces:
  - `repsNumber(reps: string): number` é o primeiro inteiro da string. Vale 0 se não houver.
  - `sessionStats(s: WorkoutSession, now: Date): { done: number; total: number; volumeKg: number; minutes: number | null }`:
    - `total` = soma de `sets.length`;
    - `done` = séries diferentes de `null`;
    - `volumeKg` = Σ `weightKg × repsNumber(reps)` das séries feitas;
    - `minutes` = `floor((fim − startedAt)/60000)`, onde fim é `completedAt` se existir, senão `now`. Vale `null` sem `startedAt`.
  - `previousSets(log: WorkoutLog, today: string, exerciseId: string): (SetDone | null)[]` devolve os `sets` desse `exerciseId` na sessão mais recente com data **anterior** a `today` que o contenha. Se não houver, devolve `[]`.
  - `firstIncomplete(s: WorkoutSession): number` é o índice do primeiro exercício com alguma série `null`. Vale `-1` se todos estiverem completos.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('repsNumber pega o primeiro número', () => {
  expect(repsNumber('10')).toBe(10); expect(repsNumber('10-12')).toBe(10); expect(repsNumber('falha')).toBe(0)
})
test('sessionStats: feitas, total, volume e tempo', () => {
  const s = { ...startSession(workoutOf([{ sets: 3 }, { sets: 2 }]), '2026-11-16', new Date(2026, 10, 16, 18, 0)) }
  s.exercises[0].sets = [{ reps: '10', weightKg: 40 }, { reps: '8-10', weightKg: 42.5 }, null]
  expect(sessionStats(s, new Date(2026, 10, 16, 18, 32))).toEqual({ done: 2, total: 5, volumeKg: 740, minutes: 32 })
})
test('sessionStats sem startedAt (sessão antiga) não tem tempo', () => {
  const s = startSession(workoutOf([{ sets: 1 }]), '2026-11-16'); delete s.startedAt
  expect(sessionStats(s, new Date()).minutes).toBeNull()
})
test('sessionStats congela o tempo em completedAt', () => {
  const s = { ...startSession(workoutOf([{ sets: 1 }]), '2026-11-16', new Date(2026, 10, 16, 18, 0)), completedAt: new Date(2026, 10, 16, 18, 50).toISOString() }
  expect(sessionStats(s, new Date(2026, 10, 16, 23, 0)).minutes).toBe(50)
})
test('previousSets pega a sessão anterior mais recente com o exercício', () => {
  const mk = (date: string, sets: (SetDone | null)[]) => ({ date, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', exercises: [{ ...pe({ exerciseId: 'Supino' }), sets }] })
  const log = { '2026-11-09': mk('2026-11-09', [{ reps: '8', weightKg: 35 }]), '2026-11-12': mk('2026-11-12', [{ reps: '10', weightKg: 40 }, null]), '2026-11-16': mk('2026-11-16', [{ reps: '12', weightKg: 45 }]) }
  expect(previousSets(log, '2026-11-16', 'Supino')).toEqual([{ reps: '10', weightKg: 40 }, null])
  expect(previousSets(log, '2026-11-16', 'Outro')).toEqual([])
})
test('firstIncomplete', () => {
  const s = startSession(workoutOf([{ sets: 1 }, { sets: 1 }]), '2026-11-16')
  s.exercises[0].sets = [{ reps: '10', weightKg: 0 }]
  expect(firstIncomplete(s)).toBe(1)
  s.exercises[1].sets = [{ reps: '10', weightKg: 0 }]
  expect(firstIncomplete(s)).toBe(-1)
})
```

No `session.test.ts`, acrescentar: `startSession(w, d, new Date(2026,10,16,18,0)).startedAt` igual a `new Date(2026,10,16,18,0).toISOString()`.

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar. O `parseBackup` não muda, porque o campo é opcional.
- [ ] **Step 4:** Rodar `bun run test`. Esperado: PASS, incluindo os testes antigos de sessão e backup.
- [ ] **Step 5:** Commit `feat(workout): session stats, previous sets and startedAt`.

---

### Task 3: Aba Treino nova (resumo, lista em acordeão, tabela de séries, descanso, preview)

**Files:**
- Create: `src/workout/ExerciseCard.tsx`, `src/workout/SetTable.tsx`, `src/workout/RestCard.tsx`
- Modify: `src/workout/TreinoTab.tsx`, `src/workout/ExercisePreview.tsx` (vira `Drawer`), `src/workout/TreinoTab.test.tsx`
- Delete: `src/workout/ExerciseRow.tsx`, `src/workout/SetEditor.tsx`, `src/workout/RestBanner.tsx`, `src/shell/Toast.tsx` (o toast vira `toast()` do sonner)

**Interfaces:**
- Consumes: `sessionStats`, `previousSets`, `firstIncomplete` (Task 2); `parseDecimal`, `formatKg`, `muscleColor`, `IconDot`, `EmptyState`, `Button`, `Drawer`, `toast` (Task 1); e o resto que a aba já usa (`usePersisted` com função que parte do último valor salvo, `startSession`, `setDone`, `setRestEnd`, `completeSession`, `remainingSec`, `unlockAudio`, `beep`, `workoutForDate`, `todayKey`, `formatDayLabel`, `imageUrl`, `PlanEditor`).
- Produces:
  - `<SetTable ex={SessionExercise | PlanExercise-like} prev={(SetDone|null)[]} onCheck={(i, v: SetDone|null) => void} />`
  - `<ExerciseCard … open={boolean} onToggle={() => void} />`
  - `<RestCard endAt={number} onSkip onAdd15 onFinish />`

**Comportamento** (mockup, tela 1):
- **Topo:** rótulo `{formatDayLabel(today)} · TREINO {label}`, título do treino e engrenagem (já existe no App).
- **Cartão de resumo:**
  - anel (conic-gradient) com `done/total` e "séries";
  - "Volume de hoje" mostrando `{formatKg(volumeKg)} kg`;
  - linha `"{minutes} min · {N} exercícios"`, ou só `"{N} exercícios"` quando `minutes` é `null`. Sem sessão, mostra 0/total.
- **Lista:**
  - cada exercício é um card com `IconDot` (`muscleColor(ex.muscles)`) que funciona como botão `aria-label="Ver {nome}"` e abre o preview;
  - nome (quebra linha) e linha secundária (grupo · descanso, ou "séries × reps · kg kg" quando fechado);
  - à direita, `"{feitas}/{total}"`. Completo fica em `accent`, com o ícone `Check`.
- **Acordeão:** um card aberto por vez, que é o `firstIncomplete` (ou o que a pessoa tocou). O aberto tem `border-accent-line` e mostra a `SetTable`. Ao completar a última série do aberto, abre o próximo incompleto.
- **SetTable:**
  - **Colunas:** Série | Anterior | kg | Reps | ✓.
  - **"Anterior":** `"{kg}×{reps}"` ou `"—"`.
  - **kg e reps:** são caixas `<input>` inline:
    - kg com `inputmode="decimal"` e `aria-label="Carga da série {n} de {nome}"`;
    - reps em texto, com `aria-label="Reps da série {n} de {nome}"`.
  - **O que as caixas mostram:**
    - série feita: os valores gravados;
    - série não feita: o que foi digitado, guardado em estado local da tela e não gravado;
    - senão: os valores do plano.
  - **Check:** é um botão `aria-label="Série {n} de {nome}"` com `aria-pressed`.
    - Marcar chama `unlockAudio()` no handler e grava `setDone(prevSession, exIdx, n-1, { reps, weightKg })` com os valores das caixas, mais `setRestEnd(now + restSec*1000)`, numa gravação só, pela função que parte do último valor salvo.
    - Desmarcar grava `null` e não mexe no cronômetro.
  - **Editar uma série já feita:** o valor novo (no `blur`/Enter) é gravado com a função que parte do último valor salvo, a partir da série guardada. Carga inválida (`parseDecimal` dá `null`) mantém a anterior.
  - Linha feita fica com `bg-accent-bg`, caixas sem fundo em `accent` e check verde.
- **RestCard:** cartão flutuante acima do botão de concluir, com `Timer`, `mm:ss` em `accent`, barra de progresso (quanto falta do `restSec`), "+15 s" e "Pular". A lógica atual continua igual (250ms, bipe uma vez, sem bipe ao montar zerado).
- **"Concluir treino":** botão fixo embaixo, acima da barra de abas. Fica desabilitado sem sessão. Depois de concluir, vira "Treino concluído" com `Check` desabilitado, mais `toast('Treino concluído')`. A área rolável tem espaço embaixo pra nada ficar coberto.
- **Preview:** `Drawer` (`role="dialog"`) com título, músculos, mídia que alterna `images[0]`/`[1]` a cada 1s com dots, `<ol>` sem passos vazios e `note`.
- **Dia de descanso:** `EmptyState` com o ícone `Moon`, título "Dia de descanso" e texto, mais a lista dos treinos (letra num quadrado com `accent-bg`, nome e "N exercícios").
- **Sem plano:** `EmptyState` com o botão "Montar treino".
- Continuam iguais: o dia fixo e a troca de dia no `visibilitychange`, a sessão criada no primeiro check (agora com `startedAt`) e a espera pelo carregamento antes de copiar o que está salvo pra tela.

- [ ] **Step 1: Atualizar os testes que falham** em `TreinoTab.test.tsx`. Manter os 8 cenários atuais, adaptando os seletores:
  - "editar carga duas vezes" vira "editar carga inline e marcar";
  - cada cenário continua provando o mesmo comportamento.

  Acrescentar:

```tsx
test('carga com vírgula na tabela grava decimal', async () => {
  const user = userEvent.setup()
  render(<TreinoTab />)
  const kg = await screen.findByRole('textbox', { name: 'Carga da série 1 de Supino reto' })
  await user.clear(kg); await user.type(kg, '22,5')
  await user.click(screen.getByRole('button', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '10', weightKg: 22.5 }))
})
test('dois checks rápidos em séries diferentes persistem os dois', async () => {
  const user = userEvent.setup()
  render(<TreinoTab />)
  const s1 = await screen.findByRole('button', { name: 'Série 1 de Supino reto' })
  const s2 = screen.getByRole('button', { name: 'Série 2 de Supino reto' })
  await act(async () => { s1.click(); s2.click() })
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets.filter(Boolean)).toHaveLength(2))
})
test('exercício com 6 séries e nome longo mostra 6 linhas', async () => {
  await save('workoutPlan', { workouts: [{ ...plano.workouts[0], exercises: [pe({ name: 'Supino inclinado com halteres e pegada neutra no banco a 45 graus', sets: 6 })] }] })
  render(<TreinoTab />)
  for (let n = 1; n <= 6; n++) expect(await screen.findByRole('button', { name: `Série ${n} de Supino inclinado com halteres e pegada neutra no banco a 45 graus` })).toBeInTheDocument()
})
test('resumo: 1/2 séries e volume; sessão antiga sem startedAt não mostra minutos', async () => {
  await save('workoutLog', { '2026-11-16': { date: '2026-11-16', workoutId: 'a', workoutLabel: 'A', workoutName: 'Peito e tríceps', exercises: [{ ...plano.workouts[0].exercises[0], sets: [{ reps: '10', weightKg: 40 }, null] }] } })
  render(<TreinoTab />)
  expect(await screen.findByText('400 kg')).toBeInTheDocument()
  expect(screen.queryByText(/min/)).not.toBeInTheDocument()
})
```

- [ ] **Step 2:** Rodar `bun run test src/workout/TreinoTab.test.tsx`. Esperado: FAIL.
- [ ] **Step 3:** Implementar os componentes e reescrever a `TreinoTab`. Apagar os arquivos listados em Delete.
- [ ] **Step 4:** Rodar `bun run test`, `bun run build` e `bun run lint`. Esperado: tudo verde.
- [ ] **Step 5:** Commit `feat(ui): new workout tab with set table, summary and rest card`.

---

### Task 4: Montagem (perfil e plano) e convite de instalação

**Files:**
- Modify: `src/onboarding/Onboarding.tsx`, `src/shell/InstallGate.tsx`, `src/shell/ImportBackupButton.tsx` (`AlertDialog` no lugar do `confirm`), `src/onboarding/Onboarding.test.tsx`, `src/App.test.tsx`
- Test: os mesmos

**Interfaces:**
- Consumes: `parseDecimal` (Task 1), `ToggleGroup`, `Input`, `Button`, `AlertDialog`, `EmptyState`, e o que já existe (`TEMPLATES`, `instantiateTemplate`, `fetchCatalog`, `PlanEditor`, `PlanImport`, `importBackupFile`, `exportBackup`).
- Produces: `<ImportBackupButton variant?: 'ghost' | 'row' />` abre o `AlertDialog` com o título "Restaurar backup?", o texto "Isso substitui todos os seus dados. Continuar?" e os botões "Cancelar" e "Restaurar" (destructive). Só depois do "Restaurar" vem o `importBackupFile` e o `location.reload()`.

**Comportamento** (mockup, telas 4 e 5):
- **Perfil:**
  - barra de passos de 2 segmentos, rótulo "PASSO 1 DE 2" e título `<h1>Sobre você</h1>`;
  - `ToggleGroup` Masculino/Feminino;
  - campos Altura e Peso com a unidade (cm, kg) do lado, em `inputmode="decimal"`, gravando com `parseDecimal`;
  - nota de privacidade;
  - embaixo: "Continuar" (principal, desabilitado enquanto altura ou peso forem inválidos), e na mesma linha "Restaurar backup" e "Pular", os dois ghost.
- **Plano:**
  - barra de passos 2/2 e título `<h1>Seu treino</h1>`;
  - card com os 5 planos, cada linha com nome, descrição e 7 bolinhas (dias marcados em `accent`), e o selecionado em `accent-bg`;
  - abaixo, dois atalhos lado a lado: "Do zero" (`Plus`) e "Importar de IA" (`Sparkles` em `accent`);
  - botão fixo "Usar {nome}", que busca o catálogo e abre o `PlanEditor` com o modelo;
  - offline, a mensagem atual aparece num aviso acima do botão;
  - "Pular" no topo à direita. Pular ou terminar finaliza a montagem, como hoje.
- **InstallGate:** `EmptyState` com o ícone `Share`, as instruções "Compartilhar → Adicionar à Tela de Início", o aviso de dados, "Continuar no navegador mesmo assim" (ghost) e "Exportar backup" quando houver dados.

- [ ] **Step 1: Atualizar ou acrescentar os testes que falham:**
  - `App.test.tsx` passa a esperar `heading 'Sobre você'` no lugar de 'Perfil'. O resto do fluxo continua igual.
  - `Onboarding.test.tsx`: restaurar backup clica em "Restaurar backup", escolhe o arquivo, confirma no diálogo com "Restaurar" e espera `importBackupFile` + reload. Não usa mais `vi.stubGlobal('confirm')`.
  - Novos:

```tsx
test('peso com vírgula é salvo como decimal', async () => {
  const user = userEvent.setup()
  render(<Onboarding {...propsAtuais} />) // usar as props que o Onboarding já recebe hoje
  await user.type(await screen.findByLabelText('Altura'), '178')
  await user.type(screen.getByLabelText('Peso'), '80,5')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await waitFor(async () => expect(await load('profile')).toMatchObject({ heightCm: 178, weightKg: 80.5 }))
})
test('sem internet ao usar um plano pronto mostra o aviso', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
  // ir ao passo 2 (Pular no perfil), escolher "ABC", clicar "Usar ABC"
  // expect(await screen.findByText(/Sem internet pra carregar o modelo/)).toBeInTheDocument()
})
```

  Escrever o segundo teste por extenso. Cancelar no diálogo de restauração não chama `importBackupFile` (é um teste novo em `Onboarding.test.tsx`).
- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `bun run test`, `bun run build` e `bun run lint`. Esperado: verde.
- [ ] **Step 5:** Commit `feat(ui): onboarding steps, plan picker and install gate redesign`.

---

### Task 5: Editor do plano, gaveta de ajuste e seletor de exercícios

**Files:**
- Create: `src/workout/ExerciseDrawer.tsx`
- Modify: `src/workout/PlanEditor.tsx`, `src/catalog/CatalogPicker.tsx`, `src/workout/PlanEditor.test.tsx`
- Test: `src/workout/PlanEditor.test.tsx`, `src/catalog/CatalogPicker.test.tsx` (novo)

**Interfaces:**
- Consumes: `Drawer`, `Button`, `Input`, `IconDot`, `muscleColor`, `parseDecimal`, `formatKg` (Task 1), e o que já existe (`usePersisted`, `toPlanExercise`, `searchCatalog`, `fetchCatalog`, `imageUrl`). As props atuais do `PlanEditor` (`initial?`, `onDone`, `onCancel?`) e do `CatalogPicker` (`onPick`, `onClose`) não mudam.
- Produces: `<ExerciseDrawer open ex={PlanExercise} onChange={(next: PlanExercise) => void} onRemove onMoveUp? onMoveDown? onClose />`

**Comportamento** (mockup, telas 6, 7 e 8):
- **Editor:**
  - topo com voltar (Cancelar), título "Editar plano" e "Salvar" (principal pequeno);
  - cada treino é um card com a letra em `accent-bg` e o nome. O menu ⋯ (Drawer pequeno) tem "Renomear" e "Remover treino";
  - dias numa grade de 7 colunas iguais (sem rolagem), com `aria-label` por extenso e `aria-pressed`;
  - exercícios em linhas com `IconDot`, nome e resumo `"{séries} × {reps} · {formatKg(kg)} kg · {rest} s"`. Tocar numa linha abre a `ExerciseDrawer`;
  - "Adicionar exercício" (texto `accent` com `Plus`) e "Novo treino" (botão tracejado).
  - Continua: esperar o carregamento quando não vem `initial`.
- **ExerciseDrawer:**
  - título e grupo;
  - linhas: Séries (−/+ de 1 a 10), Repetições (input de texto), Carga (−/+ de 2,5 em 0–500, mais input decimal com vírgula pelo `parseDecimal`) e Descanso (−/+ de 15 em 15–600);
  - menu ⋯ com "Subir" e "Descer";
  - botões "Remover" (vermelho) e "Pronto".
- **CatalogPicker:**
  - tela cheia com voltar e título "Exercícios";
  - busca com o placeholder `"Buscar entre {N}…"`;
  - duas fileiras de chips (músculo, aparelho) que rolam de lado sem barra, com o chip ativo em `accent`;
  - seções "Seus exercícios" e "Catálogo", com miniatura (foto ou `IconDot`) e botão "+" `aria-label="Adicionar {nome}"`;
  - "Criar exercício próprio" fixo embaixo, abrindo uma Drawer com o formulário atual;
  - offline: a mensagem atual "Sem internet: só seus exercícios aparecem".

- [ ] **Step 1: Escrever ou adaptar os testes que falham:**
  - Manter o teste atual do `PlanEditor`: sem `initial`, abre o plano salvo e "Salvar" não o apaga.
  - Novos:

```tsx
test('tocar no exercício abre a gaveta; +2,5 kg e Pronto atualiza o resumo', async () => {
  const user = userEvent.setup()
  render(<PlanEditor initial={{ workouts: [workoutOf([{ name: 'Supino reto', sets: 3, reps: '10-12', weightKg: 40, restSec: 90 }])] }} onDone={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: /Supino reto/ }))
  await user.click(screen.getByRole('button', { name: 'Aumentar carga' }))
  await user.click(screen.getByRole('button', { name: 'Pronto' }))
  expect(screen.getByText('3 × 10-12 · 42,5 kg · 90 s')).toBeInTheDocument()
})
test('carga digitada com vírgula na gaveta', async () => { /* abre a gaveta, limpa o campo de carga, digita "22,5", Pronto → "… · 22,5 kg · …" */ })
```

  Em `CatalogPicker.test.tsx`: com `fetch` rejeitado, mostra "Sem internet: só seus exercícios aparecem" e lista o exercício próprio salvo em `customExercises`. Escrever os dois por extenso.
- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `bun run test`, `bun run build` e `bun run lint`. Esperado: verde.
- [ ] **Step 5:** Commit `feat(ui): plan editor rows, exercise drawer and catalog picker redesign`.

---

### Task 6: Importar de IA, configurações, telas de erro, "em breve" e remoção do CSS antigo

**Files:**
- Modify: `src/workout/PlanImport.tsx`, `src/shell/SettingsScreen.tsx`, `src/shell/ErrorBoundary.tsx`, `src/shell/ComingSoon.tsx`, `src/App.tsx` (faixas de backup e erro, tela de dados ilegíveis), `src/main.tsx` (remove o import do `theme.css`)
- Delete: `src/theme.css`
- Test: `src/workout/PlanImport.test.tsx` (novo), mais os testes existentes do App e do ErrorBoundary

**Interfaces:**
- Consumes: Task 1 (UI) e o que já existe (`parsePlanFormat`, `planFromFormat`, `exportPlanFormat`, `LLM_PROMPT`, `exportBackup`, `backupDue`, `ImportBackupButton`).

**Comportamento** (mockup, telas 9, 10 e 11):
- **Importar de IA:**
  - topo com voltar e título;
  - card com os passos numerados: "1 Copie o prompt" com o botão "Copiar", e "2 Cole a resposta aqui";
  - textarea e "Escolher arquivo";
  - **revisão automática:** 400ms depois de parar de digitar ou colar, ou ao escolher o arquivo, mostra os problemas (lista, em `negative`) ou o resumo (`Check` em `accent`, `"{T} treinos · {E} exercícios"` e `"{U} viraram exercícios seus"`). O aviso de dieta continua;
  - "Importar plano" fixo, habilitado só com a revisão válida;
  - o link "copiar meu plano" faz a exportação;
  - a mensagem de offline continua.
- **Configurações:**
  - topo com voltar e "Configurações";
  - seção "Treino": Editar plano (`List`, c1), Importar/exportar via IA (`Sparkles`, c4) e Perfil (`User`, c2, com o resumo "{peso} kg · {altura} cm" quando existe);
  - seção "Seus dados": Exportar backup (`Download`, c6, com "Último: há N dias" ou "Nunca"), que mostra `toast` em erro, e Restaurar backup (`ImportBackupButton variant="row"`);
  - nota de dados só no aparelho;
  - "Refazer montagem" em `negative`, que confirma num `AlertDialog`;
  - "Editar perfil" com botão de voltar.
- **Faixas no App:** atraso de backup num cartão fino `accent-bg/accent-line` com "Exportar"; erro de gravação num cartão `negative` com botão de fechar.
- **Telas de erro:** "Não consegui ler seus dados" e o ErrorBoundary usam `EmptyState tone="negative"`, mantendo os textos e botões atuais.
- **ComingSoon:** `EmptyState` com o ícone da aba (Dieta `Utensils`, Evolução `TrendingUp`), título `"{Aba} chega em breve"` e o texto da spec. O `h1` continua contendo o nome da aba.

- [ ] **Step 1: Escrever ou adaptar os testes que falham:**
  - `App.test.tsx`: o último trecho espera `heading` contendo "Dieta" e o texto "chega em breve".
  - Novos em `PlanImport.test.tsx`:

```tsx
test('colar JSON válido mostra o resumo sozinho, sem botão Revisar', async () => {
  const user = userEvent.setup()
  render(<PlanImport onDone={vi.fn()} />)
  await user.click(await screen.findByRole('textbox'))
  await user.paste(JSON.stringify({ formato: 'pump-plano', versao: 1, treinos: [{ letra: 'A', nome: 'Peito', dias: ['seg'], exercicios: [{ nome: 'Remada X', series: 3, reps: '10' }] }] }))
  expect(await screen.findByText('1 treinos · 1 exercícios')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Revisar' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Importar plano' })).toBeEnabled()
})
test('colar texto inválido mostra problemas e mantém Importar desabilitado', async () => { /* paste "oi" → 'Não encontrei um plano em JSON no texto'; Importar disabled */ })
```

  O catálogo é mockado com `fetch` resolvendo `[]`.
- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar. Apagar o `theme.css` e o import. Rodar `grep -rn "className=\"[a-z-]* " src` e conferir que não sobrou classe do CSS antigo (`card`, `btn`, `field`, `chips`, `stack`, `muted-note` etc.).
- [ ] **Step 4:** Rodar `bun run test`, `bun run build` e `bun run lint`. Esperado: verde. Anotar o tamanho do bundle (`dist/assets/*.js`, gzip) antes (Task 1) e agora, no relatório.
- [ ] **Step 5:** Commit `feat(ui): import, settings, error and coming-soon screens; drop legacy css`.

---

### Task 7: Conferência visual contra o mockup

**Files:**
- Modify: só ajustes de estilo onde a conferência apontar.
- Create: nenhum arquivo versionado. Os prints ficam em `.superpowers/` (gitignored).

- [ ] **Step 1:** Rodar `bun run build && bunx vite preview` e abrir `http://localhost:4173/pump/` no Playwright MCP, em 390×844.
- [ ] **Step 2:** Fotografar as telas e comparar cada uma com o mockup, na ordem:
  1. Perfil
  2. Plano
  3. Editor com a gaveta aberta
  4. Seletor
  5. Treino com uma série marcada e o descanso correndo
  6. Preview
  7. Dia de descanso (`browser_evaluate` mudando a data, ou um plano sem o dia de hoje)
  8. Importar de IA
  9. Configurações
  10. Dieta
  11. Evolução

  Corrigir diferenças de espaçamento, cor, tipografia e hierarquia.
- [ ] **Step 3:** Rodar `browser_evaluate` em cada tela e conferir que nenhum elemento tem rolagem visível: `getComputedStyle(document.documentElement).scrollbarWidth === 'none'`, e nenhum `scrollWidth > clientWidth` no `main` (sem rolagem lateral). Conferir também o exercício de nome longo com 6 séries.
- [ ] **Step 4:** Rodar `bun run test`, `bun run build` e `bun run lint`. Esperado: verde. Fechar o browser (`browser_close`) e apagar `.playwright-mcp/`.
- [ ] **Step 5:** Commit `style(ui): visual pass against approved mockup`, se houve ajuste.
- [ ] **Step 6:** **PARAR:** não dar push. O controller pergunta ao Yago se pode publicar, porque push na `main` publica sozinho no Pages.
