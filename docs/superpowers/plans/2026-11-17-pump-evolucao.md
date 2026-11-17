# Pump — Evolução, fotos, conquistas e PDF — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tirar a aba Evolução do "em breve". Entram peso, medidas e % de gordura com gráfico, fotos de frente, lado e costas com comparação, conquistas, histórico em calendário, PDF de evolução e o botão "Enviar backup".

**Architecture:**
- **Dados:** as medidas e os registros de fotos viram chaves novas do `usePersisted` (`measurements`, `photoSets`). Cada foto fica numa chave própria do IndexedDB (`photo:<id>`), que entra no backup.
- **Conquistas:** são calculadas por uma função pura. Só fica guardado o que já foi comemorado (`settings.seenAchievements`).
- **Telas novas:** ficam em `src/evolution/`, com o mesmo padrão do redesign. As subtelas abrem no overlay usado nas Configurações.
- **PDF:** sai do `@react-pdf/renderer`, carregado com `import()` só quando a pessoa gera.

**Tech Stack:** o que já existe (React 19, Vite 8, TS, bun, vitest, idb-keyval, Tailwind v4 + shadcn, sonner, lucide), mais `@react-pdf/renderer` 4.x (só em chunk separado).

**Spec:** [`docs/superpowers/specs/2026-11-17-pump-evolucao-design.md`](../specs/2026-11-17-pump-evolucao-design.md) · **Mockup:** [`docs/design/evolucao-e-pdf.html`](../../design/evolucao-e-pdf.html)

## Global Constraints

- **Visual:** padrão do redesign (tokens do Yield em `src/index.css`, shadcn em `src/components/ui`), pt-BR, só tema escuro, ícones lucide, sem emojis.
- **Toque e campos:** alvos de pelo menos 44px, e todo `<input>` com texto de 16px ou mais.
- **Rolagem:** sem barras visíveis.
- **Dados:** toda gravação usa o `usePersisted` com função que parte do último valor salvo. Nunca copiar dado salvo pra estado local antes de `loaded`.
- **Backup:** continua na versão 1. Aceita `measurements`, `photoSets` e chaves `photo:<id>` cujo valor seja uma string iniciada por `data:image/`. Backups antigos continuam válidos.
- **Fórmula de gordura** (cm, `log10`), com 1 casa:
  - masculino: `495/(1.0324 − 0.19077·log10(cintura−pescoço) + 0.15456·log10(altura)) − 450 + 2`;
  - feminino: `495/(1.29579 − 0.35004·log10(cintura+quadril−pescoço) + 0.221·log10(altura)) − 450`.
- **Direção de "melhorou"** pelo objetivo da anamnese:
  - hipertrofia ou força: subir é bom em peso, braço, peito e coxa;
  - emagrecer, saúde ou sem objetivo: descer é bom em peso, cintura e quadril;
  - gordura descendo é sempre bom.
- **PDF:** fora do chunk principal. O carregamento inicial não pode crescer mais que 5 KB gzip por causa dele.
- **Commits:** em inglês, no formato Conventional Commits, com o assunto em até 72 caracteres, **sem Co-Authored-By e sem rodapé**.
- **Push:** nada de push. Push na `main` publica, e por isso só se faz com OK do Yago.

## Review Focus

1. **Foto que falha ao salvar** (cota ou modo privado): nenhum registro aponta pra foto inexistente, e o erro aparece. Teste na Task 4.
2. **Câmera negada ou sem suporte** (`navigator.mediaDevices` ausente): a tela abre só com a Galeria e um aviso. Teste na Task 4.
3. **Perfil sem altura** (montagem pulada): a gordura mostra "—", sem quebrar, e o PDF pula a gordura. Testes nas Tasks 1, 3 e 6.
4. **Sem plano ou plano sem dias:** o cálculo de sequência não trava e conta os dias treinados. Teste na Task 2.
5. **Restaurar backup com fotos traz as imagens de volta.** Num backup antigo sem as fotos, o registro mostra um espaço vazio no lugar da foto, sem quebrar. Testes nas Tasks 1 e 4.

---

## Estrutura de arquivos

```
src/types.ts                         Measurement, PhotoSet, Angle, chaves novas
src/storage/photos.ts                savePhoto, loadPhoto, deletePhotos (chaves photo:<id>)
src/storage/backup.ts                aceita photo:<id> e as chaves novas
src/components/Overlay.tsx           overlay de subtela (movido de SettingsScreen)
src/evolution/bodyFat.ts             bodyFat, goalDirection
src/evolution/measurements.ts        upsertMeasurement, firstLast, nearest
src/evolution/photoSets.ts           setAngle, removeSet
src/evolution/resize.ts              fitWithin, fileToJpeg, videoToJpeg
src/evolution/achievements.ts        computeAchievements, ACHIEVEMENTS
src/evolution/useAchievementToasts.ts comemoração no App
src/evolution/EvolutionTab.tsx       tela principal da aba
src/evolution/LineChart.tsx          gráfico SVG
src/evolution/MeasureDrawer.tsx      gaveta de medidas
src/evolution/PhotoCapture.tsx       câmera/galeria
src/evolution/PhotoCompare.tsx       comparar
src/evolution/AchievementsScreen.tsx estante
src/evolution/HistoryScreen.tsx      calendário + detalhe do dia + apagar
src/evolution/report.ts              buildReport (dados do PDF)
src/evolution/pdf/ReportDocument.tsx documento react-pdf
src/evolution/pdf/generate.ts        generatePdf, sharePdf
```

## Tasks

### Task 1: Dados, gordura, medidas, fotos no IndexedDB e backup

