# Anamnese inicial única e check-in semanal · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perguntas comuns uma vez na montagem (Sobre você → Objetivos → Dia zero → Treino → Dieta), peso só nas medidas, objetivos separados por prompt e check-in semanal na Evolução.

**Architecture:** O `Profile` ganha os campos comuns e perde `weightKg`; uma migração pura (`migrateData`) converte dados guardados e backups antigos, rodando uma vez antes do primeiro quadro. Os passos 1–3 são um componente (`AnamnesisFlow`) usado pela montagem e pelo cartão "Complete sua anamnese". O check-in é lógica pura (`checkIn.ts`) mais telas na Evolução.

**Tech Stack:** React 19, Vite 8, TS, Tailwind v4 + shadcn/ui, vitest + Testing Library + fake-indexeddb, bun.

**Spec:** `docs/superpowers/specs/2026-11-18-pump-anamnese-design.md` · Mockup: `docs/design/anamnese.html`

## Global Constraints

- Texto da interface em pt-BR, igual ao mockup e à spec (copy exata quando a spec traz entre aspas).
- Commits sem `Co-Authored-By` e sem "Generated with Claude". Sem push.
- Rodar com bun: `bun run test`, `bunx tsc -b`, `bun run lint`, `bun run build`.
- Testes de componente usam `await renderLoaded(...)` de `test/render.ts`; o fuso dos testes é `America/Sao_Paulo`.
- Antes de explorar código: quando `graphify-out/graph.json` existir, rodar `graphify query "<pergunta>"` antes do primeiro grep/leitura; depois de mudar código, `graphify update .`.
- Semana Dom–Sáb (`weekStart` de `src/lib/date.ts`); `checkInDay` segue `Date.getDay()` (0 = domingo).
- Ícones lucide de traço, nunca emoji. Reaproveitar `Chips`, `NumberField`, `BackHeader`, `BottomBar`, `card`, `label-caps`.
- O formato do backup continua `version: 1`; backups antigos importam.
- Nenhum dado existente é perdido: treino, dieta, histórico, fotos e o peso antigo do perfil.

## Review Focus

1. Usuário antigo com `weightKg` no perfil e nenhuma medição → depois de abrir o app, o peso aparece na Evolução, e `weightKg` some do perfil (Task 1, teste `migrateStored`).
2. Backup antigo restaurado no passo 1 da montagem → dados migrados e montagem concluída, sem tela em branco (Task 1 teste de `importBackupFile`; Task 5 teste de restaurar).
3. Voltar do passo 3 ao 1 e avançar de novo → nada do que foi digitado se perde, e nada é gravado antes do "Continuar" do passo 3 (Task 4).
4. Check-in perdido na semana passada → continua pedindo depois da virada da semana até registrar peso (Task 6).
5. Objetivo "manter" ou vazio → peso e medidas sem cor de bom, conquistas de peso fora da estante e do total; gordura caindo continua boa (Task 2).

---

### Task 1: Dados novos do perfil e migração

**Files:**
- Modify: `src/profile/types.ts`, `src/workout/types.ts`, `src/diet/types.ts`, `src/schema.ts`
- Create: `src/profile/migrate.ts`, `src/profile/migrate.test.ts`
- Modify: `src/App.tsx` (Shell), `src/storage/backup.ts` (`importBackupFile`)
- Modify (só pra compilar com os campos novos): `src/profile/promptLines.ts`, `src/workout/prompt.ts`, `src/diet/prompt.ts`, `src/workout/AnamnesisForm.tsx`, `src/diet/DietAnamnesisForm.tsx`, `src/diet/DietImport.tsx`, `src/evolution/MeasureDrawer.tsx`, `src/shell/SettingsScreen.tsx`, `src/profile/ProfileForm.tsx`, `src/evolution/bodyFat.ts`, `test/evolutionFixture.ts` e os testes que montam perfis antigos

