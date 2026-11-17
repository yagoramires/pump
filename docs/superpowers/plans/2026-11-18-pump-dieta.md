# Pump — Fase 2: Dieta e água — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aba Dieta completa: cardápio fixo (gerado com IA, do zero ou importado), marcação diária com trocas/pulos/extras, água, alimentos da TACO, e dieta/água na Evolução (Histórico, cartão, conquistas, PDF).

**Architecture:** Dados novos no IndexedDB via `usePersisted` (`dietPlan`, `dietLog`, `waterLog`, `foods`). Cada dia guarda uma **cópia** do cardápio (como `startSession` faz com o treino) e todos os totais saem de uma função pura `daySummary`. A TACO é um JSON estático em `public/catalog/taco.json`, buscado sob demanda (fora do precache). O import de dieta tem leitor próprio (`parseDietFormat`) e casa nomes com a TACO por palavras inteiras, checando contra a kcal da IA.

**Tech Stack:** React 19, Vite 8, TypeScript, Tailwind v4 + shadcn/ui, idb-keyval, vitest + jsdom + fake-indexeddb + Testing Library, bun.

**Spec:** `docs/superpowers/specs/2026-11-18-pump-dieta-design.md` (mockup `docs/design/dieta.html`). Os números de seção abaixo (§x) são dessa spec.

## Global Constraints

- **Visual:** padrão do redesign (tokens em `src/index.css`, shadcn em `src/components/ui`), pt-BR, só tema escuro, ícones lucide, sem emojis.
- **Toque e campos:** alvos ≥ 44 px; todo `<input>` com 16 px ou mais (`text-base`), números com `inputMode="decimal"`, `parseDecimal` e exibição com vírgula.
- **Rolagem:** sem barras visíveis.
- **Dados:** toda gravação usa `usePersisted` com função que parte do último valor salvo. Nunca copiar dado salvo pra estado local antes de `loaded`.
- **Backup:** continua na versão 1; chaves novas em `USER_KEYS` com checagem de formato; backups antigos continuam válidos.
- **TACO:** `public/catalog/taco.json`, fora do precache (o `globIgnores: ['**/catalog/**']` existente já cobre). Fonte citada no rodapé da busca: "Valores: TACO 4ª ed. (NEPA/UNICAMP)".
- **"Estimativa da IA":** é o único rótulo de origem que aparece nos itens; não existe etiqueta "TACO".
- **Só hoje:** dieta e água se marcam só no dia de hoje.
- **Commits:** em inglês, Conventional Commits, assunto ≤ 72 caracteres, **sem Co-Authored-By e sem rodapé**.
- **Push:** nada de push; push na `main` publica.

## Review Focus

1. **Cardápio trocado ou editado com o dia já marcado:** as marcações de hoje continuam e dias passados não mudam (teste em Task 2).
2. **Arquivo só de dieta colado no import de treino:** mensagem "Este arquivo só tem dieta. Importe na aba Dieta." e nada é gravado (teste em Task 3).
3. **Import sem internet:** a TACO não carrega, todos os itens viram estimativa e aparece o aviso (teste em Task 5).
4. **Aba aberta passando da meia-noite:** a próxima ação vai pro dia novo (teste em Task 6).
5. **JSON da IA com números absurdos** (gramas 0 ou 5000, kcal por 100 g > 900): erro ou valor tratado como ausente, nunca entra calado (teste em Task 3).

---

### Task 1: Dados, backup e TACO

**Files:**
- Modify: `src/types.ts`, `src/storage/backup.ts`, `src/catalog/catalog.ts`, `src/catalog/search.ts`
- Create: `scripts/build-taco.ts`, `scripts/build-taco.test.ts`, `data/taco/food.csv`, `data/taco/nutrients.csv`, `data/taco/FONTE.md`, `public/catalog/taco.json`
- Test: `src/storage/backup.test.ts`, `src/catalog/search.test.ts`