**Files:**
- Create: `src/evolution/bodyFat.ts`, `src/evolution/measurements.ts`, `src/evolution/photoSets.ts`, `src/storage/photos.ts`, `src/evolution/resize.ts`
- Modify: `src/types.ts`, `src/storage/backup.ts`
- Test: `src/evolution/bodyFat.test.ts`, `src/evolution/measurements.test.ts`, `src/evolution/photoSets.test.ts`, `src/storage/photos.test.ts`, `src/storage/backup.test.ts`

**Interfaces:**
- Produces:
  - Em `types.ts`:
    ```ts
    export type Angle = 'frente' | 'lado' | 'costas'
    export interface MeasureFields { weightKg?: number; neckCm?: number; waistCm?: number; hipCm?: number; armCm?: number; chestCm?: number; thighCm?: number }
    export interface Measurement extends MeasureFields { id: string; date: string }
    export interface PhotoSet { id: string; date: string; frente?: string; lado?: string; costas?: string }   // valores = id da foto
    ```
    - `UserData` ganha `measurements: Measurement[]` e `photoSets: PhotoSet[]`.
    - `USER_KEYS` ganha `'measurements'` e `'photoSets'`.
    - `Settings` ganha `seenAchievements?: string[]`.
  - `bodyFat(sex: Sex, heightCm: number, m: MeasureFields): number | null` e `goalDirection(p?: Profile): 'gain' | 'loss'`. `hipertrofia` e `forca` dão `'gain'`, o resto dá `'loss'`.
  - `upsertMeasurement(list: Measurement[], date: string, fields: { [K in keyof MeasureFields]?: number | null }): Measurement[]`:
    - junta campo a campo no registro da data;
    - `null` remove o campo;
    - um registro sem nenhum campo sai da lista;
    - o resultado fica ordenado por `date`;
    - o id é novo (`crypto.randomUUID()`) só quando a data ainda não existe.
  - `firstLast(list: Measurement[], key: keyof MeasureFields): { first?: { date: string; value: number }; last?: { date: string; value: number } }`.
  - `nearest(list: Measurement[], date: string, key): number | undefined` devolve o valor da medida com data mais próxima, preferindo `<=`.
  - `setAngle(sets: PhotoSet[], date: string, angle: Angle, photoId: string): { sets: PhotoSet[]; replaced?: string }` e `removeSet(sets: PhotoSet[], id: string): { sets: PhotoSet[]; photoIds: string[] }`.
  - `savePhoto(dataUrl: string): Promise<string>` grava `photo:<uuid>` com o idb-keyval (`set`) e devolve o id. Se falhar, dispara `pump:storage-error` e relança.
  - `loadPhoto(id): Promise<string | undefined>` e `deletePhotos(ids: string[]): Promise<void>` (com `delMany`).
  - `fitWithin(w: number, h: number, max = 1280): { w: number; h: number }`.
  - `fileToJpeg(file: File): Promise<string>` e `videoToJpeg(video: HTMLVideoElement, mirror: boolean): Promise<string>`: canvas, `fitWithin`, `toDataURL('image/jpeg', 0.8)`. Não têm teste unitário, porque o jsdom não tem canvas.
  - `parseBackup` passa a aceitar a chave `photo:<id>` com uma string que começa com `data:image/`. Qualquer outro valor nessas chaves dá "Backup com conteúdo desconhecido". `measurements` e `photoSets`, quando vierem, precisam ser arrays (senão, "Backup corrompido").

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('bodyFat masculino e feminino (fórmula do gorgonoid)', () => {
  expect(bodyFat('M', 178, { neckCm: 38, waistCm: 85 })).toBe(18.4)
  expect(bodyFat('F', 165, { neckCm: 32, waistCm: 70, hipCm: 95 })).toBe(24.9)
})
test('bodyFat sem dado ou inválido é null', () => {
  expect(bodyFat('M', 0, { neckCm: 38, waistCm: 85 })).toBeNull()       // perfil sem altura
  expect(bodyFat('M', 178, { waistCm: 85 })).toBeNull()
  expect(bodyFat('M', 178, { neckCm: 90, waistCm: 85 })).toBeNull()    // cintura − pescoço ≤ 0
  expect(bodyFat('F', 165, { neckCm: 32, waistCm: 70 })).toBeNull()    // falta quadril
})
test('goalDirection', () => {
  expect(goalDirection({ sex: 'M', heightCm: 1, weightKg: 1, anamnesis: { goal: 'hipertrofia' } })).toBe('gain')
  expect(goalDirection({ sex: 'M', heightCm: 1, weightKg: 1 })).toBe('loss')
})
test('upsertMeasurement junta no mesmo dia, null remove e registro vazio some', () => {
  let l = upsertMeasurement([], '2026-11-17', { weightKg: 80, neckCm: 38 })
  l = upsertMeasurement(l, '2026-11-17', { waistCm: 85 })
  expect(l).toHaveLength(1)
  expect(l[0]).toMatchObject({ date: '2026-11-17', weightKg: 80, neckCm: 38, waistCm: 85 })
  l = upsertMeasurement(l, '2026-11-17', { neckCm: null })
  expect(l[0].neckCm).toBeUndefined()
  l = upsertMeasurement(l, '2026-11-10', { weightKg: 81 })
  expect(l.map((m) => m.date)).toEqual(['2026-11-10', '2026-11-17'])
  expect(upsertMeasurement(l, '2026-11-10', { weightKg: null }).map((m) => m.date)).toEqual(['2026-11-17'])
})
test('firstLast e nearest', () => {
  const l = [{ id: 'a', date: '2026-11-01', weightKg: 80 }, { id: 'b', date: '2026-11-10', waistCm: 84 }, { id: 'c', date: '2026-11-17', weightKg: 78.4 }]
  expect(firstLast(l, 'weightKg')).toEqual({ first: { date: '2026-11-01', value: 80 }, last: { date: '2026-11-17', value: 78.4 } })
  expect(nearest(l, '2026-11-12', 'weightKg')).toBe(80)
})
test('setAngle substitui o ângulo do mesmo dia e devolve a foto antiga', () => {
  let r = setAngle([], '2026-11-17', 'frente', 'p1')
  r = setAngle(r.sets, '2026-11-17', 'frente', 'p2')
  expect(r.replaced).toBe('p1')
  expect(r.sets).toHaveLength(1)
  expect(r.sets[0].frente).toBe('p2')
  expect(removeSet(r.sets, r.sets[0].id)).toEqual({ sets: [], photoIds: ['p2'] })
})
test('savePhoto/loadPhoto/deletePhotos', async () => {
  const id = await savePhoto('data:image/jpeg;base64,AAA')
  expect(await loadPhoto(id)).toBe('data:image/jpeg;base64,AAA')
  await deletePhotos([id]); expect(await loadPhoto(id)).toBeUndefined()
})
test('fitWithin', () => {
  expect(fitWithin(4032, 3024)).toEqual({ w: 1280, h: 960 })
  expect(fitWithin(800, 600)).toEqual({ w: 800, h: 600 })
})
// backup.test.ts
test('backup com fotos: ida e volta traz a imagem', async () => {
  const id = await savePhoto('data:image/jpeg;base64,BBB')
  await save('photoSets', [{ id: 's', date: '2026-11-17', frente: id }])
  const b = buildBackup(await allData(), new Date())
  await replaceAll({}); expect(await loadPhoto(id)).toBeUndefined()
  await importBackupFile(new File([JSON.stringify(b)], 'b.json'))
  expect(await loadPhoto(id)).toBe('data:image/jpeg;base64,BBB')
})
test('backup recusa photo: com valor que não é imagem', () =>
  expect(() => parseBackup(JSON.stringify({ app: 'pump', version: 1, data: { 'photo:x': 'oi' } }))).toThrow('Backup com conteúdo desconhecido'))