**Interfaces:**
- Produces:
  - `type Focus = 'hipertrofia' | 'forca' | 'condicionamento'` em `src/profile/types.ts`
  - `interface Profile { sex: Sex; heightCm: number; age?: number; wake?: string; train?: string; sleep?: string; daysPerWeek?: number; notes?: string; dietGoal?: DietGoal; focus?: Focus; anamnesis?: Anamnesis; dietAnamnesis?: DietAnamnesis }`
  - `Anamnesis = { level?; place?; split?; extras?; weak?; minutes? }` (saem `goal`, `age`, `daysPerWeek`, `notes`; o tipo `Goal` é apagado)
  - `DietAnamnesis = { meals?; restrictions?; avoid?; eatOut?; notes? }` (saem `goal`, `wake`, `train`, `sleep`)
  - `Settings` ganha `checkInDay?: number; anamnesisAt?: string`
  - `DEFAULTS.profile = { sex: 'M', heightCm: 0 }`
  - `migrateData(data: Record<string, unknown>, today: string): Record<string, unknown>` — pura, idempotente; mexe só em `profile` e `measurements`
  - `migrateStored(): Promise<void>` — lê `profile`, `measurements` e `settings` com `readCurrent`, aplica `migrateData` e grava com `save` só as chaves que mudaram (comparando `JSON.stringify`)
  - `FOCUS: Record<Focus, string>` em `src/profile/promptLines.ts` = `{ hipertrofia: 'hipertrofia (ganhar massa muscular)', forca: 'força', condicionamento: 'condicionamento' }` (substitui `GOALS`)
  - `profileLines(p)` passa a emitir só sexo, `Idade: {p.age} anos` e altura (sem peso)
  - `goalDirection(p: Profile): 'gain' | 'loss' | null` — `dietGoal` `perder*` → `'loss'`, `ganhar*` → `'gain'`, senão `null`; `isGood(m, dir: 'gain' | 'loss' | null, v)` com `null` só deixa `fat` caindo como bom (o resto da Task 2 vem depois)

Regras da migração (copiar da spec §5):
- `anamnesis.age/daysPerWeek/notes` e `dietAnamnesis.wake/train/sleep` sobem para o perfil quando o perfil ainda não tem o campo; somem de dentro das anamneses.
- `dietGoal` = `dietAnamnesis.goal`; se não houver: treino `emagrecer` → `'perder'`, `hipertrofia` → `'ganhar'`, os outros ficam sem objetivo.
- `focus`: `hipertrofia`/`emagrecer` → `'hipertrofia'`, `forca` → `'forca'`, `saude` → `'condicionamento'`; sem objetivo → ausente.
- `anamnesis.goal` e `dietAnamnesis.goal` somem.
- `weightKg > 0` e nenhuma medição com `weightKg` → `upsertMeasurement(list, settings.firstUseAt ?? today, { weightKg })`. Depois `weightKg` some do perfil, sempre.
- `migrateData` lê `settings.firstUseAt` de `data.settings` quando houver.

- [ ] **Step 1: Escrever os testes de `src/profile/migrate.test.ts`**

```ts
test('sobe campos comuns e separa objetivos', () => {
  const out = migrateData({ profile: { sex: 'M', heightCm: 178, anamnesis: { goal: 'forca', age: 30, daysPerWeek: 4, notes: 'ombro', level: 'avancado' }, dietAnamnesis: { goal: 'perder', wake: '06:30', train: '18:00', sleep: '23:00', meals: 5 } } }, '2026-11-18')
  expect(out.profile).toEqual({ sex: 'M', heightCm: 178, age: 30, daysPerWeek: 4, notes: 'ombro', wake: '06:30', train: '18:00', sleep: '23:00', dietGoal: 'perder', focus: 'forca', anamnesis: { level: 'avancado' }, dietAnamnesis: { meals: 5 } })
})
test.each([['emagrecer', 'perder', 'hipertrofia'], ['hipertrofia', 'ganhar', 'hipertrofia'], ['forca', undefined, 'forca'], ['saude', undefined, 'condicionamento']])('objetivo de treino %s sem dieta', (goal, dietGoal, focus) => {
  const p = migrateData({ profile: { sex: 'F', heightCm: 160, anamnesis: { goal } } }, '2026-11-18').profile as Profile
  expect(p.dietGoal).toBe(dietGoal)
  expect(p.focus).toBe(focus)
})
test('objetivo da dieta antigo vence o do treino', () => {
  const p = migrateData({ profile: { sex: 'M', heightCm: 170, anamnesis: { goal: 'hipertrofia' }, dietAnamnesis: { goal: 'manter' } } }, '2026-11-18').profile as Profile
  expect(p.dietGoal).toBe('manter')
})
test('peso do perfil vira medição em firstUseAt quando não há peso medido', () => {
  const out = migrateData({ profile: { sex: 'M', heightCm: 178, weightKg: 82.4 }, measurements: [], settings: { firstUseAt: '2026-11-01' } }, '2026-11-18')
  expect(out.measurements).toMatchObject([{ date: '2026-11-01', weightKg: 82.4 }])
  expect(out.profile).not.toHaveProperty('weightKg')
})
test('peso do perfil some sem criar medição quando já há peso medido', () => {
  const ms = [{ id: 'a', date: '2026-11-10', weightKg: 80 }]
  const out = migrateData({ profile: { sex: 'M', heightCm: 178, weightKg: 82.4 }, measurements: ms }, '2026-11-18')
  expect(out.measurements).toEqual(ms)
})
test('idempotente', () => {
  const once = migrateData(OLD, '2026-11-18')
  expect(migrateData(once, '2026-11-18')).toEqual(once)
})
test('migrateStored grava o perfil migrado e a medição no store', async () => { /* seed idb com perfil antigo { weightKg: 82.4 } e settings.firstUseAt; await migrateStored(); expect(await readCurrent('measurements')).toMatchObject([{ weightKg: 82.4 }]); expect(await readCurrent('profile')).not.toHaveProperty('weightKg') */ })
test('importBackupFile migra um backup antigo', async () => { /* arquivo version 1 com anamnesis.goal 'saude' → readCurrent('profile').focus === 'condicionamento' */ })
```