**Interfaces:**
- Produces (em `src/types.ts`):
  ```ts
  export interface Per100 { kcal: number; p: number; c: number; f: number }
  export interface DietItem { id: string; name: string; grams: number; portion?: string; per100: Per100; source: 'taco' | 'custom' | 'ia'; tacoId?: number }
  export interface Meal { id: string; name: string; time: string; items: DietItem[] }
  export interface DietPlan { meals: Meal[]; goalKcal?: number; goalMacros?: { p: number; c: number; f: number } }
  export interface DayItem extends DietItem { skipped?: boolean; swappedFrom?: string; extra?: boolean }
  export interface DayMeal extends Omit<Meal, 'items'> { done: boolean; items: DayItem[] }
  export interface DietDay { meals: DayMeal[]; goalKcal?: number }
  export type DietLog = Record<string, DietDay>
  export interface WaterDay { ml: number; goalMl: number }
  export type WaterLog = Record<string, WaterDay>
  export type DietGoal = 'perder-rapido' | 'perder' | 'manter' | 'ganhar' | 'ganhar-rapido'
  export type Restriction = 'lactose' | 'gluten' | 'vegetariano' | 'vegano'
  export interface DietAnamnesis { goal: DietGoal; meals?: number; wake?: string; train?: string; sleep?: string; restrictions?: Restriction[]; avoid?: string; eatOut?: 'casa' | 'fora' | 'misto'; notes?: string }
  export interface WaterSettings { enabled: boolean; goalMl: number; cupMl: number }
  export interface TacoFood { id: number; name: string; kcal: number; p: number; c: number; f: number }
  ```
  - `Profile` ganha `dietAnamnesis?: DietAnamnesis`; `Settings` ganha `water?: WaterSettings`.
  - `UserData` ganha `dietPlan: DietPlan; dietLog: DietLog; waterLog: WaterLog; foods: DietItem[]`; `USER_KEYS` ganha `'dietPlan', 'dietLog', 'waterLog', 'foods'`.
  - `export const EMPTY_DIET: DietPlan = { meals: [] }`.
- Produces (catálogo): `fetchCatalog<T = Exercise>(file = 'exercises.json'): Promise<T[]>`; `fetchTaco(): Promise<TacoFood[]>` em `catalog.ts` (memoriza a promessa resolvida na sessão; em falha, esquece pra tentar de novo). `searchCatalog` passa a aceitar `muscles?: string[]`.
- Produces (script): `buildTaco(foodCsv: string, nutrientsCsv: string): TacoFood[]` em `scripts/build-taco.ts`.

- [ ] **Step 1: Baixar os dados.** `data/taco/food.csv` e `data/taco/nutrients.csv` de `raulfdm/taco-api` (`references/csv/`), e `data/taco/FONTE.md` com a origem, a licença MIT do repositório e "TACO 4ª ed. (NEPA/UNICAMP, 2011)".
- [ ] **Step 2: Testes que falham**

```ts
// scripts/build-taco.test.ts
test('buildTaco junta nome e nutrientes; vazio, NA e Tr viram 0', () => {
  const food = 'id,categoryId,name\n1,1,"Arroz, integral, cozido"\n2,1,"Sal"\n'
  const nut = 'foodId,moisture,kcal,kJ,protein,lipids,cholesterol,carbohydrates\n1,70.1,124,517,2.6,1.0,,25.8\n2,0,NA,0,Tr,,,\n'
  expect(buildTaco(food, nut)).toEqual([
    { id: 1, name: 'Arroz, integral, cozido', kcal: 124, p: 2.6, c: 25.8, f: 1 },
    { id: 2, name: 'Sal', kcal: 0, p: 0, c: 0, f: 0 },
  ])
})
test('taco.json gerado tem os 597 alimentos', () => {
  expect((JSON.parse(readFileSync('public/catalog/taco.json', 'utf8')) as TacoFood[]).length).toBe(597)
})
```
```ts
// src/storage/backup.test.ts (acrescentar)
test('backup com dieta: ida e volta', async () => { /* save dietPlan {meals:[1 refeição]}, dietLog {'2026-11-18': {meals: []}}, waterLog {'2026-11-18': {ml: 500, goalMl: 2500}}, foods [] → buildBackup → replaceAll({}) → importBackupFile → load() de cada chave igual ao salvo */ })
test('backup recusa dietPlan sem meals', () =>
  expect(() => parseBackup(JSON.stringify({ app: 'pump', version: 1, data: { dietPlan: {} } }))).toThrow('Backup corrompido'))
test('backup recusa waterLog com dia sem ml', () =>
  expect(() => parseBackup(JSON.stringify({ app: 'pump', version: 1, data: { waterLog: { '2026-11-18': {} } } }))).toThrow('Backup corrompido'))
```
```ts
// src/catalog/search.test.ts (acrescentar)
test('searchCatalog funciona com itens sem muscles', () =>
  expect(searchCatalog([{ name: 'Arroz, tipo 1, cozido' }, { name: 'Feijão, carioca, cozido' }], 'arroz').map((x) => x.name)).toEqual(['Arroz, tipo 1, cozido']))
```

