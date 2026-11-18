# Treino em sequência · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A aba Treino segue a ficha em ordem (A → B → C → A), com iniciar, trocar, treinos anteriores e resolver treino que ficou sem concluir; sem dias da semana.

**Architecture:** A fila é uma função pura (`nextWorkout`) sobre ficha + log; o treino aberto antigo é outra (`unfinishedSession`). `Workout.weekdays` sai de todo lugar. A sequência das conquistas passa a usar uma meta semanal. A aba Treino ganha os estados "antes de iniciar", troca e cartão de pendência; "Treinos anteriores" é uma tela nova na aba.

**Tech Stack:** React 19, Vite, TS, Tailwind v4 + shadcn/ui, vitest + Testing Library + fake-indexeddb, bun.

**Spec:** `docs/superpowers/specs/2026-11-18-pump-treino-sequencia-design.md`

## Global Constraints

- Texto em pt-BR, ícones lucide de traço, nunca emoji; reaproveitar `BackHeader`, `BottomBar`, `Overlay`, `ConfirmDialog`, `SheetRow`/`Drawer`, `EmptyState`, `card`, `label-caps`, `WorkoutDayLine`.
- Commits sem `Co-Authored-By` e sem "Generated with Claude". Sem push.
- bun: `bun run test`, `bunx tsc -b`, `bun run lint`, `bun run build`. Testes de componente com `await renderLoaded(...)`; fuso `America/Sao_Paulo`; datas fixas com `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime`.
- graphify: com `graphify-out/graph.json`, rodar `graphify query "<pergunta>"` antes do primeiro grep/leitura; `graphify update .` depois de mudar código (não commitar `graphify-out`).
- Nenhum dado perdido: sessões antigas, fichas com `weekdays` e arquivos de importação com `dias` continuam funcionando.
- Semana Dom–Sáb (`weekStart`).

## Review Focus

1. Ficha editada depois de treinar (treino da última sessão removido ou renomeado) → próximo treino cai no primeiro, sem quebrar.
2. Treino de ontem com séries marcadas e não concluído → cartão aparece, e o próximo treino continua sendo o dele até concluir/descartar.
3. Trocar de treino depois de marcar séries → pede confirmação e não mistura séries de dois treinos.
4. Treino que passa da meia-noite continua no mesmo dia (comportamento atual de `TreinoTab` com `today` preso) e não vira "sem concluir".
5. Semana atual com poucas sessões não zera a sequência; só semanas fechadas.

---

### Task 1: Fila de treinos e sem dias da semana

**Files:**
- Modify: `src/workout/schedule.ts`, `src/workout/types.ts`, `src/workout/templates.ts`, `src/workout/PlanEditor.tsx`, `src/workout/planFormat.ts`, `src/workout/prompt.ts`, `src/onboarding/Onboarding.tsx` (pontos dos modelos), `src/workout/TreinoTab.tsx` (só trocar `workoutForDate` por `nextWorkout` e o "Dia de descanso" do plano, que deixa de existir), testes e fixtures que usam `weekdays`
- Test: `src/workout/schedule.test.ts`, `src/workout/planFormat.test.ts`, `src/workout/prompt.test.ts`

**Interfaces:**
- Produces:
  - `nextWorkout(plan: WorkoutPlan, log: WorkoutLog): Workout | undefined` — o seguinte ao da última sessão concluída (ordem por `date`, desempate por `completedAt`), com volta; sem concluída ou treino inexistente → `plan.workouts[0]`; ficha vazia → `undefined`.
  - `unfinishedSession(log: WorkoutLog, today: string): WorkoutSession | undefined` — a sessão mais recente com `date < today`, sem `completedAt`, não descanso, com pelo menos uma série marcada.
  - `Workout = { id; label; name; exercises }` (sem `weekdays`). `workoutForDate` é apagado.
- Formato Pump: `dias` aceito e ignorado na importação; não sai na exportação. Prompt do treino: tirar "distribua os treinos nos dias que tenho", tirar o campo `"dias"` do formato e do exemplo, acrescentar "Os treinos rodam em sequência, na ordem da lista (A, B, C…), um por dia de treino."
- Montagem: no lugar dos pontos dos dias, `plural(t.workouts.length, 'treino', 'treinos')`.

- [ ] **Step 1: Testes**

```ts
test('sem sessão concluída, o primeiro', () => expect(nextWorkout(plan(['A','B','C']), {})?.label).toBe('A'))
test('segue a ordem e volta ao primeiro', () => {
  expect(nextWorkout(p, log({ '2026-11-16': done('A') }))?.label).toBe('B')
  expect(nextWorkout(p, log({ '2026-11-16': done('C') }))?.label).toBe('A')
})
test('faltar dias não pula treino', () => expect(nextWorkout(p, log({ '2026-11-10': done('A') }))?.label).toBe('B'))
test('sessão aberta não conta; descanso não conta', () => expect(nextWorkout(p, log({ '2026-11-16': done('A'), '2026-11-17': open('B'), '2026-11-18': rest() }))?.label).toBe('B'))
test('treino da última sessão saiu da ficha → primeiro', () => expect(nextWorkout(plan(['A','B']), log({ '2026-11-16': done('Z') }))?.label).toBe('A'))
test('unfinishedSession: só dia anterior, com série marcada, não concluída', () => { /* hoje aberta → undefined; ontem sem série → undefined; ontem com 1 série → ela; duas antigas → a mais recente */ })
test('importa arquivo com dias e exporta sem dias', () => { /* parse com "dias": ["seg"] ok; exportPlanFormat não contém "dias" */ })
test('prompt do treino não pede dias', () => { expect(buildPrompt(undefined)).not.toContain('"dias"'); expect(buildPrompt(undefined)).toContain('na ordem da lista') })
```