- [ ] **Step 2: Rodar e ver falhar** — `bun run test src/profile/migrate.test.ts` → FAIL (módulo não existe).

- [ ] **Step 3: Implementar tipos, `DEFAULTS`, `migrateData`, `migrateStored`.** Em `src/App.tsx`, o Shell suspende também numa promessa única de migração depois das leituras: `use(migrationFor(readKey('profile')))`, onde `migrationFor` (em `migrate.ts`) guarda a promessa num `WeakMap` indexado pela promessa do `readKey('profile')` (assim `resetStoreForTests` recomeça sozinho). `importBackupFile` chama `replaceAll(migrateData(b.data, todayKey()))`.

- [ ] **Step 4: Ajustar o que deixou de compilar, sem mudar comportamento visível além do necessário:**
  - `AnamnesisForm`: sem os campos Objetivo, Dias por semana, Idade e Lesões (fica Nível, Onde treina, Divisão, Pontos fracos, Incluir também, Tempo por treino).
  - `DietAnamnesisForm`: sem Objetivo e horários; subtítulo "Opcional. O que faltar a IA pergunta."
  - `DietImport`: o botão "Copiar prompt pra IA" deixa de exigir objetivo.
  - `MeasureDrawer`: não grava mais `profile.weightKg`.
  - `SettingsScreen`: subtítulo do Perfil = `{peso da última medição} kg · {altura} cm` (com `series(measurements, 'weightKg')`).
  - `ProfileForm`: sem o campo Peso (o componente sai na Task 5).
  - Prompts leem os campos do lugar novo: `Idade` de `p.age`; treino usa `Foco: {FOCUS[p.focus]}`, `Dias por semana: {p.daysPerWeek}`, `Lesões, limitações ou observações: {p.notes}`; dieta usa `p.dietGoal`, `p.wake/train/sleep`, `p.daysPerWeek` (inclusive na regra dos 2 cardápios) e `Observações gerais: {p.notes}`, e perde a linha "Objetivo no treino".
  - `test/evolutionFixture.ts` e testes: perfis no formato novo, com o mesmo efeito de antes (`gain` → `dietGoal: 'ganhar'`; o perfil principal fica `dietGoal: 'perder'`). O snapshot golden não pode mudar nesta task.

- [ ] **Step 5: Verificar** — `bunx tsc -b && bun run test` → tudo verde; `git diff --stat src/evolution/__snapshots__` vazio.

- [ ] **Step 6: Commit** — `git commit -m "feat: perfil com campos comuns e migração dos dados antigos"`

---

### Task 2: Evolução sem direção quando o objetivo é manter ou vazio

**Files:**
- Modify: `src/evolution/bodyFat.ts`, `src/evolution/achievements.ts`, `src/evolution/report.ts` (se precisar), `src/evolution/PhotoCompare.tsx`
- Test: `src/evolution/bodyFat.test.ts`, `src/evolution/achievements.test.ts`, `src/evolution/golden.test.ts` + `test/evolutionFixture.ts`

**Interfaces:**
- Consumes: `goalDirection`, `isGood` (Task 1)
- Produces: `computeAchievements` sem `weight-small`/`weight-big` quando `goalDirection(profile) === null`

- [ ] **Step 1: Testes**

```ts
test.each([['perder-rapido', 'loss'], ['perder', 'loss'], ['manter', null], [undefined, null], ['ganhar', 'gain'], ['ganhar-rapido', 'gain']])('goalDirection %s', (dietGoal, dir) => {
  expect(goalDirection({ sex: 'M', heightCm: 178, dietGoal } as Profile)).toBe(dir)
})
test('sem direção, peso e medidas não são bons; gordura caindo é', () => {
  expect(isGood('weightKg', null, -1)).toBe(false)
  expect(isGood('armCm', null, 1)).toBe(false)
  expect(isGood('fat', null, -0.5)).toBe(true)
})
test('sem objetivo, conquistas de peso somem da lista', () => {
  const ids = computeAchievements({ ...input, profile: { sex: 'M', heightCm: 178 } }, today).map((a) => a.id)
  expect(ids).not.toContain('weight-small')
  expect(ids).not.toContain('weight-big')
})
```
Golden: acrescentar um caso `neutral` (perfil sem `dietGoal`) no mapa de perfis alternativos de `test/evolutionFixture.ts` (onde estão `gain` e `female`), coberto pelo golden.