- [ ] **Step 3:** `bun run test`. Esperado: FAIL.
- [ ] **Step 4: Implementar.**
  - `buildTaco`: parse de CSV com campos entre aspas (vírgula dentro do nome); `kcal`, `protein`→`p`, `carbohydrates`→`c`, `lipids`→`f`; números com 1 casa no máximo. `import.meta.main` lê `data/taco/*.csv` e grava `public/catalog/taco.json` (JSON compacto). Rodar `bun scripts/build-taco.ts` e commitar o JSON.
  - Checagens em `parseBackup`: `dietPlan` objeto com `meals` array; `dietLog` objeto cujos valores são objetos com `meals` array; `waterLog` objeto cujos valores têm `ml` e `goalMl` numéricos; `foods` array.
- [ ] **Step 5:** `bun run test`, `bun run build`, `bun run lint` → tudo verde.
- [ ] **Step 6: Commit** `feat(diet): data model, backup keys and TACO catalog`.

---

### Task 2: Lógica do dia e da água

**Files:**
- Create: `src/diet/day.ts`, `src/diet/water.ts`
- Test: `src/diet/day.test.ts`, `src/diet/water.test.ts`

**Interfaces:**
- Consumes: tipos da Task 1.
- Produces (`src/diet/day.ts`, todas puras):
  - `dayFromPlan(plan: DietPlan): DietDay` — `structuredClone` das refeições com `done: false`, `goalKcal` do plano.
  - `ensureDay(log: DietLog, plan: DietPlan, date: string): DietLog` — cria `log[date]` com `dayFromPlan` se não existir; se existir e **nenhuma refeição estiver `done`**, refaz a cópia com o plano atual (preservando nada); se houver `done`, devolve igual.
  - `toggleMeal(day, mealId): DietDay`; `swapItem(day, mealId, itemId, next: DietItem): DietDay` (o novo item recebe `swappedFrom` = nome original, substitui o anterior, inclusive se já era troca); `skipItem(day, mealId, itemId, skipped: boolean): DietDay`; `addExtra(day, mealId, item: DietItem): DietDay` (`extra: true`); `removeItem(day, mealId, itemId): DietDay` (desfaz extra); `undoSwap(day, mealId, itemId, original: DietItem): DietDay`.
  - `itemKcal(i: DietItem): number` e `itemMacros(i): { p; c; f }` = `per100 × grams / 100`.
  - `daySummary(day: DietDay): { kcal: number; p: number; c: number; f: number; mealsDone: number; mealsTotal: number; swaps: number; extras: number; skipped: number }` — comido = itens não pulados das refeições `done` + todos os extras (mesmo em refeição não marcada); números arredondados (kcal inteiro, macros 1 casa).
  - `isFullDay(day?: DietDay): boolean` — `mealsTotal ≥ 1`, todas `done`, `extras === 0`.
  - `sortedMeals<T extends { time: string }>(meals: T[]): T[]` — por horário, empate na ordem original.
- Produces (`src/diet/water.ts`):
  - `waterDefaults(weightKg: number): WaterSettings` — `goalMl` = 35 × peso arredondado pra 250 (peso 0 → 2000), `cupMl` 250, `enabled: true`.
  - `addCup(log: WaterLog, date, s: WaterSettings): WaterLog`; `removeCup(log, date, s): WaterLog` (mínimo 0) — gravam `goalMl` do dia.
  - `cupsShown(ml: number, s: WaterSettings): { full: number; total: number }` — `total = max(ceil(goalMl/cupMl), full + 1 se full ≥ ceil(goalMl/cupMl))`, `full = round(ml/cupMl)`.
  - `waterMet(d?: WaterDay): boolean` — `ml ≥ goalMl > 0`.

- [ ] **Step 1: Testes que falham** (em `day.test.ts`, com um plano fixture de 2 refeições, itens com `per100` conhecidos):

```ts
test('daySummary: refeição marcada conta, pulado não, extra conta mesmo sem marcar', () => { /* toggleMeal(café), skipItem(café, pão), addExtra(almoço não marcado, 100 g de 200 kcal/100) → kcal = café sem pão + 200; mealsDone 1; extras 1; skipped 1 */ })
test('troca substitui o item e conta como troca; trocar de novo substitui a troca', () => {})
test('ensureDay refaz a cópia se nada foi marcado e preserva se algo foi', () => {
  // dia copiado do plano A sem done → ensureDay com plano B → refeições de B
  // dia com café done → ensureDay com plano B → continua com as refeições de A
})
test('editar o plano não muda dias passados', () => { /* log com '2026-11-17' copiado; ensureDay(log, planoNovo, '2026-11-18') → log['2026-11-17'] idêntico */ })
test('isFullDay exige ≥ 1 refeição, todas feitas e nenhum extra (troca e pulo valem)', () => {
  expect(isFullDay({ meals: [] })).toBe(false)
})
test('sortedMeals ordena por horário e mantém empate na ordem original', () => {})
```
```ts
// water.test.ts
test('waterDefaults: 35 ml × peso arredondado pra 250', () => {
  expect(waterDefaults(80).goalMl).toBe(2750)
  expect(waterDefaults(0).goalMl).toBe(2000)
})
test('cupsShown: com todos cheios aparece um copo a mais', () => {
  expect(cupsShown(2500, { enabled: true, goalMl: 2500, cupMl: 250 })).toEqual({ full: 10, total: 11 })
})
test('addCup grava a meta do dia e removeCup não passa de 0', () => {})
```

