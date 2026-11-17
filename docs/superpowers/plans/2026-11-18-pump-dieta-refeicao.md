# Pump — Aba Dieta: lista enxuta + refeição com opções — Plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar a aba Dieta leve: lista só com as refeições e uma tela por refeição com o toggle A · B · C pra escolher a opção.

**Architecture:** Uma função pura nova (`chooseOption`) e o campo `optionId` na cópia do dia; um componente novo `MealScreen` (tela cheia) substitui o `MealCard` expansível; a `DietTab` vira lista enxuta com resumo em uma linha, pílula de água (gaveta com o `WaterCard` atual) e menu ⋯ com cardápio de hoje, dia livre e editar.

**Tech Stack:** React 19, TS, Tailwind v4, shadcn/ui (Drawer/vaul, AlertDialog, ToggleGroup), vitest + Testing Library, bun.

**Spec:** `docs/superpowers/specs/2026-11-18-pump-dieta-design.md` §14 (mockup `docs/design/dieta-refeicao.html`, versão B com toggle de letra).

## Global Constraints

- Visual do app (tokens em `src/index.css`, shadcn em `src/components/ui`), pt-BR, só tema escuro, ícones lucide, sem emojis.
- Alvos ≥ 44 px; inputs com 16 px; sem barras de rolagem visíveis.
- Toda gravação por `usePersisted` com updater; nunca copiar dado salvo antes de `loaded`.
- Cada ação lê `todayKey()` na hora e passa por `ensureDay` (padrão `act` da `DietTab`).
- Rótulo "estimativa da IA"/"sem valores" (`iaLabel`) continua em todo item `ia`.
- Commits em inglês, Conventional Commits, sem Co-Authored-By e sem rodapé. Sem push.

## Review Focus

1. **Refeição trocada por outro cardápio e depois "Voltar às opções":** volta pra 1ª opção com o toggle de volta (teste na Task 1 e Task 2).
2. **Cardápio do dia apagado:** a refeição abre só com os itens da cópia, sem toggle e sem quebrar (teste na Task 2).
3. **Tocar no check da lista com uma opção B escolhida:** marca com a B, não volta pra A (teste na Task 3).
4. **Escolher opção numa refeição livre ou em dia livre:** o toggle fica desabilitado (teste na Task 2).
5. **Pílula de água com a água desligada:** some e aparece o link "Ligar contador de água" embaixo da lista (teste na Task 3).

---

### Task 1: `optionId` e `chooseOption`

**Files:**
- Modify: `src/types.ts` (`DayMeal`), `src/diet/day.ts`
- Test: `src/diet/day.test.ts`

**Interfaces:**
- `DayMeal` ganha `optionId?: string` — opção escolhida explicitamente. **Ausente = 1ª opção** (desvio consciente do texto do §14.3, que diz que a cópia já nasce com o id: deixar ausente evita que toda cópia conte como "mexida"). A UI usa `meal.optionId ?? menuMeal.options[0].id`.
- `touched(d)` passa a contar também `m.optionId` presente.
- `chooseOption(d: DietDay, mealId: string, option: MealOption): DietDay` — itens = `structuredClone(option.items)` + extras da refeição; grava `optionId = option.id`; limpa `swappedMeal`; descarta trocas/pulos; mantém `done`/`free`. Se `optionId === option.id` e não há `swappedMeal`, devolve o mesmo objeto.
- `swapMeal` passa a limpar `optionId`.
- `currentMealId(meals: DayMeal[], now: Date): string | undefined` — entre as refeições ordenadas por horário: a primeira não feita (e não livre) cujo `time ≤ HH:MM` de `now`; senão a próxima não feita depois de `now`; senão `undefined`.

- [ ] **Step 1: Testes que falham**

```ts
test('chooseOption troca os itens, guarda o optionId, mantém extras e limpa trocas', () => {
  // cópia de um cardápio com refeição de 2 opções; addExtra; swapItem num item; chooseOption(opção B)
  // → itens = itens da B + o extra; optionId = B.id; nenhum item com swappedFrom; swappedMeal undefined; touched = true
})
test('chooseOption com a mesma opção não muda nada', () => {})
test('swapMeal limpa optionId e chooseOption depois volta às opções', () => {})
test('dayFromMenu não grava optionId e não conta como mexido', () => {
  expect(touched(dayFromMenu(menu))).toBe(false)
})
test('currentMealId: primeira não feita já no horário; senão a próxima; senão nenhuma', () => {
  // refeições 07:00 (feita), 10:00, 12:30; now 11:00 → id das 10:00; com 10:00 feita → 12:30; tudo feito → undefined
})
```