- [ ] **Step 2: Rodar e ver falhar** — `bun run test src/evolution` → FAIL nos novos.
- [ ] **Step 3: Implementar.** `computeAchievements` filtra as duas conquistas de peso quando a direção é `null`; o total da estante sai da própria lista. `PhotoCompare` passa a direção como está.
- [ ] **Step 4: Verificar** — `bun run test -u src/evolution/golden.test.ts` e conferir no diff do snapshot que só entrou o caso `neutral`; depois `bun run test` verde.
- [ ] **Step 5: Commit** — `git commit -m "feat: evolução neutra sem objetivo de peso"`

---

### Task 3: Prompt da dieta com dados do corpo

**Files:**
- Modify: `src/diet/prompt.ts`, `src/diet/DietImport.tsx`
- Test: `src/diet/prompt.test.ts`, `src/workout/prompt.test.ts` (ou o teste de prompt existente do treino)

**Interfaces:**
- Consumes: `series`, `fatSeries`, `FIELDS` de `src/evolution/measurements.ts`; `formatKg`, `formatDec`, `plural` de `src/lib/number.ts`; `addDays`, `daysBetween` de `src/lib/date.ts`
- Produces: `buildDietPrompt(profile: Profile | undefined, measurements: Measurement[], today: string): string`

Linhas novas em "Sobre mim" (nessa ordem, depois das do perfil), cada uma só quando houver dado:
- `Peso: {formatKg(último peso)} kg`
- `Gordura corporal (estimativa US Navy): {x}%` — último ponto de `fatSeries`
- `Massa magra (estimativa): {formatKg(peso × (1 − gordura/100))} kg` — só com peso e gordura
- `Medidas: cintura 92 cm, pescoço 38 cm…` — último valor de cada campo de `FIELDS` exceto peso, na ordem de `FIELDS`, rótulos em minúsculas
- `Variação do peso: {−1,2} kg em {N semanas}` — da medição de peso mais antiga com data ≥ `addDays(today, -28)` até a última; exige 2 pontos em datas diferentes; N = `max(1, round(dias/7))`; sinal `−`/`+` como em `formatSigned`

- [ ] **Step 1: Testes**

```ts
test('dieta leva peso, gordura, massa magra, medidas e variação', () => {
  const p = buildDietPrompt({ sex: 'M', heightCm: 178, dietGoal: 'perder' }, [
    { id: 'a', date: '2026-10-28', weightKg: 83.6 },
    { id: 'b', date: '2026-11-18', weightKg: 82.4, neckCm: 38, waistCm: 92 },
  ], '2026-11-18')
  expect(p).toContain('- Peso: 82,4 kg')
  expect(p).toMatch(/- Gordura corporal \(estimativa US Navy\): \d+,\d%/)
  expect(p).toMatch(/- Massa magra \(estimativa\): \d+,\d kg/)
  expect(p).toContain('- Medidas: pescoço 38 cm, cintura 92 cm')
  expect(p).toContain('- Variação do peso: −1,2 kg em 3 semanas')
  expect(p).toContain('- Objetivo da dieta: perder peso')
})
test('sem pescoço/cintura não tem gordura nem massa magra; uma medição só não tem variação', () => {
  const p = buildDietPrompt({ sex: 'M', heightCm: 178 }, [{ id: 'a', date: '2026-11-18', weightKg: 82.4 }], '2026-11-18')
  expect(p).not.toContain('Gordura')
  expect(p).not.toContain('Massa magra')
  expect(p).not.toContain('Variação')
})
test('dieta não leva o foco do treino', () => {
  expect(buildDietPrompt({ sex: 'M', heightCm: 178, focus: 'forca' }, [], '2026-11-18')).not.toMatch(/força|Foco/)
})
test('treino não leva objetivo da dieta nem peso', () => {
  const p = buildPrompt({ sex: 'M', heightCm: 178, dietGoal: 'perder', focus: 'hipertrofia' })
  expect(p).toContain('- Foco: hipertrofia (ganhar massa muscular)')
  expect(p).not.toMatch(/perder peso|Peso:|Gordura/)
})
```
(Os números exatos de gordura dependem de `bodyFat`; o teste fixa o formato. A ordem do teste de medidas segue `FIELDS`: Pescoço antes de Cintura.)