- [ ] **Step 2:** `bun run test src/diet`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `bun run test`, `bun run build`, `bun run lint`.
- [ ] **Step 5: Commit** `feat(diet): day copy, summary and water logic`.

---

### Task 3: Formato da dieta, casamento com a TACO e prompt

**Files:**
- Create: `src/diet/dietFormat.ts`, `src/diet/match.ts`, `src/diet/prompt.ts`
- Modify: `src/workout/planFormat.ts` (exportar `extractJson`; exportar `profileLines(p?: Profile): string[]` separado das linhas de treino de `aboutMe`; mensagem pra arquivo só de dieta; texto do aviso), `src/workout/PlanImport.tsx:137`
- Test: `src/diet/dietFormat.test.ts`, `src/diet/match.test.ts`, `src/diet/prompt.test.ts`, `src/workout/planFormat.test.ts`

**Interfaces:**
- Consumes: `TacoFood`, `DietItem`, `DietPlan` (Task 1); `extractJson`, `PlanFormatError`, `profileLines` (este task).
- Produces (`dietFormat.ts`):
  - tipos `PumpAlimento { nome; gramas; porcao?; kcal?; proteinaG?; carboG?; gorduraG? }`, `PumpRefeicao { nome; horario; alimentos }`, `PumpDieta { metaKcal?; macros?: { proteinaG; carboG; gorduraG }; refeicoes }`.
  - `parseDietFormat(text: string): PumpDieta` — lança `PlanFormatError` com a lista de problemas (§7.7, mensagens exatas abaixo).
  - `dietFromFormat(d: PumpDieta, taco: TacoFood[] | null, customs: DietItem[]): { plan: DietPlan; items: { mealIdx: number; itemIdx: number; match: 'custom' | 'exact' | 'words' | 'ia' | 'none'; aiName: string }[]; offline: boolean }`.
  - `exportDietFormat(plan: DietPlan): string` (JSON com 2 espaços, valores da quantidade).
- Produces (`match.ts`): `foodKey(s: string): string` (minúsculas, sem acento, pontuação → espaço, espaços colapsados); `matchFood(name: string, grams: number, aiKcal: number | undefined, taco: TacoFood[], customs: DietItem[]): { kind: 'custom'; item: DietItem } | { kind: 'exact' | 'words'; food: TacoFood } | null`.
- Produces (`prompt.ts`): `buildDietPrompt(profile?: Profile): string`; `TACO_EXAMPLES: string[]` (~15 nomes reais do `taco.json`).

Mensagens (exatas):
- sem JSON: `Não encontrei um cardápio em JSON no texto`
- sem `dieta`: `Este arquivo não tem dieta.`
- `parsePlanFormat` com `dieta` e sem `treinos`: `Este arquivo só tem dieta. Importe na aba Dieta.`
- aviso no `PlanImport` quando vierem os dois: `A dieta deste arquivo pode ser importada na aba Dieta`
- por item: `Refeição {n}: falta o nome` · `Refeição {n}: horário inválido (use HH:MM)` · `Refeição {n}: sem alimentos` · `Refeição {n}, alimento {m}: falta o nome` · `Refeição {n}, alimento {m}: gramas inválidas` · `metaKcal fora da faixa (800 a 6000)` · `Cardápio sem refeições` · `Cardápio com mais de 10 refeições` · `Refeição {n}: mais de 30 alimentos`.

- [ ] **Step 1: Testes que falham**