- [ ] **Step 2:** `bun run test src/diet/day.test.ts` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `bun run test`, `bun run build`, `bun run lint` (só os 2 avisos antigos).
- [ ] **Step 5: Commit** `feat(diet): choose meal option in the day copy`.

---

### Task 2: `MealScreen` (refeição em tela cheia)

**Files:**
- Create: `src/diet/MealScreen.tsx`
- Test: `src/diet/MealScreen.test.tsx`

**Interfaces:**
- Consumes: `chooseOption`, `swapMeal`, `toggleMeal`, `setMealFree`, `swapItem`, `skipItem`, `addExtra`, `removeItem`, `undoSwap`, `itemKcal`, `itemMacros`, `iaLabel` (`src/diet/day.ts`); `FoodPicker`; `Overlay`; `ToggleGroup`/`ToggleGroupItem`; tipo `Act` de `MealCard.tsx` (mover pra `day.ts` ou `types` se o `MealCard` for apagado na Task 3).
- Produces: `<MealScreen meal: DayMeal; menu?: Menu; plan: DietPlan; dayFree: boolean; act: Act; onClose: () => void />`.
  - Topo: voltar (`aria-label="Voltar"`), título "{nome} · {horário}", botão ⋯ (`aria-label="Mais opções da refeição"`) com **Trocar por refeição de outro cardápio** (gaveta com as refeições dos outros cardápios agrupadas por cardápio, 1ª opção de cada → `swapMeal`) e **Refeição livre**/**Desfazer refeição livre**.
  - Toggle segmentado `ToggleGroup type="single"` com `aria-label="Opção"`, um item por opção com o texto da letra ("A", "B"…) — só quando `menu` tem a refeição com mais de 1 opção e não há `swappedMeal`. Visual do mockup: trilho `bg-panel border`, item ativo `bg-[#2a2c33] text-strong`, altura ≥ 44 px. Desabilitado em refeição livre ou dia livre. Mudar → `act(d => chooseOption(d, meal.id, option))`.
  - Linha "Opção {letra} · {nome}" (só "Opção {letra}" sem nome). Com `swappedMeal`: "De outro cardápio: {swappedMeal}" e botão **Voltar às opções** (→ `chooseOption` com a 1ª opção).
  - Itens como no `MealCard` atual (troca/pulo via `FoodPicker` com `extraAction` "Pular hoje", trocados em `text-accent` com ícone, pulados riscados + Desfazer, extras + Remover, `iaLabel`), "+ Adicionar extra"; ações de item escondidas em refeição/dia livre.
  - Linha de total: "{kcal} kcal · P {p} · C {c} · G {f}" dos itens contados (não pulados).
  - Barra fixa embaixo: não feita → **Refeição livre** + **Comi esta** (`toggleMeal` e `onClose`); feita → **Desmarcar** + **Voltar**.
  - Sem `menu` (cardápio apagado): sem toggle, só os itens da cópia.

- [ ] **Step 1: Testes que falham**

```tsx
test('toggle troca a opção e os itens', async () => { /* refeição com A e B; clicar "B" → itens da B na tela; dietLog[hoje] meal.optionId = B */ })
test('Comi esta marca e fecha', async () => {})
test('feita mostra Desmarcar', async () => {})
test('sem o cardápio do dia não mostra toggle', async () => {})
test('refeição livre desabilita o toggle e esconde ações de item', async () => {})
test('trocar por outro cardápio mostra "Voltar às opções" e volta pra A', async () => {})
test('item da IA mostra "estimativa da IA"', async () => {})
```

- [ ] **Step 2:** `bun run test src/diet/MealScreen.test.tsx` → FAIL.
- [ ] **Step 3:** Implementar (reaproveitar a renderização de item do `MealCard`).
- [ ] **Step 4:** `bun run test`, `bun run build`, `bun run lint`.
- [ ] **Step 5: Commit** `feat(diet): meal screen with option toggle`.

---

### Task 3: Aba Dieta enxuta

**Files:**
- Modify: `src/diet/DietTab.tsx`, `src/diet/WaterCard.tsx` (se precisar), `src/diet/DietTab.test.tsx`, `src/App.test.tsx` (se tocar)
- Delete: `src/diet/MealCard.tsx` (substituído pelo `MealScreen`)

**Interfaces:**
- Consumes: `MealScreen` (Task 2), `currentMealId` (Task 1), `daySummary`, `cupsShown`, `WaterCard`, `turnWaterOn`.
- Produces: `<DietTab />` conforme §14.1:
  - Topo: rótulo `"{formatDayLabel(hoje)} · {menuName}"`, título "Dieta" e botão ⋯ (`aria-label="Mais opções da dieta"`) com **Cardápio de hoje** (só com 2+ cardápios: gaveta/lista com os cardápios; mesma troca e confirmação de hoje), **Dia livre**/**Desfazer dia livre** e **Editar cardápio**.
  - Resumo numa linha: anel (SVG ou `conic-gradient`, `aria-label="{n}% da meta"`), "{feito} / {meta} kcal", "P {p}/{meta} · C … · G …"; sem meta, só "{feito} kcal" sem anel.
  - Pílula de água "{x}/{meta} L" (`aria-label="Água: {x} de {meta} litros"`) abre uma gaveta com o `WaterCard`; com a água desligada, sem pílula e com o link "Ligar contador de água" embaixo da lista.
  - Lista de refeições: horário, nome, subtítulo ("{kcal} kcal" feita; "{n} opções" quando >1; "livre"), letra da opção quando feita e com >1 opção, check (`aria-label` "Marcar {nome}"/"Desmarcar {nome}"). A de `currentMealId(day.meals, agora)` destacada (`bg-accent-bg`, `aria-current="true"`). Check → `toggleMeal` com a opção que já está nela. Linha → abre `MealScreen`.
  - Dia livre: lista esmaecida, checks desabilitados, rótulo "Dia livre" no resumo.

- [ ] **Step 1: Ajustar/escrever testes**

```tsx
test('lista mostra horário, nome e opções; tocar abre a refeição', async () => {})
test('check da lista marca com a opção escolhida (B)', async () => { /* escolher B via chooseOption no dietLog salvo; tocar check → done com optionId B */ })
test('refeição do horário atual destacada', async () => { /* vi.setSystemTime 11:00 → aria-current na das 10:00 */ })
test('pílula de água abre os copos; água desligada mostra o link', async () => {})
test('menu ⋯: dia livre e trocar cardápio com confirmação', async () => {})
// manter: virada da meia-noite (com e sem visibilitychange), menu órfão (opção desabilitada), troca de cardápio grava lastMenuId
```

- [ ] **Step 2:** `bun run test src/diet/DietTab.test.tsx` → FAIL.
- [ ] **Step 3:** Implementar e apagar `MealCard.tsx` (mover o que a `MealScreen` reaproveitou).
- [ ] **Step 4:** `bun run test`, `bun run build`, `bun run lint`.
- [ ] **Step 5: Commit** `feat(diet): compact diet tab with meal list`.

---

### Task 4: Conferência visual

- [ ] **Step 1:** `bun run dev --port 5199 --strictPort` (guardar o PID), Playwright MCP em 390×844 e 320 px, com dados semeados (cardápio de 2 opções por refeição, uma refeição feita com B, água ligada).
- [ ] **Step 2:** Comparar lista e refeição aberta com `docs/design/dieta-refeicao.html` (versão B, toggle com letra). Corrigir só estilo/layout; listar comportamentos estranhos sem corrigir.
- [ ] **Step 3:** `bun run test`, build, lint. Fechar o browser, apagar `.playwright-mcp/`, matar o servidor pelo PID. Commit `style(diet): visual pass for meal list`, se houve ajuste. Prints em `/Users/yagoramires/Documents/.those-guys/out/pump-dieta-v2-*.png`.
- [ ] **Step 4:** **PARAR:** nada de push.