- [ ] **Step 2: Rodar e ver falhar** — `bun run test src/diet/prompt.test.ts` → FAIL.
- [ ] **Step 3: Implementar**; `DietImport` passa `usePersisted('measurements')` e `todayKey()`.
- [ ] **Step 4: Verificar** — `bun run test` verde.
- [ ] **Step 5: Commit** — `git commit -m "feat: prompt da dieta com peso, gordura, massa magra e variação"`

---

### Task 4: Passos 1–3 (`AnamnesisFlow`)

**Files:**
- Create: `src/onboarding/Steps.tsx`, `src/profile/AboutForm.tsx`, `src/profile/GoalsForm.tsx`, `src/profile/WeekdayChips.tsx`, `src/onboarding/DayZero.tsx`, `src/onboarding/AnamnesisFlow.tsx`, `src/onboarding/AnamnesisFlow.test.tsx`
- Modify: `src/onboarding/Onboarding.tsx` (passa a importar `Steps` de `Steps.tsx`), `src/evolution/MeasureDrawer.tsx` (exportar o form)

**Interfaces:**
- Consumes: `Profile`, `Focus`, `Settings` (Task 1); `upsertMeasurement`; `PhotoCapture({ date, onClose })`; `usePhotoSets`; `bodyFat`
- Produces:
  - `Steps({ n, total }: { n: number; total: number })` exportado de `src/onboarding/Steps.tsx` (texto `PASSO {n} DE {total}`)
  - `AboutForm({ value, onChange }: { value: Profile; onChange: (p: Profile) => void })` — Sexo (toggle como o `ProfileForm` atual), Idade (anos), Altura (cm), Acorda/Treina/Dorme (`<Input type="time">`), "Dias de treino por semana" (`Chips` 1–7), "Lesões, limitações ou observações" (textarea, placeholder "Ex.: dor no ombro direito")
  - `GoalsForm({ value, onChange })` — "Objetivo da alimentação" (`Chips` 2 colunas: Perder rápido / Perder peso / Manter / Ganhar peso / Ganhar rápido) e "Foco do treino" (`Chips` 3 colunas: Hipertrofia / Força / Condicionamento), com os textos de apoio do mockup: "Define a meta de calorias e se o peso descendo é bom ou ruim na Evolução." e "Ganhar massa é o padrão, mesmo perdendo gordura na dieta."
  - `WeekdayChips({ label, value, onChange }: { label: string; value?: number; onChange: (d: number) => void })` — D S T Q Q S S, valores 0–6
  - `MeasureForm` exportado de `MeasureDrawer.tsx` com props novas `submitLabel?: string` (padrão "Salvar"), `needWeight?: boolean` (trava o botão sem peso válido) e `children?: ReactNode` (renderizado entre a caixa de gordura e o botão)
  - `AnamnesisFlow({ total, onDone, onBack, first }: { total: 3 | 5; onDone: () => void; onBack?: () => void; first?: ReactNode })` — 3 passos com `Steps` de total 5 (montagem) ou 3 (cartão); `first` é o rodapé extra do passo 1 (a montagem põe o "Restaurar backup")

Comportamento:
- Rascunho do perfil em estado local, começando de `usePersisted('profile')` com `focus` padrão `'hipertrofia'` quando ausente; passo 1 só avança com sexo e altura > 0.
- Passo 3 (`DayZero`): `MeasureForm` com `needWeight`, valores iniciais da medição de hoje se existir; dentro dele (children) a linha de fotos (3 botões Frente/Lado/Costas com miniatura quando já houver foto de hoje; qualquer um abre `PhotoCapture` de hoje em tela cheia) e `WeekdayChips` "Atualizar toda semana na" com padrão `settings.checkInDay ?? weekday(today)`. Botão "Continuar".
- "Continuar" do passo 3 grava junto: perfil do rascunho, `upsertMeasurement(list, today, fields)`, `settings.checkInDay` e `settings.anamnesisAt = today`; depois `onDone()`.
- "Voltar" (BackHeader) nos passos 2–3 volta um passo com o rascunho intacto; no passo 1 chama `onBack` se houver.

- [ ] **Step 1: Testes em `AnamnesisFlow.test.tsx`**

```ts
test('passo 1 exige sexo e altura', async () => { /* Continuar desabilitado até digitar Altura 178 */ })
test('voltar do passo 3 ao 1 mantém o que foi digitado e não grava nada', async () => {
  /* digita Idade 29, Altura 178, avança, escolhe "Perder peso", avança, volta 2x */
  expect(screen.getByLabelText('Idade')).toHaveValue('29')
  expect(await readCurrent('profile')).toEqual(DEFAULTS.profile)
})
test('dia zero exige peso e grava perfil, medição e check-in juntos', async () => {
  /* ... Peso 82,4, Cintura 92, dia Q (quarta=3), Continuar */
  expect(await readCurrent('measurements')).toMatchObject([{ date: today, weightKg: 82.4, waistCm: 92 }])
  expect(await readCurrent('settings')).toMatchObject({ checkInDay: 3, anamnesisAt: today })
  expect(await readCurrent('profile')).toMatchObject({ heightCm: 178, age: 29, dietGoal: 'perder', focus: 'hipertrofia' })
  expect(onDone).toHaveBeenCalled()
})
test('abre preenchido para quem já usa', async () => { /* seed perfil { age: 40, dietGoal: 'ganhar' } → Idade 40 e "Ganhar peso" marcado */ })
```