```ts
// match.test.ts — fixture com nomes reais da TACO
const T: TacoFood[] = [
  { id: 1, name: 'Arroz, integral, cozido', kcal: 124, p: 2.6, c: 25.8, f: 1 },
  { id: 2, name: 'Arroz, integral, cru', kcal: 360, p: 7.3, c: 77.5, f: 1.9 },
  { id: 3, name: 'Frango, peito, sem pele, grelhado', kcal: 159, p: 32, c: 0, f: 2.5 },
  { id: 4, name: 'Frango, peito, com pele, assado', kcal: 212, p: 33.4, c: 0, f: 7.6 },
  { id: 5, name: 'Ovo, de galinha, inteiro, cozido/10minutos', kcal: 146, p: 13.3, c: 0.6, f: 9.5 },
]
test('nome igual casa (pontuação vira espaço)', () =>
  expect(matchFood('Ovo, de galinha, inteiro, cozido/10minutos', 100, undefined, T, [])).toMatchObject({ kind: 'exact', food: { id: 5 } }))
test('"cru" vs "cozido" decidido pela kcal da IA', () =>
  expect(matchFood('Arroz integral', 100, 130, T, [])).toMatchObject({ kind: 'words', food: { id: 1 } }))
test('candidato fora de 35% da kcal da IA cai pra estimativa', () =>
  expect(matchFood('Arroz integral', 100, 60, T, [])).toBeNull())
test('"com pele" não casa com "sem pele"', () =>
  expect(matchFood('Frango peito com pele', 100, undefined, T, [])).toMatchObject({ food: { id: 4 } }))
test('alimento criado casa antes da TACO', () => {})
```
```ts
// dietFormat.test.ts
test('parseDietFormat aceita JSON dentro de bloco de código', () => {})
test('cada regra de validação tem sua mensagem', () => { /* horário "7h", gramas 0, gramas 5000, refeição sem alimentos, metaKcal 300 → as mensagens acima */ })
test('kcal por 100 g acima de 900 é tratada como ausente', () => {})
test('dietFromFormat: casados guardam o nome da TACO; sem casamento vira ia com per100 da IA', () => {
  // 'Whey protein' 30 g kcal 120 → source 'ia', per100.kcal 400
})
test('sem kcal da IA e sem casamento: entra com 0 e match "none"', () => {})
test('taco null: tudo ia e offline true', () => {})
test('exportar e importar de novo mantém alimento criado como custom', () => {})
```
```ts
// planFormat.test.ts (acrescentar/ajustar)
test('arquivo só com dieta no import de treino dá a mensagem da aba Dieta', () =>
  expect(() => parsePlanFormat('{"formato":"pump-plano","versao":1,"dieta":{"refeicoes":[]}}')).toThrow('Este arquivo só tem dieta. Importe na aba Dieta.'))
```
```ts
// prompt.test.ts
test('buildDietPrompt traz perfil, anamnese da dieta, padrão TACO e formato, sem passar de 6000 caracteres sem os dados', () => {
  // contém 'TACO 4ª edição', 'Arroz, tipo 1, cozido', '"refeicoes"', o objetivo em texto ('perder peso')
})
test('todos os TACO_EXAMPLES existem no taco.json', () => {})
```

- [ ] **Step 2:** `bun run test`. Esperado: FAIL.
- [ ] **Step 3: Implementar.** Casamento (§7.3) na ordem: custom com mesmo `foodKey` → TACO com `foodKey` igual → candidatos com todas as palavras do item (ignorar só `de da do e`), ordenados por nome mais curto e depois alfabético, aceitando o primeiro com kcal (pros gramas) a até 35% da kcal da IA, ou o primeiro se a IA não mandou kcal → `null`. Valores da IA são da quantidade: `per100 = valor × 100 / gramas`. Ids novos com `crypto.randomUUID()`.
- [ ] **Step 4:** `bun run test`, `bun run build`, `bun run lint`.
- [ ] **Step 5: Commit** `feat(diet): diet format, TACO matching and AI prompt`.

---

### Task 4: Gaveta de alimentos e editor do cardápio

**Files:**
- Create: `src/diet/FoodPicker.tsx`, `src/diet/DietEditor.tsx`
- Test: `src/diet/FoodPicker.test.tsx`, `src/diet/DietEditor.test.tsx`

**Interfaces:**
- Consumes: `fetchTaco`, `searchCatalog`, `itemKcal`, `sortedMeals`, `exportDietFormat`, `usePersisted('foods')`, `usePersisted('dietLog')` (recentes).
- Produces:
  - `<FoodPicker title: string; initialGrams?: number; confirmLabel: 'Trocar' | 'Adicionar' | 'Usar'; onPick: (item: DietItem) => void; onClose: () => void; extraAction?: { label: string; onClick: () => void } />` — Drawer (vaul) no padrão do `CatalogPicker`: busca na TACO (aviso "Sem internet para buscar na TACO" offline), lista "Recentes e do cardápio" (itens de `dietPlan`, `foods` e dos últimos 14 dias do `dietLog`, sem nomes repetidos), quantidade em gramas −/+ (passo 10, mínimo 10), porção opcional, rodapé com a fonte, link "Criar alimento próprio" (nome + kcal/proteína/carbo/gordura por 100 g, grava em `foods` com `source: 'custom'`). `extraAction` serve pro "Pular hoje".
  - `<DietEditor initial?: DietPlan; onDone: () => void; onCancel: () => void />` — sem `initial`, espera `dietPlan` carregar (como o `PlanEditor`). Campos: meta kcal e P/C/G (opcionais), refeições (nome + horário `type="time"`), itens (nome, porção, gramas, kcal), adicionar/remover item e refeição, reordenar itens dentro da refeição, "Exportar cardápio" (copia `exportDietFormat`), "Apagar cardápio" com AlertDialog (grava `EMPTY_DIET`, não mexe no `dietLog`), Salvar grava `dietPlan` e chama `ensureDay(log, plan, todayKey())`.