- [ ] **Step 2: Rodar e ver falhar**; **Step 3: Implementar** (o "Dia de descanso" da aba some: com ficha não vazia sempre há próximo treino); **Step 4:** `bunx tsc -b && bun run test` verde; **Step 5: Commit** `feat: treinos em sequência sem dias da semana`

---

### Task 2: Sequência pela meta semanal

**Files:**
- Modify: `src/evolution/achievements.ts`
- Test: `src/evolution/achievements.test.ts`, `src/evolution/golden.test.ts` + `test/evolutionFixture.ts` (snapshot)

**Interfaces:**
- Consumes: `Workout` sem `weekdays` (Task 1); `profile.daysPerWeek`.
- Regra: meta = `clamp(profile.daysPerWeek ?? plan.workouts.length, 1, 7)`. Percorrendo os dias desde a primeira sessão concluída: dia treinado soma 1 na sequência; ao terminar uma semana (sábado) **anterior à semana de hoje** com menos sessões concluídas que a meta, a sequência zera. Descanso não soma nem zera. `neutralRest` deixa de ser usado aqui (se ficar sem uso no projeto, apagar).

- [ ] **Step 1: Testes** — semana fechada abaixo da meta zera; semana fechada na meta mantém; semana atual com 0 não zera; sem `daysPerWeek` usa o número de treinos; descanso no meio não altera.
- [ ] **Step 2–4:** ver falhar, implementar, `bun run test -u src/evolution/golden.test.ts` e conferir no diff do snapshot que só mudaram `streak-*`; suíte verde.
- [ ] **Step 5: Commit** `feat: sequência de treinos pela meta semanal`

---

### Task 3: Aba Treino — iniciar, trocar e treino sem concluir

**Files:**
- Modify: `src/workout/TreinoTab.tsx`, `src/workout/TreinoTab.test.tsx`
- Create (se o arquivo crescer): `src/workout/UnfinishedCard.tsx`, `src/workout/SwitchWorkout.tsx`

**Interfaces:**
- Consumes: `nextWorkout`, `unfinishedSession` (Task 1); `startSession`, `completeSession`.
- Comportamento (spec §4–§5):
  - Sem sessão hoje: mostra `chosen ?? nextWorkout(plan, log)`; barra de baixo com **"Iniciar treino"** (cria a sessão com `startedAt`). Marcar série sem iniciar também inicia. "Descansar hoje" só antes de iniciar.
  - Link **"Trocar treino"** abaixo do título → gaveta com os treinos da ficha (o próximo com etiqueta "próximo"); com séries marcadas hoje → `ConfirmDialog` "Trocar de treino?" / "As séries marcadas hoje serão descartadas." / "Trocar"; troca substitui a sessão de hoje por `startSession(novo)`; sem sessão, só muda o treino mostrado.
  - Cartão no topo quando `unfinishedSession(log, today)` existe: `Treino ${label} de ${formatDayLabel(date)} ficou sem concluir` com **"Concluir"** (completedAt = `${date}T23:59` local em ISO, remove `startedAt`) e **"Descartar"** (remove a sessão do log; toast "Treino descartado" com "Desfazer").
  - Barra: "Iniciar treino" → "Concluir treino" → "Treino concluído" (como hoje).

- [ ] **Step 1: Testes** — abre no próximo treino da fila; "Iniciar treino" grava sessão com `startedAt`; trocar antes de iniciar muda o treino; trocar depois de marcar pede confirmação e substitui; cartão de ontem: Concluir grava `completedAt` naquela data e a fila avança; Descartar remove e a fila fica no mesmo treino; treino que passou da meia-noite (sessão de hoje em andamento e relógio vira) não vira cartão.
- [ ] **Step 2–4:** ver falhar, implementar, suíte + tsc + lint verdes.
- [ ] **Step 5: Commit** `feat: iniciar, trocar e concluir treino esquecido`

---

### Task 4: Treinos anteriores

**Files:**
- Create: `src/workout/PastWorkouts.tsx`, `src/workout/PastWorkouts.test.tsx`
- Modify: `src/workout/TreinoTab.tsx` (link "Treinos anteriores" no topo, ícone `History`, abre em `Overlay`)

**Interfaces:**
- `PastWorkouts({ onClose }: { onClose: () => void })` — `BackHeader` "Treinos anteriores"; lista de `completedSessions(log)` invertida; cada linha: `formatDayLabel(date)`, `${label} · ${name}` e `WorkoutDayLine`; tocar expande os exercícios com as séries feitas (`kg × reps`), só leitura. Vazio: `EmptyState` "Nenhum treino concluído ainda".

- [ ] **Step 1: Testes** — lista em ordem decrescente; mostra rótulo/nome e séries ao expandir; vazio.
- [ ] **Step 2–4:** ver falhar, implementar, verde.
- [ ] **Step 5: Commit** `feat: treinos anteriores na aba Treino`

---

### Task 5: Conferência visual

- [ ] `bun run dev`, Playwright 390×844: aba Treino com ficha ABC (antes de iniciar, iniciar, trocar com/sem séries, cartão de ontem, treinos anteriores), editor sem grade de dias, montagem com "N treinos", Gerar com IA do treino. Corrigir divergências; fechar navegador; apagar só os arquivos `.playwright-mcp/` criados nesta execução (nunca a pasta inteira); não usar `pkill`.
- [ ] `graphify update .`; `bun run test && bunx tsc -b && bun run lint && bun run build` verdes. Commit se houver correção: `fix: ajustes da conferência visual do treino em sequência`