- [ ] **Step 2: Rodar e ver falhar** — `bun run test src/onboarding/AnamnesisFlow.test.tsx` → FAIL.
- [ ] **Step 3: Implementar** os componentes acima; `MeasureDrawer` passa a usar `MeasureForm` sem mudança visível (teste existente continua verde).
- [ ] **Step 4: Verificar** — `bun run test` e `bunx tsc -b` verdes.
- [ ] **Step 5: Commit** — `git commit -m "feat: passos sobre você, objetivos e dia zero"`

---

### Task 5: Montagem em 5 passos e Perfil nos Ajustes

**Files:**
- Modify: `src/onboarding/Onboarding.tsx`, `src/onboarding/Onboarding.test.tsx`, `src/shell/SettingsScreen.tsx`
- Create: `src/profile/ProfileScreen.tsx`
- Delete: `src/profile/ProfileForm.tsx` (e seu teste, se houver)

**Interfaces:**
- Consumes: `AnamnesisFlow`, `Steps`, `AboutForm`, `GoalsForm`, `WeekdayChips` (Task 4); `DietEditor`, `DietImport({ mode, onDone, onBack })`, `savePlan` como usados em `DietTab`
- Produces: `ProfileScreen({ onDone }: { onDone: () => void })`

Comportamento:
- `type Step = 'anamnese' | 'treino' | 'editor' | 'import' | 'dieta' | 'dieta-editor' | 'dieta-ia' | 'dieta-import'`.
- `anamnese` = `AnamnesisFlow total={5}` com `first` = "Restaurar backup" (mesmo `useImportBackup` de hoje; restaurar conclui a montagem como hoje). Sem botão "Pular" nos passos 1–3.
- Passo 4 "Seu treino": igual ao atual com `Steps n={4} total={5}`; "Pular por agora", salvar no editor e terminar o import vão para `dieta` (não concluem mais a montagem). "Voltar" volta ao passo 3.
- Passo 5 "Sua dieta": `EmptyState` "Monte seu cardápio" / "A IA já recebe peso, % de gordura, massa magra, medidas e horários."; "Gerar com IA", "Do zero", "Importar", "Pular por agora". Os três abrem os mesmos fluxos do `DietTab` vazio (em `Overlay`); salvar/terminar ou pular chama `finish()` (`onboardingDone: true`, `firstUseAt`).
- `ProfileScreen`: `AboutForm` + `GoalsForm` + `WeekdayChips` "Atualizar toda semana na" + "Salvar" (exige altura > 0); grava perfil e `settings.checkInDay`. `SettingsScreen` troca o `ProfileForm` por ele.

- [ ] **Step 1: Testes em `Onboarding.test.tsx`** (reescrever os do fluxo antigo)

```ts
test('5 passos até concluir', async () => { /* sobre você → objetivos → dia zero (peso) → "Pular por agora" no treino → "Pular por agora" na dieta */
  expect((await readCurrent('settings')).onboardingDone).toBe(true)
})
test('pular o treino leva à dieta, não conclui', async () => { expect(screen.getByRole('heading', { name: 'Sua dieta' })).toBeInTheDocument() })
test('restaurar backup no passo 1 conclui a montagem', async () => { /* arquivo antigo → onboardingDone e perfil migrado */ })
test('Perfil nos Ajustes salva dados comuns e dia do check-in', async () => { /* ProfileScreen: muda Foco pra Força e dia pra S (1) → profile.focus 'forca', settings.checkInDay 1 */ })
```

- [ ] **Step 2: Rodar e ver falhar** — `bun run test src/onboarding src/shell` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Verificar** — `bun run test`, `bunx tsc -b`, `bun run lint` verdes; `grep -rn ProfileForm src` vazio.
- [ ] **Step 5: Commit** — `git commit -m "feat: montagem em 5 passos e perfil completo nos ajustes"`

---

### Task 6: Lógica do check-in semanal

**Files:**
- Create: `src/evolution/checkIn.ts`, `src/evolution/checkIn.test.ts`
- Modify: `src/lib/date.ts`