- [ ] **Step 1: Testes que falham**

```tsx
test('FoodPicker offline mostra recentes e aviso; escolher devolve item com gramas', async () => { /* fetch rejeita; foods com 1 criado → lista mostra; tocar + Usar → onPick com grams 100 */ })
test('FoodPicker cria alimento próprio e grava em foods', async () => {})
test('FoodPicker busca na TACO e mostra a fonte', async () => { /* fetch mock com 2 alimentos; digitar "arroz" → 1 resultado; texto 'TACO 4ª ed.' */ })
test('DietEditor salva refeição com horário e item; Apagar cardápio volta a vazio', async () => {})
test('DietEditor exige horário HH:MM pra salvar', async () => {})
```

- [ ] **Step 2:** `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `bun run test`, `bun run build`, `bun run lint`.
- [ ] **Step 5: Commit** `feat(diet): food picker and menu editor`.

---

### Task 5: Gerar com IA e Importar

**Files:**
- Create: `src/diet/DietImport.tsx`, `src/diet/DietAnamnesisForm.tsx`
- Modify: `src/workout/AnamnesisForm.tsx` (exportar `Chips`, `MultiChips`), `src/workout/PlanImport.tsx` (exportar `Step`)
- Test: `src/diet/DietImport.test.tsx`

**Interfaces:**
- Consumes: `parseDietFormat`, `dietFromFormat`, `buildDietPrompt`, `fetchTaco`, `FoodPicker`, `DietEditor`, `Step`, `Chips`/`MultiChips`.
- Produces: `<DietImport mode: 'ia' | 'import'; onDone: () => void; onBack: () => void />`.
  - `mode='ia'`: anamnese (§7.2 item 1; objetivo obrigatório pra copiar) → "Copiar prompt pra IA" (grava `profile.dietAnamnesis` e copia `buildDietPrompt`) → colar.
  - Colar/arquivo (espera de 400 ms como o `PlanImport`) → `parseDietFormat` (erros listados) → `fetchTaco()` (falha = `null`) → `dietFromFormat`.
  - Revisar (mockup tela 3): meta e macros; itens com porção e kcal; `match === 'words'` e nome diferente → linha "na TACO: {nome}"; `ia` → "estimativa da IA"; `none` → "sem valores — escolha na TACO"; rodapé "N itens fora da TACO usam os números da IA. Toque pra trocar." (tocar num item `ia`/`none` abre `FoodPicker` e troca no cardápio em revisão); offline → aviso "Sem internet: usei os números da IA. Dá pra trocar depois.".
  - Botões "Editar" (abre `DietEditor` com o cardápio) e "Usar cardápio" (se já existir cardápio, AlertDialog "O cardápio atual será substituído. O que você já marcou hoje continua."; grava `dietPlan` e chama `ensureDay`).
  - `<DietAnamnesisForm value: Partial<DietAnamnesis>; onChange />` com os campos de §7.2.

- [ ] **Step 1: Testes que falham**

```tsx
test('gerar com IA: copiar prompt exige objetivo e grava a anamnese', async () => {})
test('import offline: tudo vira estimativa com aviso e dá pra usar', async () => { /* fetch rejeita; colar JSON com 2 itens → 'Sem internet: usei os números da IA. Dá pra trocar depois.'; 2× 'estimativa da IA'; Usar cardápio → dietPlan com 2 itens source ia */ })
test('casado por palavras com nome diferente mostra "na TACO"', async () => {})
test('JSON inválido lista os erros e não grava', async () => {})
test('substituir cardápio pede confirmação e preserva o que foi marcado hoje', async () => {})
```

- [ ] **Step 2:** `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `bun run test`, `bun run build`, `bun run lint`.
- [ ] **Step 5: Commit** `feat(diet): generate with AI and import flow`.

---

### Task 6: Aba Dieta, água e Configurações