```

Antes de cada teste de storage, usar o mesmo `beforeEach` dos testes de storage atuais (`clear()` + `resetStoreForTests()`).

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `bun run test` (exit 0), `bun run build` e `bun run lint`.
- [ ] **Step 5:** Commit `feat(evolution): measurements, photo sets, body fat and backup support`.

---

### Task 2: Conquistas e comemoração

**Files:**
- Create: `src/evolution/achievements.ts`, `src/evolution/useAchievementToasts.ts`
- Modify: `src/App.tsx` (monta o hook uma vez, no layout principal)
- Test: `src/evolution/achievements.test.ts`, `src/evolution/useAchievementToasts.test.tsx`

**Interfaces:**
- Consumes: `bodyFat`, `goalDirection`, `firstLast` (Task 1); `weekday`, `todayKey` (`src/lib/date.ts`); tipos.
- Produces:
  - `interface Achievement { id: AchievementId; title: string; earnedAt?: string; progress?: string }`
  - `type AchievementId = 'first-workout' | 'streak-3' | 'streak-7' | 'streak-30' | 'workouts-10' | 'workouts-50' | 'workouts-100' | 'record' | 'first-photo' | 'weight-small' | 'weight-big' | 'fat-1'`. A ordem fixa é essa.
  - `computeAchievements(d: { workoutLog: WorkoutLog; workoutPlan: WorkoutPlan; measurements: Measurement[]; photoSets: PhotoSet[]; profile?: Profile }, today: string): Achievement[]`
  - **Títulos:**
    - "Primeiro treino";
    - "3 treinos seguidos", "7 treinos seguidos", "30 treinos seguidos";
    - "10 treinos", "50 treinos", "100 treinos";
    - "Recorde de carga";
    - "Primeira foto";
    - peso: com direção `loss`, "−1 kg" e "−5 kg"; com `gain`, "+1 kg" e "+3 kg";
    - "−1 ponto de gordura".
  - **Progresso das bloqueadas:**
    - treinos e sequências: `"falta N"`;
    - peso: `"falta X kg"`, com `formatKg`;
    - as outras: `undefined`.
  - **Regras** (spec §6.4):
    - **treino concluído** = sessão com `completedAt`;
    - **sequência:** percorrer os dias do primeiro treino concluído até `today`:
      - treino concluído soma +1;
      - um dia previsto no plano **atual** sem treino concluído, antes de `today`, zera;
      - um dia não previsto e sem treino não muda nada;
    - `earnedAt` é a primeira data em que a contagem chegou a N;
    - **recorde:** a primeira data em que uma sessão concluída tem, num `exerciseId` que já aparecia numa sessão concluída anterior, uma carga maior que o máximo anterior desse exercício;
    - **peso e gordura:** comparam com a primeira pesagem e o primeiro cálculo, ao longo das medidas em ordem.
  - `useAchievementToasts(): void`:
    - lê `workoutLog`, `workoutPlan`, `measurements`, `photoSets`, `profile` e `settings` via `usePersisted` e espera todos carregarem;
    - quando `settings.seenAchievements` é `undefined`, grava todas as ganhas como vistas, **sem** toast;
    - depois disso, cada ganha que não está na lista vira `toast('Conquista: {título}')` e entra na lista (função que parte do último valor salvo).

- [ ] **Step 1: Escrever os testes que falham**

```ts
const done = (date: string, sets: { id: string; kg: number }[] = []) => ({ date, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: `${date}T19:00:00.000Z`, exercises: sets.map((s) => ({ ...pe({ exerciseId: s.id, name: s.id }), sets: [{ reps: '10', weightKg: s.kg }] })) })
const plan = (weekdays: number[]) => ({ workouts: [{ id: 'a', label: 'A', name: 'A', weekdays, exercises: [] }] })
const get = (list: Achievement[], id: AchievementId) => list.find((a) => a.id === id)!