**Interfaces:**
- Produces:
  - `WEEKDAY_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']` em `src/lib/date.ts`
  - `checkInDue(settings: Settings, measurements: Measurement[], today: string): string | undefined` — devolve a data do check-in pendente
  - `interface WeekSummary { week: number; weight: number; sincePrev?: number; sinceStart?: number; rows: { label: string; unit: string; delta: number; good: boolean }[]; photos: number }`
  - `weekSummary(profile: Profile, measurements: Measurement[], photoSets: PhotoSet[], today: string): WeekSummary | undefined` (undefined sem peso hoje)

Regras:
- `checkInDue`: sem `checkInDay` ou sem nenhuma medição com peso → `undefined`. `d = addDays(weekStart(today), checkInDay)`; se `d > today`, `d = addDays(d, -7)`. Pendente (devolve `d`) se nenhuma medição com peso tem `date >= d`.
- `weekSummary`: `week = max(1, round(daysBetween(primeiro peso, today) / 7))`; `sincePrev` = peso de hoje − peso da medição anterior com peso; `sinceStart` = peso de hoje − primeiro peso (undefined se for o mesmo dia); `rows` = gordura (`fatSeries`, rótulo "Gordura", unidade "pt") e cada campo de `FIELDS` exceto peso que tem valor hoje e numa medição anterior, delta contra a anterior, `good = isGood(key, goalDirection(profile), delta)`; só deltas ≠ 0; `photos` = ângulos preenchidos no `PhotoSet` de hoje.

- [ ] **Step 1: Testes**

```ts
const s = (checkInDay?: number) => ({ lastTab: 'evolucao', onboardingDone: true, checkInDay }) as Settings
const m = (date: string, weightKg?: number) => ({ id: date, date, weightKg })
// 2026-11-18 é quarta (3)
test('antes do dia da semana: não pendente se fez na semana passada', () => expect(checkInDue(s(5), [m('2026-11-13', 80)], '2026-11-18')).toBeUndefined())
test('no dia: pendente', () => expect(checkInDue(s(3), [m('2026-11-11', 80)], '2026-11-18')).toBe('2026-11-18'))
test('depois do dia sem registrar: pendente com a data do dia', () => expect(checkInDue(s(1), [m('2026-11-09', 80)], '2026-11-18')).toBe('2026-11-16'))
test('já registrou peso desde o dia: não pendente', () => expect(checkInDue(s(1), [m('2026-11-17', 80)], '2026-11-18')).toBeUndefined())
test('virada de semana: check-in perdido continua pendente', () => expect(checkInDue(s(5), [m('2026-11-06', 80)], '2026-11-18')).toBe('2026-11-13'))
test('medição só com medidas não conta', () => expect(checkInDue(s(3), [m('2026-11-11', 80), m('2026-11-18')], '2026-11-18')).toBe('2026-11-18'))
test('sem dia ou sem peso: nada', () => { expect(checkInDue(s(), [m('2026-11-01', 80)], '2026-11-18')).toBeUndefined(); expect(checkInDue(s(3), [], '2026-11-18')).toBeUndefined() })
test('resumo da semana', () => {
  const r = weekSummary({ sex: 'M', heightCm: 178, dietGoal: 'perder' }, [{ id: 'a', date: '2026-10-28', weightKg: 83.7, waistCm: 94 }, { id: 'b', date: '2026-11-11', weightKg: 82.4, waistCm: 93 }, { id: 'c', date: '2026-11-18', weightKg: 81.6, waistCm: 92 }], [{ id: 'p', date: '2026-11-18', frente: 'x', lado: 'y', costas: 'z' }], '2026-11-18')!
  expect(r).toMatchObject({ week: 3, weight: 81.6, photos: 3 })
  expect(r.sincePrev).toBeCloseTo(-0.8)
  expect(r.sinceStart).toBeCloseTo(-2.1)
  expect(r.rows).toEqual([expect.objectContaining({ label: 'Cintura', delta: -1, good: true })])
})
```

- [ ] **Step 2: Rodar e ver falhar** — `bun run test src/evolution/checkIn.test.ts` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Verificar** — teste verde.
- [ ] **Step 5: Commit** — `git commit -m "feat: regra do check-in semanal e resumo da semana"`

---

### Task 7: Cartões na Evolução, fluxo do check-in e ponto na navegação