**Files:**
- Create: `src/diet/DietTab.tsx`, `src/diet/MealCard.tsx`, `src/diet/WaterCard.tsx`
- Modify: `src/App.tsx` (trocar `<ComingSoon title="Dieta" />`), `src/shell/SettingsScreen.tsx` (grupo DIETA), `src/App.test.tsx`
- Delete: `src/shell/ComingSoon.tsx`
- Test: `src/diet/DietTab.test.tsx`, `src/shell/SettingsScreen.test.tsx` (se existir; senão no `App.test.tsx`)

**Interfaces:**
- Consumes: tudo de Tasks 2, 4 e 5; `formatDayLabel`, `EmptyState`.
- Produces: `<DietTab />`.
  - Sem cardápio: `EmptyState` "Monte seu cardápio" com "Gerar com IA" (abre `DietImport mode='ia'`), "Do zero" (abre `DietEditor` com `EMPTY_DIET` + 1 refeição vazia), "Importar" (`DietImport mode='import'`).
  - Com cardápio: rótulo `formatDayLabel(hoje)`, título "Dieta"; cartão de calorias (§7.4: `{feito} / {meta} kcal`, barra, P/C/G; sem meta só o feito; acima de 100% barra cheia sem cor de alerta); `WaterCard` ou o link "Ligar contador de água" (liga com `waterDefaults(profile.weightKg)`); refeições com `sortedMeals` mostrando o dia (`dietLog[hoje]` ou `dayFromPlan(plan)` antes da cópia).
  - Toda ação (marcar, trocar, pular, extra, desfazer) faz `setLog((l) => mutar(ensureDay(l, plan, todayKey()), ...))`. A data é lida na hora da ação e recalculada em `visibilitychange`.
  - `MealCard`: círculo marca/desmarca; linha com horário, kcal e "N troca(s)"/"N extra(s)"; aberto mostra os itens (trocados em `text-accent` com ícone de troca, pulados riscados com "Desfazer", extras com "Remover"), tocar num item abre `FoodPicker` (`confirmLabel='Trocar'`, `initialGrams` = gramas do item, `extraAction` "Pular hoje"), "Adicionar extra" no fim.
  - Fim da aba: "Editar cardápio".
  - Configurações: grupo **DIETA** com "Cardápio" (abre `DietEditor`), "Gerar com IA" (`DietImport mode='ia'`) e "Água" (tela com Switch liga/desliga, meta ml e copo ml).

- [ ] **Step 1: Testes que falham**

```tsx
test('sem cardápio mostra o convite com os 3 caminhos', async () => {})
test('marcar refeição copia o dia e soma as kcal', async () => {})
test('trocar item só hoje não muda o cardápio', async () => {})
test('pular item tira as kcal e mostra Desfazer', async () => {})
test('copos: tocar no vazio soma, no último cheio tira; link liga a água com a meta do peso', async () => {})
test('virada da meia-noite: ação depois da meia-noite vai pro dia novo', async () => {
  // vi.setSystemTime(23:59 de 18/11); render; avançar pra 00:01 de 19/11; disparar visibilitychange; marcar refeição → dietLog['2026-11-19'] existe e '2026-11-18' não mudou
})
```
```tsx
// App.test.tsx: remover a expectativa de "chega em breve"; aba Dieta mostra "Monte seu cardápio"
```