test('sequência: folga não quebra, falta em dia previsto quebra', () => {
  // plano seg/qua/sex; 2026-11-16 é segunda
  const log = { '2026-11-16': done('2026-11-16'), '2026-11-18': done('2026-11-18'), '2026-11-20': done('2026-11-20') }
  const a = computeAchievements({ workoutLog: log, workoutPlan: plan([1, 3, 5]), measurements: [], photoSets: [] }, '2026-11-22')
  expect(get(a, 'streak-3').earnedAt).toBe('2026-11-20')
  const log2 = { '2026-11-16': done('2026-11-16'), '2026-11-20': done('2026-11-20'), '2026-11-23': done('2026-11-23') } // faltou qua 18
  expect(get(computeAchievements({ workoutLog: log2, workoutPlan: plan([1, 3, 5]), measurements: [], photoSets: [] }, '2026-11-24'), 'streak-3').earnedAt).toBeUndefined()
})
test('sem plano: conta só os dias treinados, sem travar', () => {
  const log = { '2026-11-16': done('2026-11-16'), '2026-11-17': done('2026-11-17'), '2026-11-19': done('2026-11-19') }
  const a = computeAchievements({ workoutLog: log, workoutPlan: { workouts: [] }, measurements: [], photoSets: [] }, '2026-11-20')
  expect(get(a, 'streak-3').earnedAt).toBe('2026-11-19')
  expect(get(a, 'first-workout').earnedAt).toBe('2026-11-16')
  expect(get(a, 'workouts-10').progress).toBe('falta 7')
})
test('recorde só depois de já existir o exercício', () => {
  const log = { '2026-11-16': done('2026-11-16', [{ id: 'Supino', kg: 40 }]), '2026-11-18': done('2026-11-18', [{ id: 'Supino', kg: 40 }]), '2026-11-20': done('2026-11-20', [{ id: 'Supino', kg: 42.5 }]) }
  expect(get(computeAchievements({ workoutLog: log, workoutPlan: plan([]), measurements: [], photoSets: [] }, '2026-11-21'), 'record').earnedAt).toBe('2026-11-20')
})
test('peso: direção pelo objetivo', () => {
  const ms = [{ id: '1', date: '2026-11-01', weightKg: 80 }, { id: '2', date: '2026-11-15', weightKg: 78.8 }]
  const loss = computeAchievements({ workoutLog: {}, workoutPlan: plan([]), measurements: ms, photoSets: [] }, '2026-11-16')
  expect(get(loss, 'weight-small')).toMatchObject({ title: '−1 kg', earnedAt: '2026-11-15' })
  expect(get(loss, 'weight-big').progress).toBe('falta 3,8 kg')
  const gain = computeAchievements({ workoutLog: {}, workoutPlan: plan([]), measurements: ms, photoSets: [], profile: { sex: 'M', heightCm: 178, weightKg: 80, anamnesis: { goal: 'hipertrofia' } } }, '2026-11-16')
  expect(get(gain, 'weight-small')).toMatchObject({ title: '+1 kg', earnedAt: undefined })
})
test('primeira foto e gordura −1 ponto', () => {
  const ms = [{ id: '1', date: '2026-11-01', neckCm: 38, waistCm: 88 }, { id: '2', date: '2026-11-20', neckCm: 38, waistCm: 85 }]
  const a = computeAchievements({ workoutLog: {}, workoutPlan: plan([]), measurements: ms, photoSets: [{ id: 's', date: '2026-11-03', frente: 'p' }], profile: { sex: 'M', heightCm: 178, weightKg: 80 } }, '2026-11-21')
  expect(get(a, 'first-photo').earnedAt).toBe('2026-11-03')
  expect(get(a, 'fat-1').earnedAt).toBe('2026-11-20')
})
```

Em `useAchievementToasts.test.tsx`:
- **primeira vez:** com um treino concluído salvo e `seenAchievements` indefinido, renderizar o hook (em `renderHook`) não chama `toast` e grava `seenAchievements` contendo `'first-workout'`;
- **conquista nova:** com `seenAchievements: []` e um treino concluído, `toast` é chamado com `'Conquista: Primeiro treino'` uma vez só, mesmo depois de um novo render.

Mockar o `toast` com `vi.mock('sonner', …)`.

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar. Montar `useAchievementToasts()` no `App` (layout principal, não nas telas de montagem e de erro).
- [ ] **Step 4:** Rodar `bun run test` (exit 0), `bun run build` e `bun run lint`.
- [ ] **Step 5:** Commit `feat(evolution): achievements and celebration toasts`.

---

### Task 3: Aba Evolução, gráfico, gaveta de medidas e "Enviar backup"

**Files:**
- Create: `src/components/Overlay.tsx` (move o `Overlay` de `SettingsScreen` e atualiza os imports em `SettingsScreen.tsx` e `TreinoTab.tsx`), `src/evolution/EvolutionTab.tsx`, `src/evolution/LineChart.tsx`, `src/evolution/MeasureDrawer.tsx`
- Modify: `src/App.tsx` (a aba evolução usa `EvolutionTab` no lugar de `ComingSoon`), `src/shell/SettingsScreen.tsx` ("Enviar backup")
- Test: `src/evolution/EvolutionTab.test.tsx`, `src/App.test.tsx` (onde ele espera "Evolução chega em breve", trocar pela tela nova)

**Interfaces:**
- Consumes: Tasks 1 e 2 (`bodyFat`, `goalDirection`, `firstLast`, `upsertMeasurement`, `computeAchievements`), `sessionStats` (`src/workout/stats.ts`), `formatKg`/`parseDecimal`, `IconDot`, `EmptyState`, `Button`, `Drawer`.
- Produces:
  - `<LineChart points={{ date: string; value: number }[]} height?={96} />`: polyline em `var(--color-accent)` e linha de base, sem eixos. Com menos de 2 pontos, mostra "Registre mais um peso pra ver o gráfico".
  - `<MeasureDrawer open onClose date={string} />`:
    - abre já preenchida com os valores do dia, esperando o carregamento;
    - campos: Peso (kg), Pescoço, Cintura, Quadril (só se `profile.sex === 'F'`), Braço, Peito e Coxa (cm), com `inputmode="decimal"`, o `parseDecimal` e 16px;
    - mostra a gordura estimada ao vivo ("% de gordura (estimativa)" com o valor, ou "—");
    - "Salvar" grava `upsertMeasurement` (campo vazio vira `null`) e, se tiver peso, atualiza `profile.weightKg`, nas duas gravações com função que parte do último valor salvo. Depois fecha e mostra `toast('Medidas salvas')`.
  - `<EvolutionTab />`, conforme o mockup, tela 1:
    - **Rótulo de topo:** `Desde {formatDayLabel-like 'D mmm'} · {N} dias`, contando do primeiro registro (o primeiro de: treino concluído, medida, foto).
    - **Números de destaque:**
      - Peso: o último, com a diferença pro primeiro;
      - Gordura: o último cálculo, com a diferença em pontos;
      - Treinos: os concluídos, com a média por semana (com 1 casa: `"3,2/sem"`).
      - A diferença fica em `text-accent` quando melhorou (`goalDirection`) e em `text-text-2` quando não. Sem dado, "—".
    - **Cards:**
      - Peso: `LineChart`, com chips "30 d", "90 d" e "Tudo" (padrão 90 d);
      - Medidas: linhas `{rótulo}` com `{primeiro} → {último} {unidade}` e a diferença colorida, só das medidas que existem;
      - Fotos: as 3 miniaturas do último registro, "Comparar" e "Nova foto". Os dois abrem telas que entram na Task 4, então aqui chamam callbacks passados como props ou guardados em estado, sem implementar as telas;
      - Conquistas: até 4 ganhas e "Ver todas", que abre a tela da Task 5;
      - linha "Histórico", que abre a tela da Task 5.
    - **Botões fixos acima da barra de abas:**
      - "Registrar": abre uma gaveta com "Medidas" (que abre a `MeasureDrawer`) e "Fotos" (que abre a captura da Task 4);
      - "Gerar PDF": entra desabilitado com o título "Em breve" e é ligado na Task 6.
    - **Estado vazio** (sem medida, foto ou treino): `EmptyState` com o ícone `TrendingUp`, o título "Sua evolução começa aqui", o texto "Registre peso, medidas e fotos pra acompanhar." e o botão "Registrar".
  - **Configurações:** a linha vira o título "Enviar backup", com o ícone `Share2` e o subtítulo `WhatsApp, Arquivos… · {último}`. A ação continua sendo o `exportBackup`.

- [ ] **Step 1: Escrever os testes que falham**

```tsx
test('sem dados: estado vazio com Registrar', async () => {
  render(<EvolutionTab />)
  expect(await screen.findByRole('heading', { name: 'Sua evolução começa aqui' })).toBeInTheDocument()
})
test('registrar medidas com vírgula atualiza peso, gordura e perfil', async () => {
  const user = userEvent.setup()
  await save('profile', { sex: 'M', heightCm: 178, weightKg: 80 })
  render(<EvolutionTab />)
  await user.click(await screen.findByRole('button', { name: 'Registrar' }))
  await user.click(await screen.findByRole('button', { name: 'Medidas' }))
  await user.type(await screen.findByLabelText('Peso'), '78,4')
  await user.type(screen.getByLabelText('Pescoço'), '38')
  await user.type(screen.getByLabelText('Cintura'), '85')
  expect(screen.getByText('18,4%')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  await waitFor(async () => expect((await load('profile'))?.weightKg).toBe(78.4))
  expect((await load('measurements'))?.[0]).toMatchObject({ weightKg: 78.4, neckCm: 38, waistCm: 85 })
})
test('perfil sem altura: gordura mostra —', async () => {
  await save('profile', { sex: 'M', heightCm: 0, weightKg: 0 })
  await save('measurements', [{ id: 'a', date: '2026-11-17', neckCm: 38, waistCm: 85, weightKg: 80 }])
  render(<EvolutionTab />)
  expect(await screen.findByText('Gordura')).toBeInTheDocument()
  expect(screen.getAllByText('—').length).toBeGreaterThan(0)
})
test('diferença de peso verde quando o objetivo é emagrecer e o peso caiu', async () => {
  await save('measurements', [{ id: 'a', date: '2026-11-01', weightKg: 80 }, { id: 'b', date: '2026-11-17', weightKg: 78.4 }])
  render(<EvolutionTab />)
  expect(await screen.findByText('−1,6 kg')).toHaveClass('text-accent')
})
```

Também ajustar o `App.test.tsx`: abrir a aba Evolução mostra o estado vazio novo.

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `bun run test` (exit 0), `bun run build` e `bun run lint`.
- [ ] **Step 5:** Commit `feat(evolution): evolution tab, weight chart, measures drawer and share backup`.

---

### Task 4: Fotos (captura e comparação)

**Files:**
- Create: `src/evolution/PhotoCapture.tsx`, `src/evolution/PhotoCompare.tsx`, `src/evolution/usePhoto.ts`
- Modify: `src/evolution/EvolutionTab.tsx` (liga "Nova foto", "Fotos" do Registrar e "Comparar")
- Test: `src/evolution/PhotoCapture.test.tsx`, `src/evolution/PhotoCompare.test.tsx`

**Interfaces:**
- Consumes: `savePhoto`, `loadPhoto`, `deletePhotos`, `setAngle`, `fileToJpeg`, `videoToJpeg`, `nearest`, `Overlay`.
- Produces:
  - `usePhoto(id?: string): string | undefined` carrega o data URL da foto. Pra id inexistente devolve `undefined`.
  - `<PhotoCapture date={string} onClose />` (overlay):
    - **Abas:** Frente, Lado e Costas.
    - **Câmera:** usa `navigator.mediaDevices?.getUserMedia({ video: { facingMode } })`, com troca entre `'user'` e `'environment'` (padrão `'user'`, espelhada) e a silhueta-guia em SVG por cima.
    - **Disparo:** botão "Tirar foto" (`aria-label`). O botão "Temporizador 5 s" é alternável. Com ele ligado, mostra a contagem 5…1 e dispara.
    - **Galeria:** um input de arquivo `accept="image/*"` com `aria-label="Escolher da galeria"`.
    - **Pular:** vai pro próximo ângulo.
    - **Depois de capturar:** mostra a prévia com "Usar" e "Refazer". "Usar" faz `savePhoto` e só depois `setAngle` via `usePersisted('photoSets')` (função que parte do último valor salvo), apaga a foto substituída (`deletePhotos([replaced])`) e avança.
    - **Se `savePhoto` falhar:** nenhum `photoSet` é gravado, e aparece `toast.error('Não consegui salvar a foto')`.
    - **Sem `mediaDevices` ou permissão negada:** esconde a câmera e mostra o aviso "Câmera indisponível — escolha da galeria."
    - **Ao fechar:** para todas as tracks do stream.
  - `<PhotoCompare onClose />` (overlay):
    - abas de ângulo e duas imagens lado a lado (`usePhoto`), com a etiqueta da data, a mais recente com `bg-accent`;
    - foto ausente vira um bloco `bg-surface` com o ícone `ImageOff`;
    - chips `Antes: {data}` e `Depois: {data}`, que abrem uma gaveta com a lista de registros;
    - o padrão é o primeiro contra o último;
    - abaixo, as linhas Peso, Cintura e Gordura comparando `nearest` de cada data, com a diferença colorida pela direção.

- [ ] **Step 1: Escrever os testes que falham**

```tsx
beforeEach(() => { vi.spyOn(resize, 'fileToJpeg').mockResolvedValue('data:image/jpeg;base64,FAKE') })
test('sem câmera: só galeria com aviso; foto da galeria salva frente e avança pra lado', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
  const user = userEvent.setup()
  render(<PhotoCapture date="2026-11-17" onClose={vi.fn()} />)
  expect(await screen.findByText('Câmera indisponível — escolha da galeria.')).toBeInTheDocument()
  await user.upload(screen.getByLabelText('Escolher da galeria'), new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
  await user.click(await screen.findByRole('button', { name: 'Usar' }))
  await waitFor(async () => expect((await load('photoSets'))?.[0].frente).toBeTruthy())
  expect(screen.getByRole('tab', { name: 'Lado', selected: true })).toBeInTheDocument()
})
test('falha ao salvar a foto não cria registro', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
  vi.spyOn(photos, 'savePhoto').mockRejectedValue(new Error('quota'))
  const user = userEvent.setup()
  render(<PhotoCapture date="2026-11-17" onClose={vi.fn()} />)
  await user.upload(await screen.findByLabelText('Escolher da galeria'), new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
  await user.click(await screen.findByRole('button', { name: 'Usar' }))
  await waitFor(() => expect(photos.savePhoto).toHaveBeenCalled())
  expect((await load('photoSets')) ?? []).toHaveLength(0)
})
test('comparar: primeiro × último e foto ausente vira espaço vazio', async () => {
  const id = await savePhoto('data:image/jpeg;base64,AAA')
  await save('photoSets', [{ id: 's1', date: '2026-11-01', frente: 'nao-existe' }, { id: 's2', date: '2026-11-17', frente: id }])
  render(<PhotoCompare onClose={vi.fn()} />)
  expect(await screen.findByText('Antes: 1 nov')).toBeInTheDocument()
  expect(screen.getByText('Depois: 17 nov')).toBeInTheDocument()
  expect(await screen.findByLabelText('Foto indisponível')).toBeInTheDocument()
})
```

As abas usam `role="tab"`/`aria-selected`. A foto ausente tem `aria-label="Foto indisponível"`. As datas usam `'D mmm'` (ex.: "1 nov").

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar. A câmera real é conferida na Task 7, porque o jsdom não tem.
- [ ] **Step 4:** Rodar `bun run test` (exit 0), `bun run build` e `bun run lint`.
- [ ] **Step 5:** Commit `feat(evolution): progress photos capture and compare`.

---

### Task 5: Estante de conquistas e histórico (com apagar registros)

**Files:**
- Create: `src/evolution/AchievementsScreen.tsx`, `src/evolution/HistoryScreen.tsx`
- Modify: `src/evolution/EvolutionTab.tsx` (liga "Ver todas" e "Histórico")
- Test: `src/evolution/HistoryScreen.test.tsx`, `src/evolution/AchievementsScreen.test.tsx`

**Interfaces:**
- Consumes: `computeAchievements`, `upsertMeasurement`, `removeSet`, `deletePhotos`, `sessionStats`, `AlertDialog`, `Overlay`, `IconDot`.
- Produces:
  - `<AchievementsScreen onClose />`:
    - topo "Conquistas" com a etiqueta "{ganhas} de 12";
    - grade de 3 colunas;
    - ganha: quadrado `bg-accent-bg border-accent-line text-accent`, com o título e a data "D mmm";
    - bloqueada: `bg-surface text-border-strong`, com o título e o `progress`.
  - `<HistoryScreen onClose />`:
    - mês atual com ‹ › (`aria-label`s "Mês anterior" e "Próximo mês") e a grade de 7 colunas D S T Q Q S S;
    - dia com treino concluído: `bg-accent-bg`; dia com medida ou foto: um ponto; hoje: contorno;
    - tocar num dia mostra o detalhe:
      - treino: nome, `"{séries} séries · {volume} kg · {min} min"` via `sessionStats`;
      - medidas do dia, com o botão "Apagar medidas";
      - fotos do dia (miniaturas), com o botão "Apagar fotos";
    - os dois "Apagar" pedem confirmação no `AlertDialog`:
      - medidas: grava o `upsertMeasurement` com todos os campos `null`;
      - fotos: `removeSet` mais `deletePhotos(photoIds)`.

- [ ] **Step 1: Escrever os testes que falham**

```tsx
test('apagar fotos do dia remove o registro e as fotos', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 17, 12))
  const id = await savePhoto('data:image/jpeg;base64,AAA')
  await save('photoSets', [{ id: 's', date: '2026-11-17', frente: id }])
  const user = userEvent.setup()
  render(<HistoryScreen onClose={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: '17' }))
  await user.click(screen.getByRole('button', { name: 'Apagar fotos' }))
  await user.click(await screen.findByRole('button', { name: 'Apagar' }))
  await waitFor(async () => expect(await load('photoSets')).toEqual([]))
  expect(await loadPhoto(id)).toBeUndefined()
  vi.useRealTimers()
})
test('detalhe do dia mostra o treino concluído', async () => { /* workoutLog com sessão concluída em 2026-11-16 → texto "Peito e tríceps" e "séries" */ })
test('estante mostra ganhas e bloqueadas com progresso', async () => {
  await save('workoutLog', { '2026-11-16': { date: '2026-11-16', workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: '2026-11-16T19:00:00.000Z', exercises: [] } })
  render(<AchievementsScreen onClose={vi.fn()} />)
  expect(await screen.findByText('1 de 12')).toBeInTheDocument()
  expect(screen.getByText('falta 9')).toBeInTheDocument()
})
```

Escrever por extenso o segundo teste (`detalhe do dia mostra o treino concluído`). Os dias do calendário são botões com o número como nome acessível.

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `bun run test` (exit 0), `bun run build` e `bun run lint`.
- [ ] **Step 5:** Commit `feat(evolution): achievements shelf and history calendar`.

---

### Task 6: PDF de evolução

**Files:**
- Create: `src/evolution/report.ts`, `src/evolution/pdf/ReportDocument.tsx`, `src/evolution/pdf/generate.ts`
- Modify: `src/evolution/EvolutionTab.tsx` (liga "Gerar PDF"), `package.json` + `bun.lock` (`bun add @react-pdf/renderer`)
- Test: `src/evolution/report.test.ts`, `src/evolution/EvolutionTab.test.tsx` (fluxo do botão com o gerador mockado)

**Interfaces:**
- Consumes: Tasks 1 e 2, `sessionStats`, `formatKg`.
- Produces:
  - `buildReport(d: { workoutLog; workoutPlan; measurements; photoSets; profile? }, today: string): Report`:
    ```ts
    interface Report {
      period: { start: string; end: string; days: number }
      summary: { weightDelta?: number; fatDelta?: number; workouts: number; volumeTons: number }
      photoPairs: { angle: Angle; before: { date: string; id: string }; after: { date: string; id: string } }[]
      body: { weight: { date: string; value: number }[]; rows: { label: string; unit: string; first: number; last: number; delta: number; good: boolean }[] } | null
      training: { workouts: number; perWeek: number; topLifts: { name: string; first: number; max: number }[]; achievements: { title: string; earnedAt: string }[] }
    }
    ```
    - `period.start` é o primeiro registro (o primeiro de: treino concluído, medida, foto) e `end` é `today`. `days` conta os dois dias inclusive.
    - `photoPairs` usa o primeiro e o último registro de fotos (diferentes), por ângulo presente nos dois.
    - `body` é `null` sem medidas.
    - Na gordura, a linha só entra se der pra calcular no início e no fim.
    - `topLifts` traz as 5 maiores diferenças `max − first` por exercício, nas sessões concluídas.
    - `volumeTons` = Σ volume / 1000, com 1 casa.
  - `generatePdf(r: Report, photos: Record<string, string>): Promise<Blob>` faz `const { pdf } = await import('@react-pdf/renderer')`, renderiza o `ReportDocument` e devolve `toBlob()`.
  - `<ReportDocument report photos />` usa `Document`, `Page`, `View`, `Text`, `Image` e `Svg`/`Polyline` do react-pdf:
    - página A4 com fundo `#0b0c0d`, texto `#d6d8dd`, títulos brancos e destaque `#c6ff3d`;
    - rodapé "Gerado pelo Pump · {n}/{N}";
    - seções e conteúdo idênticos ao mockup (Capa, Antes e depois com 2 pares por página, Corpo com gráfico e a nota "% de gordura: estimativa (US Navy)", Treino);
    - seções sem dados são puladas.
  - `sharePdf(blob: Blob, filename: string): Promise<'shared' | 'downloaded' | 'cancelled'>` segue o mesmo padrão do `exportBackup` (`navigator.canShare` com arquivo, senão download, `AbortError` vira `'cancelled'`).
  - **Na aba:**
    - "Gerar PDF" passa a "Gerando…" (desabilitado), carrega as fotos dos `photoPairs` com `loadPhoto` e chama `generatePdf`;
    - ao terminar, o botão vira **"Compartilhar PDF"** e chama `sharePdf(blob, 'pump-evolucao-{today}.pdf')`;
    - se der erro, `toast.error('Não consegui gerar o PDF')`;
    - sem nenhum registro, o botão fica desabilitado.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('buildReport: período, resumo, pares de fotos e corpo', () => {
  const r = buildReport({
    workoutLog: { '2026-11-16': { date: '2026-11-16', workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: 'x', exercises: [{ ...pe({ exerciseId: 'Supino', name: 'Supino reto' }), sets: [{ reps: '10', weightKg: 40 }] }] },
                  '2026-12-01': { date: '2026-12-01', workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: 'x', exercises: [{ ...pe({ exerciseId: 'Supino', name: 'Supino reto' }), sets: [{ reps: '10', weightKg: 50 }] }] } },
    workoutPlan: { workouts: [] },
    measurements: [{ id: '1', date: '2026-11-15', weightKg: 80, neckCm: 38, waistCm: 88 }, { id: '2', date: '2026-12-10', weightKg: 78.4, neckCm: 38, waistCm: 85 }],
    photoSets: [{ id: 'a', date: '2026-11-15', frente: 'p1', lado: 'p2' }, { id: 'b', date: '2026-12-10', frente: 'p3' }],
    profile: { sex: 'M', heightCm: 178, weightKg: 78.4 },
  }, '2026-12-12')
  expect(r.period).toEqual({ start: '2026-11-15', end: '2026-12-12', days: 28 })
  expect(r.summary).toMatchObject({ weightDelta: -1.6, workouts: 2, volumeTons: 0.9 })
  expect(r.photoPairs).toEqual([{ angle: 'frente', before: { date: '2026-11-15', id: 'p1' }, after: { date: '2026-12-10', id: 'p3' } }])
  expect(r.training.topLifts[0]).toEqual({ name: 'Supino reto', first: 40, max: 50 })
  expect(r.body?.rows.find((x) => x.label === 'Peso')).toMatchObject({ first: 80, last: 78.4, delta: -1.6, good: true })
})
test('buildReport sem altura: sem linha de gordura e sem fatDelta', () => { /* profile heightCm 0 → summary.fatDelta undefined; rows sem 'Gordura' */ })
test('buildReport sem medidas: body null; sem fotos: photoPairs []', () => { /* … */ })
```

Escrever por extenso os dois últimos. No `EvolutionTab.test.tsx`:
- com `vi.mock('./pdf/generate', () => ({ generatePdf: vi.fn().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' })), sharePdf: vi.fn().mockResolvedValue('shared') }))` e uma medida salva:
  - clicar "Gerar PDF" mostra "Compartilhar PDF";
  - clicar "Compartilhar PDF" chama `sharePdf` com um nome que começa com `pump-evolucao-`;
- com `generatePdf` rejeitando, mostra o toast de erro.

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Rodar `bun add @react-pdf/renderer` e implementar. Gerar um PDF de verdade uma vez, com um script `bun -e` usando dados fictícios, e salvar em `.superpowers/evolucao-exemplo.pdf` (gitignored), pra conferir na Task 7.
- [ ] **Step 4:** Rodar `bun run test` (exit 0), `bun run build` e `bun run lint`. Na saída do build, conferir que o react-pdf ficou num chunk separado e que o JS inicial (index) cresceu no máximo 5 KB gzip em relação a antes da task. Anotar os dois números.
- [ ] **Step 5:** Commit `feat(evolution): evolution pdf report`.

---

### Task 7: Conferência visual e do PDF

**Files:**
- Modify: só ajustes de estilo e layout que a conferência apontar.

- [ ] **Step 1:** Rodar `bun run build && bunx vite preview`, guardar o PID e abrir `http://localhost:4173/pump/` no Playwright MCP, em 390×844.
- [ ] **Step 2:** Criar dados fictícios pela UI: montagem, dois treinos concluídos, medidas em duas datas (`browser_evaluate` pode trocar o `Date`) e fotos pela Galeria (`browser_file_upload` com uma imagem qualquer).
- [ ] **Step 3:** Fotografar e comparar com o mockup:
  1. Evolução
  2. Gaveta de medidas
  3. Nova foto (sem câmera no navegador headless, então aparece o aviso)
  4. Comparar
  5. Conquistas
  6. Histórico com o detalhe do dia
  7. Configurações com "Enviar backup"

  Corrigir as diferenças.
- [ ] **Step 4:** Conferir que nenhuma tela tem rolagem horizontal nem barra visível. Abrir o `.superpowers/evolucao-exemplo.pdf` (ou um gerado pelo botão) e ver se as páginas batem com o mockup. Ajustar o `ReportDocument` se precisar.
- [ ] **Step 5:** Rodar `bun run test` (exit 0), build e lint. Fechar o browser, apagar `.playwright-mcp/` e parar o servidor pelo PID. Commit `style(evolution): visual pass against mockup`, se houve ajuste.
- [ ] **Step 6:** **PARAR:** nada de push. O controller pergunta ao Yago se pode publicar.