**Files:**
- Create: `src/evolution/CheckIn.tsx`, `src/evolution/CheckIn.test.tsx`
- Modify: `src/evolution/EvolutionTab.tsx`, `src/evolution/EvolutionTab.test.tsx`, `src/shell/BottomNav.tsx`, `src/shell/BottomNav.test.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `AnamnesisFlow total={3}` (Task 4); `checkInDue`, `weekSummary`, `WEEKDAY_LONG` (Task 6); `MeasureForm` (Task 4); `PhotoCapture`; `Delta`; `PhotoCompare`
- Produces:
  - `CheckIn({ onClose }: { onClose: () => void })` — tela cheia: passo `medidas` (`BackHeader` "Atualizar semana" + `MeasureForm needWeight submitLabel="Continuar"` gravando a medição de hoje) → `PhotoCapture` de hoje (fechar = pular) → resumo
  - `BottomNav({ tab, onChange, dot }: { …; dot?: Tab })` — bolinha `bg-accent` no ícone da aba `dot`; o `aria-label` vira `"{label}, atualização pendente"`

Copy exata:
- Cartão anamnese (topo da Evolução, também no estado vazio, quando `!settings.anamnesisAt`): título "Complete sua anamnese", texto "3 passos rápidos. O que você já respondeu vem preenchido.", botão "Completar", botão × com `aria-label="Dispensar"` que grava `anamnesisAt = today`. "Completar" abre `AnamnesisFlow total={3}` em tela cheia com `onBack` fechando.
- Cartão check-in (quando `checkInDue` devolve data e não há cartão de anamnese): título "Atualizar semana", texto `Hoje é ${WEEKDAY_LONG[d]}, seu dia de atualizar.` se a data é hoje, senão `Era ${WEEKDAY_LONG[d]}, seu dia de atualizar.`, botão "Atualizar".
- Resumo: título `Semana ${week}`, destaque `{formatSigned(sincePrev)} kg` com legenda `desde a semana passada · {formatKg(weight)} kg` (sem `sincePrev`: só o peso), linhas com `Delta`, linha "Fotos · {photos} de 3", `Desde o dia zero: {formatSigned(sinceStart)} kg em {plural(week, 'semana', 'semanas')}.` quando houver, botões "Pronto" (fecha) e "Comparar fotos" (abre `PhotoCompare`). A cor do destaque segue `isGood('weightKg', goalDirection(profile), sincePrev)`.
- App: `dot={checkInDue(settings, measurements, today) ? 'evolucao' : undefined}` com `useToday()`.

- [ ] **Step 1: Testes**

```ts
test('cartão de anamnese aparece para quem não completou e some ao dispensar', async () => { /* settings sem anamnesisAt → "Complete sua anamnese"; clicar Dispensar → some e settings.anamnesisAt === today */ })
test('cartão de check-in no dia e fluxo até o resumo', async () => {
  /* settings { anamnesisAt, checkInDay: weekday(today) }, medição de 7 dias atrás 82,4 kg → "Hoje é {dia}, seu dia de atualizar." → Atualizar → Peso 81,6 → Continuar → fechar câmera → */
  expect(screen.getByText('−0,8 kg')).toBeInTheDocument()
  expect(screen.getByText(/desde a semana passada · 81,6 kg/)).toBeInTheDocument()
})
test('check-in atrasado diz "Era"', async () => { /* checkInDay = ontem */ expect(screen.getByText(/^Era /)).toBeInTheDocument() })
test('ponto na aba Evolução', async () => { /* BottomNav dot="evolucao" */ expect(screen.getByRole('button', { name: 'Evolução, atualização pendente' })).toBeInTheDocument() })
```

- [ ] **Step 2: Rodar e ver falhar** — `bun run test src/evolution src/shell` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Verificar** — `bun run test`, `bunx tsc -b`, `bun run lint`, `bun run build` verdes.
- [ ] **Step 5: Commit** — `git commit -m "feat: check-in semanal e cartão de anamnese na evolução"`

---

### Task 8: Conferência visual e grafo

**Files:**
- Nenhum código novo, salvo correções que a conferência achar.

- [ ] **Step 1:** `bun run dev`, abrir no Playwright em 390×844 e passar pelas 8 telas do mockup (`docs/design/anamnese.html`): montagem 1–5 com IndexedDB limpo; cartão de anamnese com dados antigos semeados (perfil com `weightKg` e `anamnesis.goal`); check-in no dia; resumo. Comparar com o mockup lado a lado (espaçamentos, copy, estados ativos dos chips).
- [ ] **Step 2:** Conferir as telas que já existiam e foram tocadas: Evolução com dados (cores de delta com `perder` e com `manter`), gaveta de medidas, Gerar com IA do treino e da dieta (campos removidos), Ajustes → Perfil.
- [ ] **Step 3:** Corrigir o que divergir, com teste quando for lógica.
- [ ] **Step 4:** `graphify update .`; `bun run test && bunx tsc -b && bun run lint && bun run build` verdes. Fechar o navegador e apagar os arquivos `.playwright-mcp/` criados.
- [ ] **Step 5: Commit** (se houve correção) — `git commit -m "fix: ajustes da conferência visual da anamnese"`