- [ ] **Step 2:** `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `bun run test`, `bun run build`, `bun run lint`.
- [ ] **Step 5: Commit** `feat(diet): diet tab, water and settings`.

---

### Task 7: Evolução — direção, conquistas, Histórico, cartão e PDF

**Files:**
- Modify: `src/evolution/bodyFat.ts`, `src/evolution/achievements.ts`, `src/evolution/AchievementsScreen.tsx`, `src/evolution/useAchievementToasts.ts`, `src/evolution/HistoryScreen.tsx`, `src/evolution/EvolutionTab.tsx`, `src/evolution/report.ts`, `src/evolution/pdf/ReportDocument.tsx`
- Create: `src/evolution/DietCard.tsx`
- Test: `src/evolution/bodyFat.test.ts`, `src/evolution/achievements.test.ts`, `src/evolution/AchievementsScreen.test.tsx`, `src/evolution/HistoryScreen.test.tsx`, `src/evolution/report.test.ts`, `src/evolution/EvolutionTab.test.tsx`

**Interfaces:**
- Consumes: `daySummary`, `isFullDay`, `waterMet` (Task 2); tipos da Task 1.
- Produces:
  - `goalDirection(p?)`: `dietAnamnesis.goal` em `perder*` → `'loss'`, em `ganhar*` → `'gain'`; `manter`/ausente → regra atual.
  - `AchievementId` ganha `'diet-day' | 'diet-7' | 'water-7'` (títulos: "Dia no plano", "7 dias na dieta", "Água 7 dias"). `Input` ganha `dietLog?: DietLog; waterLog?: WaterLog; dietPlan?: DietPlan`. Só dias `< today` contam; dia sem entrada no `dietLog` quebra a sequência; água lê só o `waterLog`. As 3 entram na lista só quando `dietPlan.meals.length > 0` ou há algum dia no `dietLog`.
  - `Report` ganha `diet: { avgKcal: number; avgGoal?: number; fullDays: number; waterDays: number; days: number; achievements: { title: string; earnedAt: string }[] } | null`; `period.start` considera o primeiro dia do `dietLog`/`waterLog`.
  - `<DietCard log: DietLog; water: WaterLog; today: string />` (§7.9: últimos 30 dias incluindo hoje; média de kcal dos dias com ≥ 1 refeição marcada vs. média de `goalKcal` desses dias; dias no plano e água na meta sobre `min(30, dias desde o 1º registro)`).
  - Histórico: carrega `dietLog`/`waterLog` com o resto; ponto no calendário quando há refeição marcada ou água; detalhe com "Dieta · {kcal} kcal" / "{feitas} de {total} refeições · N troca(s) · N extra(s)" e "Água · {L}"; "Apagar dieta" e "Apagar água" com AlertDialog (removem a chave do dia).
  - EvolutionTab: estado vazio considera dias de dieta; `DietCard` quando há cardápio ou dias de dieta; `deps` do PDF inclui `dietLog`, `waterLog`, `dietPlan`.
  - PDF: seção "Dieta" quando `report.diet` existe; conquistas de dieta nela, não na de treino.
  - Carregar os logs novos (com `loaded`) em AchievementsScreen, useAchievementToasts (dependências do efeito incluídas) e EvolutionTab.

- [ ] **Step 1: Testes que falham**

```ts
test('goalDirection: objetivo da dieta manda em perder/ganhar; manter cai no do treino', () => {
  expect(goalDirection({ ...p, anamnesis: { goal: 'hipertrofia' }, dietAnamnesis: { goal: 'perder' } })).toBe('loss')
  expect(goalDirection({ ...p, anamnesis: { goal: 'hipertrofia' }, dietAnamnesis: { goal: 'manter' } })).toBe('gain')
})
test('dia no plano só conta dia fechado; hoje 100% não ganha', () => {})
test('7 dias na dieta quebra com dia sem registro', () => {})
test('água 7 dias lê o waterLog mesmo com a água desligada', () => {})
test('sem dieta a estante mostra "de 12"; com cardápio "de 15"', async () => {})
test('Histórico mostra dieta e água do dia e apaga com confirmação', async () => {})
test('report.diet: média, dias no plano e período começando no 1º dia de dieta', () => {})
test('Evolução de quem só faz dieta mostra o cartão Dieta', async () => {})
```

- [ ] **Step 2:** `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `bun run test`, `bun run build`, `bun run lint`; conferir que o chunk principal não cresceu mais que 15 KB gzip em relação à `main` (a TACO não entra no bundle).
- [ ] **Step 5: Commit** `feat(diet): evolution card, history, achievements and pdf`.

---

### Task 8: Conferência visual

**Files:**
- Modify: só ajustes de estilo e layout que a conferência apontar.

- [ ] **Step 1:** `bun run build && bunx vite preview`, guardar o PID e abrir `http://localhost:4173/pump/` no Playwright MCP, em 390×844.
- [ ] **Step 2:** Pela UI: gerar o prompt, colar um JSON de cardápio de 5 refeições (com 1 item fora da TACO), usar; marcar refeições, trocar, pular, extra; ligar a água e somar copos.
- [ ] **Step 3:** Fotografar e comparar com `docs/design/dieta.html` (sem o botão "Modelo" e sem a sugestão de meta, que saíram): convite, anamnese, revisão, dia a dia, gaveta, editor, cartão Dieta e detalhe do Histórico. Corrigir diferenças. Conferir 320 px sem rolagem horizontal nem barra visível.
- [ ] **Step 4:** Abrir um PDF gerado e ver a seção Dieta.
- [ ] **Step 5:** `bun run test`, build e lint. Fechar o browser, apagar `.playwright-mcp/`, parar o servidor pelo PID. Commit `style(diet): visual pass against mockup`, se houve ajuste. Salvar 4 prints em `/Users/yagoramires/Documents/.those-guys/out/pump-dieta-*.png`.
- [ ] **Step 6:** **PARAR:** nada de push.
