# Pump — Fase 1: fundação + treino — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** um PWA instalável no iPhone e publicado no GitHub Pages, em que a pessoa:
- monta o plano de treino de três jeitos: modelo pronto, do zero (catálogo de 876 exercícios em pt-BR) ou importando de uma IA no formato Pump;
- usa o plano na academia: treino do dia, marcar série, cronômetro de descanso, preview e "Concluir treino" (check-in).

O uso na academia funciona offline. Montar ou importar o plano precisa de internet. Também entram nesta fase o convite de instalação no iOS, as configurações e o backup em arquivo com lembrete.

**Architecture:**
- **App:** estático (React + Vite). O estado da pessoa fica no IndexedDB, uma chave por campo (`idb-keyval`; Dexie é demais pra ~5 chaves). Um store em memória por chave avisa todas as telas a cada gravação, então nenhuma cópia velha sobrescreve dado novo.
- **Service worker:** é próprio (`vite-plugin-pwa` em modo `injectManifest`, e não `generateSW`, porque a rota das fotos lê o cache e nunca grava). Faz o precache só do código do app e serve as fotos de exercício de um cache que contém apenas as do plano atual. Esse cache é sincronizado num único ponto, sempre que o plano muda e ao abrir o app.
- **Catálogo:** JSON gerado por script em tempo de build, a partir do free-exercise-db fixado num commit. A tradução é escrita à mão pelo agente executor e salva no repo.

**Tech Stack:** bun 1.4.4, React 19 + TypeScript, Vite 8, vite-plugin-pwa 2 (workbox 7.4), idb-keyval 6, lucide-react, vitest 5 + jsdom + fake-indexeddb 6 + @testing-library/react 16 (+ `@testing-library/dom` 10) + user-event 14, @vite-pwa/assets-generator 2, GitHub Actions + GitHub Pages.

**Spec:** [`docs/superpowers/specs/2026-11-16-pump-design.md`](../specs/2026-11-16-pump-design.md) · **Mockup aprovado:** [`docs/design/mockup-dia-a-dia-v2.html`](../../design/mockup-dia-a-dia-v2.html)

**Fora desta fase (planos próprios, depois deste):**
- **Fase 2:** dieta + água + TACO, incluindo os passos de dieta e água na montagem e a parte `dieta` do formato Pump.
- **Fase 3:** evolução, medidas, % de gordura, fotos e conquistas.

As abas Evolução e Dieta existem nesta fase, mas mostram "Em breve".

## Global Constraints

- **Interface:** pt-BR, pensada primeiro pro celular, só tema escuro, com os tokens Grafite da tabela da Task 1 (copiados da spec §6). Fonte `-apple-system, system-ui, sans-serif`.
- **Nunca usar emojis nem símbolos de texto como ícone** (ex.: ✓). Ícones só do `lucide-react`.
- **Área de toque ≥ 44×44 px** (o desenho pode ser menor dentro dela). As ações principais da aba Treino ficam na metade de baixo da tela (marcar série, Pular, +15 s, Concluir treino), e nenhuma ação exige gesto de duas mãos.
- **Dados da pessoa só no IndexedDB.** Nada de servidor, conta ou API paga. Pedir `navigator.storage.persist()` ao abrir.
- **O catálogo não fica guardado pelo app.** O service worker não faz precache de `catalog/**` e não tem rota de cache pra ele. O cache HTTP normal do navegador não conta.
- **Fotos:** só as dos exercícios do plano atual ficam no Cache API `pump-previews-v1`. Elas vêm de `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises/<path>` (CORS `*`, conferido em 2026-11-16).
- **Caminho no Pages:** Vite `base: '/pump/'`, assumindo o repo `yagoramires/pump`. Se o nome confirmado na Task 12 for outro, trocar o `base`, o `scope` e o `start_url` do manifest.
- **Gerenciador de pacotes:** bun (`bun install`, `bun run …`).
- **Testes sempre com `TZ=America/Sao_Paulo`**, que fica no script `test`.
- **Datas do dia:** sempre no fuso local, no formato `YYYY-MM-DD`. Nunca `toISOString().slice(0,10)` nem `new Date('YYYY-MM-DD')`.
- **Commits:** em inglês, no formato Conventional Commits, com o assunto em até 72 caracteres. **Sem `Co-Authored-By` e sem rodapé de Claude** (regra do Yago, vale pra todo subagente).
- **Não criar repo no GitHub, não publicar e não dar push sem OK explícito do Yago.** Isso inclui confirmar o nome do repo (Task 12).

## Limites conhecidos (aceitos nesta fase)

- **Alerta do descanso:** só toca com o app aberto na tela. O iOS não vibra pela web, e a chave de silêncio do iPhone também cala o som.
- **Fotos:** dependem do jsDelivr pra baixar. Se ele sumir, a alternativa é hospedar as fotos junto com o app (não feito agora).
- **Internet:** montar, editar ou importar o plano precisa de internet, porque usa o catálogo.
- **Dois treinos no mesmo dia da semana:** aparece o primeiro da lista.
- **Atualizações do app:** uma versão nova só entra depois que o app é fechado de vez e aberto de novo.
- **Prompt pra IA:** não leva a lista de nomes do catálogo. Nomes que não casam viram exercícios da pessoa, sem foto. Melhorar isso fica adiado (decisão do Yago, 2026-11-16).

## Review Focus

1. **Treino depois das 21h (UTC-3):** `todayKey` dá o dia local, e o teste roda com `TZ=America/Sao_Paulo`. Teste na Task 2.
2. **Editar o plano com o treino de hoje em andamento:** a sessão é uma cópia completa (`structuredClone`) dos exercícios. Depois do primeiro toque, a tela desenha só a partir da sessão. Exercícios, séries marcadas, reps, carga e descanso de hoje continuam iguais depois de editar o plano. Testes nas Tasks 7 e 10.
3. **Dados nunca se perdem por cópia velha ou restauração que falha:**
   - todas as cópias de uma chave são avisadas a cada gravação;
   - o backup só é aplicado depois de validado;
   - a restauração grava primeiro e só depois apaga as chaves que sobraram.
   
   Testes nas Tasks 2 e 3.
4. **Celular bloqueado ou app recarregado durante o descanso:** o fim do descanso (`restEndsAt`) fica salvo na sessão, e o tempo restante é calculado pelo relógio. Ao voltar, a tela mostra o tempo certo. Testes nas Tasks 7 e 10.
5. **Exercício sem fotos** (3 no catálogo, no commit f00c92c, além de todos os criados pela pessoa): miniatura com ícone, preview só com o texto e nada pra guardar no cache. Testes nas Tasks 6, 8 e 10.

---

## Estrutura de arquivos

```
pump/
  .github/workflows/pages.yml        deploy (Task 12)
  data/
    exercises.upstream.json          snapshot do free-exercise-db @f00c92c (Task 4)
    glossary.pt.json                 { muscles, equipment } → pt-BR (Task 4)
    translations/batches.json        lista de ids por lote (gerada, Task 4)
    translations/NN.json             { id: { name, instructions[] } } (Tasks 4–5)
  scripts/build-catalog.ts           buildCatalog + geração do catálogo e dos lotes (Task 4)
  public/catalog/exercises.json      catálogo gerado e commitado (Task 5)
  public/icon.svg + PNGs gerados     ícones do PWA (Task 11)
  pwa-assets.config.ts               config do gerador de ícones (Task 11)
  src/
    main.tsx, App.tsx                portões (instalar/montagem), abas, sync de previews
    theme.css                        tokens + base
    types.ts                         tipos de domínio
    lib/date.ts                      todayKey, weekday, parseDayKey, daysBetween, formatDayLabel
    storage/db.ts                    load/save/usePersisted/replaceAll/allData/requestPersist + store por chave
    storage/backup.ts                buildBackup, parseBackup, backupDue, exportBackup, importBackupFile
    catalog/catalog.ts               fetchCatalog, imageUrl, IMAGE_BASE
    catalog/search.ts                normalize, searchCatalog
    catalog/CatalogPicker.tsx
    workout/templates.ts             planos prontos, instantiateTemplate, toPlanExercise
    workout/schedule.ts              workoutForDate
    workout/session.ts               startSession, setDone, setRestEnd, completeSession
    workout/previews.ts              PREVIEW_CACHE, planImageUrls, syncPreviewCache
    workout/restTimer.ts             remainingSec, unlockAudio, beep
    workout/planFormat.ts            formato Pump (IA)
    workout/PlanEditor.tsx, PlanImport.tsx
    workout/TreinoTab.tsx, ExerciseRow.tsx, ExercisePreview.tsx, RestBanner.tsx, SetEditor.tsx
    onboarding/Onboarding.tsx
    shell/BottomNav.tsx, SettingsScreen.tsx, InstallGate.tsx, platform.ts, ComingSoon.tsx, Toast.tsx
    sw.ts                            service worker (tsconfig.sw.json)
  test/setup.ts                      jest-dom + fake-indexeddb
  test/helpers.ts                    fixtures e fakes compartilhados
```

## Tasks

### Task 1: Projeto, tema e casca com menu flutuante

**Files:**
- Create: `.gitignore`, `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/types.ts`, `src/theme.css`, `src/shell/BottomNav.tsx`, `src/shell/ComingSoon.tsx`, `test/setup.ts`, `bun.lock`, `README.md` (uma linha só), `eslint.config.js` (vem do template, manter)
- Delete (vieram do template): `src/App.css`, `src/index.css`, `src/assets/`, `public/vite.svg`
- Test: `src/shell/BottomNav.test.tsx`

**Interfaces:**
- Produces:
  - `type Tab = 'treino' | 'evolucao' | 'dieta'` em `src/types.ts`.
  - `<BottomNav tab={Tab} onChange={(t: Tab) => void} />` e `<ComingSoon title={string} />`.
  - CSS variables em `theme.css`:

| variável | valor | uso |
|---|---|---|
| `--bg` | `#121315` | fundo |
| `--card` / `--card-border` | `#1a1b1f` / `#25272c` | cards e linhas |
| `--divider` | `#24262a` | separadores |
| `--text` / `--strong` | `#d8d9dc` / `#ffffff` | texto / títulos |
| `--muted` / `--label` | `#6e7179` / `#5d6068` | secundário / rótulos maiúsculos |
| `--accent` / `--on-accent` | `#c6ff3d` / `#111111` | destaque / texto sobre destaque |
| `--soft-bg` / `--soft-border` | `#1c2410` / `#3c5214` | banner do descanso, faixa de backup |
| `--ghost-border` / `--ghost-text` | `#33363c` / `#9a9ca3` | controles neutros |
| `--selected` | `#22242a` | miniaturas, tracinho vazio |
| `--danger` | `#ff6b6b` | só a faixa de erro de armazenamento (*chamada do plano; a spec não tem cor de erro*) |
| `--radius` | `10px` | cards |

- [ ] **Step 1: Proteger o que já existe.** Em `~/Documents/personal-projects/pump`, rodar `git init -b main`. Criar o `.gitignore` com `node_modules`, `dist`, `.superpowers/` e `.playwright-mcp/`. Depois: `git add .gitignore docs && git commit -m "docs: spec, phase 1 plan and approved mockup"`.
- [ ] **Step 2: Gerar o projeto fora da pasta e copiar.** Rodar `bun create vite /tmp/pump-scaffold --template react-ts` e responder "No" se perguntar se quer instalar ou iniciar. Depois `rsync -a /tmp/pump-scaffold/ ./` e `rm -rf /tmp/pump-scaffold`. Conferir com `git status` que `docs/` continua intacto. Apagar os arquivos do template listados em Delete e trocar o README por `# Pump`.
- [ ] **Step 3: Dependências.**
  - `bun add idb-keyval lucide-react`
  - `bun add -d vitest jsdom fake-indexeddb @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event @types/node`
- [ ] **Step 4: Configuração.**
  - **`vite.config.ts`:** usar `defineConfig` de `'vitest/config'`, com `plugins: [react()]`, `base: '/pump/'` e `test: { environment: 'jsdom', globals: true, setupFiles: ['test/setup.ts'] }`.
  - **`tsconfig.app.json`:** incluir `src` e `test`, com `"types": ["vitest/globals", "@testing-library/jest-dom"]` e `"resolveJsonModule": true`.
  - **`tsconfig.node.json`:** incluir `vite.config.ts` e `scripts`, com `"types": ["node", "vitest/globals"]` e `"resolveJsonModule": true`.
  - **`test/setup.ts`:** `import '@testing-library/jest-dom/vitest'` e `import 'fake-indexeddb/auto'`.
  - **Scripts:** `"test": "TZ=America/Sao_Paulo vitest run"` e `"build": "tsc -b && vite build"`.
  - **`index.html`:** `<html lang="pt-BR">`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<meta name="theme-color" content="#121315">` e `<title>Pump</title>`.
- [ ] **Step 5: Escrever o teste que falha**

```tsx
test('menu tem 3 abas com rótulo acessível e marca a ativa', async () => {
  const onChange = vi.fn()
  render(<BottomNav tab="treino" onChange={onChange} />)
  expect(screen.getByRole('button', { name: 'Treino' })).toHaveAttribute('aria-current', 'page')
  await userEvent.click(screen.getByRole('button', { name: 'Dieta' }))
  expect(onChange).toHaveBeenCalledWith('dieta')
  expect(screen.getByRole('button', { name: 'Evolução' })).toBeInTheDocument()
})
```

- [ ] **Step 6:** Rodar `bun run test`. Esperado: FAIL (BottomNav não existe).
- [ ] **Step 7: Implementar.**
  - **`BottomNav`:** pílula fixa embaixo e centralizada, com a ordem Treino (`Dumbbell`), Evolução (`TrendingUp`) e Dieta (`Utensils`). Botões de 44 px, e o ativo usa `--accent`/`--on-accent`. Respeitar `bottom: calc(16px + env(safe-area-inset-bottom))`.
  - **`theme.css`:** a tabela de tokens e a base (`body { margin: 0; background: var(--bg); color: var(--text); font-family: … }`).
  - **`App`:** guarda a aba num `useState` por enquanto e mostra `ComingSoon` nas três abas.
- [ ] **Step 8:** Rodar `bun run test` e `bun run build`. Esperado: PASS e build sem erro.
- [ ] **Step 9:** Commit `chore: scaffold pump with grafite theme and bottom nav`.

---

### Task 2: Datas, tipos e armazenamento compartilhado

**Files:**
- Create: `src/lib/date.ts`, `src/storage/db.ts`, `test/helpers.ts`
- Modify: `src/types.ts`, `src/App.tsx`
- Test: `src/lib/date.test.ts`, `src/storage/db.test.ts`

**Interfaces:**
- Produces:
  - `src/lib/date.ts`:
    - `todayKey(d = new Date()): string`, `parseDayKey(key): Date` (meia-noite local, `new Date(y, m-1, d)`), `weekday(key): number` (0 = domingo … 6) e `daysBetween(a, b): number` (diferença em dias de calendário entre duas chaves).
    - `formatDayLabel(key): string`, que dá `'SEG, 16 NOV'`, com arrays próprios: `DOM SEG TER QUA QUI SEX SÁB` e `JAN FEV MAR ABR MAI JUN JUL AGO SET OUT NOV DEZ`. Não usar `Intl`.
  - `src/types.ts`:
    ```ts
    type Sex = 'M' | 'F'
    interface Profile { sex: Sex; heightCm: number; weightKg: number }
    interface Exercise { id: string; name: string; muscles: string[]; equipment: string; instructions: string[]; images: string[] }
    interface PlanExercise { exerciseId: string; name: string; muscles: string[]; images: string[]; instructions: string[]; sets: number; reps: string; weightKg: number; restSec: number; custom?: boolean; note?: string }
    interface Workout { id: string; label: string; name: string; weekdays: number[]; exercises: PlanExercise[] } // label = letra 'A', 'B'…
    interface WorkoutPlan { workouts: Workout[] }
    interface SetDone { reps: string; weightKg: number }
    type SessionExercise = PlanExercise & { sets: (SetDone | null)[] }   // sets.length = séries planejadas
    interface WorkoutSession { date: string; workoutId: string; workoutLabel: string; workoutName: string; exercises: SessionExercise[]; restEndsAt?: number; completedAt?: string }
    type WorkoutLog = Record<string, WorkoutSession>   // chave = date
    interface CustomExercise { id: string; name: string; muscles: string[]; note?: string } // id 'custom-<uuid>'
    interface Settings { lastTab: Tab; onboardingDone: boolean; firstUseAt?: string; lastBackupAt?: string; installDismissed?: boolean } // datas = todayKey
    interface UserData { profile: Profile; workoutPlan: WorkoutPlan; workoutLog: WorkoutLog; customExercises: CustomExercise[]; settings: Settings }
    const USER_KEYS = ['profile', 'workoutPlan', 'workoutLog', 'customExercises', 'settings'] as const
    const DEFAULT_SETTINGS: Settings = { lastTab: 'treino', onboardingDone: false }
    ```
  - `src/storage/db.ts`. O store por chave guarda o último valor em memória e uma lista de ouvintes. Toda gravação passa por ele.
    - `load<K extends keyof UserData>(k: K): Promise<UserData[K] | undefined>`
    - `save<K extends keyof UserData>(k: K, v: UserData[K]): Promise<void>` grava no IndexedDB e só então avisa os ouvintes de `k`.
    - `usePersisted<K extends keyof UserData>(k: K, initial: UserData[K]): [value: UserData[K], set: (v: UserData[K]) => void, loaded: boolean]` assina o store, carrega no mount e chama `save` no `set`.
    - `allData(): Promise<Record<string, unknown>>` (via `entries`).
    - `replaceAll(data: Record<string, unknown>): Promise<void>` faz `setMany(entries(data))` **primeiro** e depois `delMany(chaves atuais que não estão em data)`, e por fim avisa os ouvintes de todas as chaves.
    - `requestPersist(): Promise<boolean>` usa `navigator.storage?.persist?.() ?? false`.
    - Falha de gravação: `window.dispatchEvent(new CustomEvent('pump:storage-error', { detail: { message } }))` e relança o erro.
  - `test/helpers.ts`:
    - `pe(over?: Partial<PlanExercise>): PlanExercise`, com padrão `{ exerciseId: 'X', name: 'X', muscles: [], images: [], instructions: [], sets: 3, reps: '10', weightKg: 0, restSec: 90 }`.
    - `workoutOf(exs: Partial<PlanExercise>[], over?: Partial<Workout>): Workout`, com padrão `{ id: 'w', label: 'A', name: 'Treino A', weekdays: [1] }`.
    - `planOf(ws: Partial<Workout>[]): WorkoutPlan` e `planWith(exs: Partial<PlanExercise>[]): WorkoutPlan` (um treino).
    - `ex(name: string, over?: Partial<Exercise>): Exercise`, com padrão `{ id: name, name, muscles: [], equipment: 'barra', instructions: [], images: [] }`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('todayKey usa o dia local mesmo depois das 21h', () => {
  expect(todayKey(new Date(2026, 10, 16, 22, 30))).toBe('2026-11-16')
  expect(todayKey(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05')
})
test('weekday, daysBetween e formatDayLabel', () => {
  expect(weekday('2026-11-16')).toBe(1)
  expect(daysBetween('2026-11-01', '2026-11-15')).toBe(14)
  expect(formatDayLabel('2026-11-16')).toBe('SEG, 16 NOV')
  expect(formatDayLabel('2026-11-21')).toBe('SÁB, 21 NOV')
})
test('save/load ida e volta; replaceAll grava e remove sobras', async () => {
  await save('profile', { sex: 'M', heightCm: 178, weightKg: 80 })
  expect(await load('profile')).toEqual({ sex: 'M', heightCm: 178, weightKg: 80 })
  await replaceAll({ settings: { lastTab: 'dieta', onboardingDone: true } })
  expect(await load('profile')).toBeUndefined()
  expect(Object.keys(await allData())).toEqual(['settings'])
})
test('duas cópias da mesma chave: gravar por uma atualiza a outra', async () => {
  const a = renderHook(() => usePersisted('settings', DEFAULT_SETTINGS))
  const b = renderHook(() => usePersisted('settings', DEFAULT_SETTINGS))
  await waitFor(() => expect(a.result.current[2]).toBe(true))
  act(() => a.result.current[1]({ ...DEFAULT_SETTINGS, lastTab: 'dieta' }))
  await waitFor(() => expect(b.result.current[0].lastTab).toBe('dieta'))
  await act(() => save('settings', { ...b.result.current[0], lastBackupAt: '2026-11-16' })) // escrita fora do hook
  await waitFor(() => expect(a.result.current[0].lastBackupAt).toBe('2026-11-16'))
})
test('replaceAll avisa as cópias abertas', async () => {
  const h = renderHook(() => usePersisted('workoutLog', {}))
  await act(() => replaceAll({ workoutLog: { '2026-11-10': { date: '2026-11-10', workoutId: 'a', workoutLabel: 'A', workoutName: 'A', exercises: [] } } }))
  await waitFor(() => expect(Object.keys(h.result.current[0])).toEqual(['2026-11-10']))
})
```

Antes de cada teste, rodar `beforeEach(() => clear())` (idb-keyval) e zerar o store em memória com `resetStoreForTests()`, exportado de `db.ts`.

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar `date.ts`, `db.ts` e `helpers.ts`.
- [ ] **Step 4:** Rodar `bun run test`. Esperado: PASS.
- [ ] **Step 5: Ligar no `App`.**
  - `const [settings, setSettings] = usePersisted('settings', DEFAULT_SETTINGS)`: a aba ativa é `settings.lastTab`, e trocar de aba grava `{ ...settings, lastTab }`.
  - Chamar `requestPersist()` no boot.
  - Escutar `pump:storage-error` e mostrar uma faixa fixa no topo, com fundo `--danger`, texto `--on-accent` e a mensagem "Não consegui salvar: {message}".
- [ ] **Step 6:** Rodar `bun run test` e `bun run build`. Esperado: PASS. Commit `feat: local dates, domain types and shared indexeddb store`.

---

### Task 3: Backup em arquivo

**Files:**
- Create: `src/storage/backup.ts`
- Test: `src/storage/backup.test.ts`

**Interfaces:**
- Consumes: `allData`, `replaceAll`, `load`, `save` (Task 2); `todayKey`, `daysBetween` (Task 2).
- Produces:
  - `interface BackupFile { app: 'pump'; version: 1; exportedAt: string; data: Record<string, unknown> }`
  - `buildBackup(data: Record<string, unknown>, now: Date): BackupFile`. O `exportedAt` vem de `now.toISOString()`.
  - `parseBackup(text: string): BackupFile` lança `Error` com mensagem em pt-BR. Recusa:
    - JSON inválido: "Arquivo não é um backup válido".
    - `app !== 'pump'`: "Esse arquivo não é um backup do Pump".
    - `version !== 1`: "Backup de uma versão mais nova do app".
    - `data` que não é objeto, ou que tem chave fora de `USER_KEYS`: "Backup com conteúdo desconhecido".
    - `data.workoutPlan` sem `workouts` em array, ou `data.workoutLog` que não é objeto: "Backup corrompido".
  - `backupDue(s: Settings, today: string): boolean` é verdadeiro quando `daysBetween(s.lastBackupAt ?? s.firstUseAt, today) >= 14`, e falso se não houver nenhuma das duas datas.
  - `exportBackup(now = new Date()): Promise<'shared' | 'downloaded' | 'cancelled'>` monta um `File` `pump-backup-YYYY-MM-DD.json` (tipo `application/json`).
    - Se `navigator.canShare?.({ files: [file] })`, usa `navigator.share({ files: [file] })`. Um `AbortError` dá `'cancelled'`.
    - Senão, faz download com `<a download>` e um blob URL.
    - Em `'shared'` ou `'downloaded'`, grava `settings.lastBackupAt = todayKey(now)` via `save`.
  - `importBackupFile(file: File): Promise<void>` faz `parseBackup(await file.text())` e **só então** `replaceAll(b.data)`. Quem chama faz `location.reload()` em seguida (Task 11).

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('ida e volta', () => {
  const b = buildBackup({ profile: { sex: 'F', heightCm: 165, weightKg: 60 } }, new Date(2026, 10, 16))
  expect(parseBackup(JSON.stringify(b))).toEqual(b)
})
test.each([
  ['não é JSON', 'oi', 'Arquivo não é um backup válido'],
  ['outro app', JSON.stringify({ app: 'outro', version: 1, data: {} }), 'Esse arquivo não é um backup do Pump'],
  ['versão mais nova', JSON.stringify({ app: 'pump', version: 2, data: {} }), 'Backup de uma versão mais nova do app'],
  ['chave estranha', JSON.stringify({ app: 'pump', version: 1, data: { hack: 1 } }), 'Backup com conteúdo desconhecido'],
  ['plano corrompido', JSON.stringify({ app: 'pump', version: 1, data: { workoutPlan: { workouts: 'x' } } }), 'Backup corrompido'],
])('recusa %s', (_, txt, msg) => expect(() => parseBackup(txt)).toThrow(msg))
test('importar arquivo inválido não apaga nada', async () => {
  await save('profile', { sex: 'M', heightCm: 178, weightKg: 80 })
  await expect(importBackupFile(new File(['{lixo'], 'x.json'))).rejects.toThrow('Arquivo não é um backup válido')
  expect(await load('profile')).toBeDefined()
})
test('backupDue com 14 dias de calendário', () => {
  const s: Settings = { lastTab: 'treino', onboardingDone: true, firstUseAt: '2026-11-01' }
  expect(backupDue(s, '2026-11-14')).toBe(false)
  expect(backupDue(s, '2026-11-15')).toBe(true)
  expect(backupDue({ ...s, lastBackupAt: '2026-11-10' }, '2026-11-15')).toBe(false)
  expect(backupDue({ lastTab: 'treino', onboardingDone: false }, '2026-11-15')).toBe(false)
})
```

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `bun run test`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: json backup export/import with validation`.

---

### Task 4: Pipeline do catálogo + glossário + lotes + 1º lote traduzido

**Files:**
- Create:
  - `data/exercises.upstream.json` (Step 1)
  - `data/glossary.pt.json`
  - `scripts/build-catalog.ts`
  - `data/translations/batches.json` (gerado)
  - `data/translations/01.json`
- Test: `scripts/build-catalog.test.ts`

**Interfaces:**
- Produces, todos exportados de `scripts/build-catalog.ts`:
  - `interface Upstream { id: string; name: string; equipment: string | null; primaryMuscles: string[]; secondaryMuscles: string[]; instructions: string[]; images: string[] }` (os outros campos do upstream são ignorados).
  - `interface Glossary { muscles: Record<string, string>; equipment: Record<string, string> }`. A chave `"null"` cobre `equipment: null`.
  - `type Translations = Record<string, { name: string; instructions: string[] }>`
  - `makeBatches(ids: string[]): string[][]` ordena com `[...ids].sort()` (ordem de code unit, padrão do JS) e fatia em lotes de 50.
  - `buildCatalog(up: Upstream[], g: Glossary, t: Translations): Exercise[]`:
    - `muscles` = primários seguidos dos secundários, traduzidos e sem repetição;
    - `equipment` = `g.equipment[String(x.equipment)]`;
    - resultado ordenado por `name.localeCompare(b.name, 'pt-BR')`.

    Lança erro se faltar tradução (citando o id), se o número de instruções for diferente ("passos") ou se o nome vier vazio.
  - CLI `bun scripts/build-catalog.ts`:
    1. Se `batches.json` não existe, gera e grava ele.
    2. Lê todos os `data/translations/[0-9][0-9].json`.
    3. Se faltar algum id, lista os ids, sai com código 1 e não escreve o catálogo.
    4. Senão, escreve `public/catalog/exercises.json`.

    Rodar o CLI só dentro de `if (import.meta.main)`, pra que o teste possa importar o arquivo sem efeitos.

**Fatos do upstream** (commit f00c92c, conferidos em 2026-11-16):
- 876 exercícios, 3 sem imagens, os outros com 2.
- equipment: `bands, barbell, body only, cable, dumbbell, e-z curl bar, exercise ball, foam roll, kettlebells, machine, medicine ball, other, null`.
- muscles (17): `abdominals, abductors, adductors, biceps, calves, chest, forearms, glutes, hamstrings, lats, lower back, middle back, neck, quadriceps, shoulders, traps, triceps`.

**`data/glossary.pt.json`** (exato):

```json
{
  "muscles": { "abdominals": "abdominais", "abductors": "abdutores", "adductors": "adutores", "biceps": "bíceps", "calves": "panturrilhas", "chest": "peito", "forearms": "antebraços", "glutes": "glúteos", "hamstrings": "posteriores de coxa", "lats": "dorsais", "lower back": "lombar", "middle back": "meio das costas", "neck": "pescoço", "quadriceps": "quadríceps", "shoulders": "ombros", "traps": "trapézio", "triceps": "tríceps" },
  "equipment": { "bands": "elástico", "barbell": "barra", "body only": "peso do corpo", "cable": "polia", "dumbbell": "halter", "e-z curl bar": "barra W", "exercise ball": "bola suíça", "foam roll": "rolo de liberação", "kettlebells": "kettlebell", "machine": "máquina", "medicine ball": "medicine ball", "other": "outro", "null": "nenhum" }
}
```

**Tradução:** o agente executor escreve os JSON **à mão**, sem API nem script de tradução.
- **Nomes:** use os que se falam nas academias do Brasil, como supino reto/inclinado, agachamento livre, levantamento terra, remada curvada, puxada frontal, rosca direta/alternada/martelo, desenvolvimento, elevação lateral, crucifixo, tríceps testa/corda/francês, cadeira extensora, mesa flexora e panturrilha em pé. Mantenha os empréstimos que o brasileiro usa: leg press, stiff, crossover, hack, burpee, kettlebell swing.
- **Instruções:** no imperativo, com o mesmo número de passos do original.

- [ ] **Step 1:** Baixar `https://raw.githubusercontent.com/yuhonas/free-exercise-db/f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/dist/exercises.json` para `data/exercises.upstream.json` e conferir que tem 876 itens.
- [ ] **Step 2: Escrever os testes que falham**

```ts
import glossary from '../data/glossary.pt.json'
const up: Upstream[] = [{ id: 'X', name: 'Barbell Curl', equipment: 'barbell', primaryMuscles: ['biceps'], secondaryMuscles: ['forearms', 'biceps'], instructions: ['a', 'b'], images: ['X/0.jpg', 'X/1.jpg'] }]

test('traduz pelo glossário e monta Exercise', () => {
  expect(buildCatalog(up, glossary, { X: { name: 'Rosca direta', instructions: ['1', '2'] } })).toEqual([
    { id: 'X', name: 'Rosca direta', muscles: ['bíceps', 'antebraços'], equipment: 'barra', instructions: ['1', '2'], images: ['X/0.jpg', 'X/1.jpg'] },
  ])
})
test('falha se faltar tradução, se os passos diferirem ou se o nome vier vazio', () => {
  expect(() => buildCatalog(up, glossary, {})).toThrow(/X/)
  expect(() => buildCatalog(up, glossary, { X: { name: 'R', instructions: ['1'] } })).toThrow(/passos/)
  expect(() => buildCatalog(up, glossary, { X: { name: ' ', instructions: ['1', '2'] } })).toThrow()
})
test('equipment null vira "nenhum"', () => {
  expect(buildCatalog([{ ...up[0], equipment: null }], glossary, { X: { name: 'R', instructions: ['1', '2'] } })[0].equipment).toBe('nenhum')
})
test('glossário cobre todos os valores do upstream real', () => {
  const real: Upstream[] = JSON.parse(readFileSync('data/exercises.upstream.json', 'utf8'))
  for (const x of real) {
    for (const m of [...x.primaryMuscles, ...x.secondaryMuscles]) expect(glossary.muscles[m as keyof typeof glossary.muscles], m).toBeTruthy()
    expect(glossary.equipment[String(x.equipment) as keyof typeof glossary.equipment], String(x.equipment)).toBeTruthy()
  }
})
test('makeBatches: ordem por code unit, lotes de 50, sem perda', () => {
  const ids = Array.from({ length: 120 }, (_, i) => `id${String(i).padStart(3, '0')}`).reverse()
  const b = makeBatches(ids)
  expect(b.map(x => x.length)).toEqual([50, 50, 20])
  expect(b.flat()).toEqual([...ids].sort())
})
```

- [ ] **Step 3:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 4:** Implementar o script. Rodar `bun run test`. Esperado: PASS.
- [ ] **Step 5:** Rodar `bun scripts/build-catalog.ts`. Esperado: cria `data/translations/batches.json` com 18 lotes, sai com código 1 e lista os 876 ids sem tradução.
- [ ] **Step 6:** Traduzir o lote 1 (`batches.json[0]`) em `data/translations/01.json`. Rodar `bun scripts/build-catalog.ts`. Esperado: código 1, listando só os ids dos lotes 2 a 18.
- [ ] **Step 7:** Commit `feat: exercise catalog pipeline, pt-BR glossary and first batch`.

---

### Task 5: Traduzir os lotes 2 a 18 e gerar o catálogo

**Files:**
- Create: `data/translations/02.json` … `18.json`, `public/catalog/exercises.json` (gerado)

O lote N contém exatamente os ids de `batches.json[N-1]` e vai no arquivo `NN.json`. Os lotes são independentes e podem ir em paralelo, um subagente por grupo de lotes, sempre com o glossário e as regras da Task 4.

- [ ] **Step 1:** Traduzir os lotes 2 a 18.
- [ ] **Step 2:** Rodar `bun scripts/build-catalog.ts`. Esperado: código 0 e `public/catalog/exercises.json` com 876 itens (conferir com `bun -e "console.log(require('./public/catalog/exercises.json').length)"`, que deve imprimir `876`).
- [ ] **Step 3: Revisar 20 nomes ao acaso** com `bun -e` e `Math.random`. Critério de aprovação: o nome usa os termos do glossário, segue as regras de nome de academia brasileira da Task 4 e não sobra palavra em inglês fora dos empréstimos listados. Corrigir os reprovados e rodar o Step 2 de novo (esperado: código 0).
- [ ] **Step 4:** Rodar `bun run test`. Esperado: PASS. Commit `feat: full pt-BR exercise catalog (876)`.

---

### Task 6: Acesso ao catálogo, busca e cache dos previews

**Files:**
- Create: `src/catalog/catalog.ts`, `src/catalog/search.ts`, `src/workout/previews.ts`
- Modify: `test/helpers.ts` (adicionar `fakeCacheStorage` e `cachedUrls`)
- Test: `src/catalog/search.test.ts`, `src/workout/previews.test.ts`

**Interfaces:**
- Consumes: `Exercise`, `WorkoutPlan` (Task 2); `ex`, `planWith` (helpers).
- Produces:
  - `IMAGE_BASE` = a URL jsDelivr das Global Constraints (terminando em `/exercises/`), e `imageUrl(path: string): string`.
  - `fetchCatalog(): Promise<Exercise[]>` faz `fetch(\`${import.meta.env.BASE_URL}catalog/exercises.json\`)` com o cache HTTP padrão. Em erro de rede ou `!res.ok`, lança `Error('Sem internet para carregar o catálogo')`.
  - `normalize(s: string): string`: `s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()`.
  - `searchCatalog<T extends { name: string; muscles: string[]; equipment?: string }>(list: T[], q: string, f?: { muscle?: string; equipment?: string }): T[]`:
    - as palavras da busca (separadas por espaço) precisam todas aparecer como **trecho** do nome normalizado;
    - busca vazia devolve tudo, só com os filtros aplicados;
    - o filtro de músculo casa com qualquer item de `muscles` (primários e secundários), e o de aparelho, por igualdade;
    - ordem: primeiro quem tem o nome começando pela busca normalizada, depois o resto, e cada grupo em `localeCompare(…, 'pt-BR')`.
  - `PREVIEW_CACHE = 'pump-previews-v1'` e `planImageUrls(plan: WorkoutPlan): string[]`, sem repetição.
  - `syncPreviewCache(plan: WorkoutPlan, cs: CacheStorage = caches): Promise<void>`:
    - adiciona as URLs que faltam, uma a uma com `Promise.allSettled` de `cache.add(url)`;
    - apaga as que não estão no plano;
    - falhas só vão pro `console.warn` e nunca lançam erro.

    Escreva no código: `// shortcut: dois saves seguidos podem correr em paralelo; o próximo boot corrige. Upgrade: fila se aparecer foto faltando.`
  - Helpers: `fakeCacheStorage(initial: Record<string, string>, opts?: { failOn?: string })` implementa `open(name) → { keys, add, delete, match }` sobre um `Map`, e o `add` lança para `failOn`. `cachedUrls(cs): Promise<string[]>` devolve as URLs **ordenadas**.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('busca ignora acento e caixa, casa trechos e prioriza prefixo; empate alfabético', () => {
  const l = [ex('Crucifixo com halter'), ex('Supino reto com barra'), ex('Supino inclinado')]
  expect(searchCatalog(l, 'SUPINO').map(e => e.name)).toEqual(['Supino inclinado', 'Supino reto com barra'])
  expect(searchCatalog(l, 'halter cruci').map(e => e.name)).toEqual(['Crucifixo com halter'])
  expect(searchCatalog([ex('Elevação pélvica')], 'elevacao pelvica')).toHaveLength(1)
  expect(searchCatalog(l, 'barra').map(e => e.name)).toEqual(['Supino reto com barra'])
})
test('busca vazia devolve tudo filtrado; filtro de músculo inclui secundários', () => {
  const l = [ex('Remada', { muscles: ['dorsais', 'bíceps'] }), ex('Rosca', { muscles: ['bíceps'] }), ex('Agachamento', { muscles: ['quadríceps'] })]
  expect(searchCatalog(l, '', { muscle: 'bíceps' }).map(e => e.name)).toEqual(['Remada', 'Rosca'])
})
test('syncPreviewCache adiciona as do plano, remove as antigas e ignora exercício sem foto', async () => {
  const cs = fakeCacheStorage({ [imageUrl('Velho/0.jpg')]: 'x' })
  await syncPreviewCache(planWith([{ images: ['A/0.jpg', 'A/1.jpg'] }, { images: [] }]), cs)
  expect(await cachedUrls(cs)).toEqual([imageUrl('A/0.jpg'), imageUrl('A/1.jpg')])
})
test('syncPreviewCache não lança quando uma imagem falha', async () => {
  const cs = fakeCacheStorage({}, { failOn: imageUrl('A/1.jpg') })
  await expect(syncPreviewCache(planWith([{ images: ['A/0.jpg', 'A/1.jpg'] }]), cs)).resolves.toBeUndefined()
  expect(await cachedUrls(cs)).toEqual([imageUrl('A/0.jpg')])
})
```

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `bun run test`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: catalog fetch, accent-insensitive search and plan-only preview cache`.

---

### Task 7: Agenda, sessão do dia e cronômetro (lógica)

**Files:**
- Create: `src/workout/schedule.ts`, `src/workout/session.ts`, `src/workout/restTimer.ts`
- Test: `src/workout/schedule.test.ts`, `src/workout/session.test.ts`, `src/workout/restTimer.test.ts`

**Interfaces:**
- Consumes: os tipos e o `weekday` (Task 2); `pe`, `workoutOf`, `planOf` (helpers).
- Produces:
  - `workoutForDate(plan: WorkoutPlan, date: string): Workout | undefined` devolve o primeiro treino cujo `weekdays` inclui o dia.
  - `startSession(w: Workout, date: string): WorkoutSession`:
    - `exercises` = `structuredClone(w.exercises)`, cada um com `sets: Array(pe.sets).fill(null)`;
    - `workoutLabel` = `w.label`, `workoutName` = `w.name`, `workoutId` = `w.id`.
  - `setDone(s, exIdx, setIdx, v: SetDone | null): WorkoutSession` é imutável. O índice é seguro porque a ordem da sessão não muda depois de criada.
  - `setRestEnd(s: WorkoutSession, endAt: number | undefined): WorkoutSession` é imutável.
  - `completeSession(s: WorkoutSession, now: Date): WorkoutSession` define `completedAt` com ISO e limpa `restEndsAt`.
  - `remainingSec(endAt: number, now: number): number` = `Math.max(0, Math.ceil((endAt - now) / 1000))`.
  - `unlockAudio(): void` cria ou dá `resume()` num `AudioContext` único do módulo. **Precisa ser chamada dentro do handler do toque** que marca a série, porque o iOS só libera áudio num gesto.
  - `beep(): void` toca ~200 ms (oscilador de 880 Hz) nesse contexto, se existir, e chama `navigator.vibrate?.(300)`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('treino do dia pelo dia da semana; descanso → undefined', () => {
  const plan = planOf([{ id: 'a', weekdays: [1, 3, 5] }, { id: 'b', weekdays: [2, 4] }])
  expect(workoutForDate(plan, '2026-11-16')?.id).toBe('a')   // segunda
  expect(workoutForDate(plan, '2026-11-17')?.id).toBe('b')   // terça
  expect(workoutForDate(plan, '2026-11-22')).toBeUndefined() // domingo
})
test('sessão é cópia completa: editar o plano depois não muda a sessão', () => {
  const w = workoutOf([{ exerciseId: 'Supino', name: 'Supino reto', sets: 4, reps: '10', weightKg: 40, restSec: 60, images: ['S/0.jpg'] }], { label: 'A', name: 'Peito' })
  const s = startSession(w, '2026-11-16')
  w.exercises[0].name = 'Outro'; w.exercises[0].reps = '5'; w.exercises[0].images.push('Z.jpg'); w.exercises.splice(0, 1)
  expect(s).toMatchObject({ workoutLabel: 'A', workoutName: 'Peito' })
  expect(s.exercises[0]).toMatchObject({ exerciseId: 'Supino', name: 'Supino reto', reps: '10', weightKg: 40, restSec: 60, images: ['S/0.jpg'], sets: [null, null, null, null] })
})
test('setDone marca e desmarca sem mutar; o mesmo exercício duas vezes fica separado', () => {
  const s0 = startSession(workoutOf([{ exerciseId: 'Rosca', sets: 2 }, { exerciseId: 'Rosca', sets: 2 }]), '2026-11-16')
  const s1 = setDone(s0, 1, 0, { reps: '10', weightKg: 12 })
  expect(s0.exercises[1].sets[0]).toBeNull()
  expect(s1.exercises[0].sets).toEqual([null, null])
  expect(s1.exercises[1].sets).toEqual([{ reps: '10', weightKg: 12 }, null])
  expect(setDone(s1, 1, 0, null).exercises[1].sets[0]).toBeNull()
})
test('setRestEnd e completeSession', () => {
  const s = setRestEnd(startSession(workoutOf([{}]), '2026-11-16'), 123)
  expect(s.restEndsAt).toBe(123)
  const c = completeSession(s, new Date(2026, 10, 16, 19))
  expect(c.completedAt).toBeDefined(); expect(c.restEndsAt).toBeUndefined()
})
test('restante vem do relógio, não de ticks', () => {
  const end = 1_000_000 + 90_000
  expect(remainingSec(end, 1_000_000)).toBe(90)
  expect(remainingSec(end, 1_000_000 + 89_100)).toBe(1)
  expect(remainingSec(end, 1_000_000 + 600_000)).toBe(0) // voltou do bloqueio muito depois
})
```

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `bun run test`. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: workout schedule, full-snapshot day session and wall-clock rest timer`.

---

### Task 8: Planos prontos, editor do plano e seletor do catálogo

**Files:**
- Create: `src/workout/templates.ts`, `src/catalog/CatalogPicker.tsx`, `src/workout/PlanEditor.tsx`
- Test: `src/workout/templates.test.ts`

**Interfaces:**
- Consumes: `fetchCatalog`, `searchCatalog`, `imageUrl` (Task 6); `usePersisted` (Task 2).
- Produces:
  - `interface PlanTemplate { id: string; name: string; description: string; workouts: { label: string; name: string; weekdays: number[]; exerciseIds: string[] }[] }` e `TEMPLATES: PlanTemplate[]` (tabela abaixo).
  - `PLAN_DEFAULTS = { sets: 3, reps: '10-12', weightKg: 0, restSec: 90 }`.
  - `toPlanExercise(e: Exercise | CustomExercise): PlanExercise` aplica o `PLAN_DEFAULTS`. Um `CustomExercise` vira `{ exerciseId: e.id, custom: true, images: [], instructions: [], note: e.note }`.
  - `instantiateTemplate(t: PlanTemplate, catalog: Exercise[]): WorkoutPlan`: um `id` novo (`crypto.randomUUID()`) por treino, e os exercícios via `toPlanExercise`.
  - `<PlanEditor initial?: WorkoutPlan onDone={() => void} onCancel?: () => void />`:
    - edita uma cópia local de `initial ?? plano salvo ?? { workouts: [] }`;
    - "Salvar" grava `workoutPlan` via `usePersisted` e chama `onDone`;
    - "Cancelar" descarta;
    - **não** chama `syncPreviewCache`, porque isso é feito pelo App (Task 11).
  - `<CatalogPicker onPick={(e: Exercise | CustomExercise) => void} onClose={() => void} />`. É ele quem cria o exercício próprio: gera o id `custom-${crypto.randomUUID()}`, grava em `customExercises` via `usePersisted` e chama `onPick`.

**Planos prontos (exatos).** Dias: 0 = dom … 6 = sáb.

| id / name | description | treinos (label · name · dias · exerciseIds) |
|---|---|---|
| `fullbody` / **Fullbody 3×** | Corpo inteiro, 3×/semana | A · Corpo inteiro · [1,3,5] · `Barbell_Squat`, `Barbell_Bench_Press_-_Medium_Grip`, `Wide-Grip_Lat_Pulldown`, `Dumbbell_Shoulder_Press`, `Romanian_Deadlift`, `Seated_Cable_Rows`, `Plank` |
| `ab` / **AB** | Empurrar e puxar + pernas, 4×/semana | A · Peito, ombro e tríceps · [1,4] · `Barbell_Bench_Press_-_Medium_Grip`, `Dumbbell_Flyes`, `Dumbbell_Shoulder_Press`, `Side_Lateral_Raise`, `Triceps_Pushdown_-_Rope_Attachment` — B · Costas, bíceps e pernas · [2,5] · `Wide-Grip_Lat_Pulldown`, `Seated_Cable_Rows`, `Barbell_Curl`, `Barbell_Squat`, `Leg_Press`, `Lying_Leg_Curls` |
| `abc` / **ABC** | Divisão clássica, 6×/semana | A · Peito, ombro e tríceps · [1,4] · `Barbell_Bench_Press_-_Medium_Grip`, `Barbell_Incline_Bench_Press_-_Medium_Grip`, `Dumbbell_Flyes`, `Dumbbell_Shoulder_Press`, `Side_Lateral_Raise`, `Triceps_Pushdown_-_Rope_Attachment` — B · Costas e bíceps · [2,5] · `Wide-Grip_Lat_Pulldown`, `Bent_Over_Barbell_Row`, `Seated_Cable_Rows`, `One-Arm_Dumbbell_Row`, `Barbell_Curl`, `Hammer_Curls` — C · Pernas · [3,6] · `Barbell_Squat`, `Leg_Press`, `Leg_Extensions`, `Lying_Leg_Curls`, `Stiff-Legged_Barbell_Deadlift`, `Seated_Calf_Raise` |
| `abcd` / **ABCD** | Um grupo por dia, 4×/semana | A · Peito e tríceps · [1] · `Barbell_Bench_Press_-_Medium_Grip`, `Barbell_Incline_Bench_Press_-_Medium_Grip`, `Cable_Crossover`, `Triceps_Pushdown_-_Rope_Attachment`, `EZ-Bar_Skullcrusher` — B · Costas e bíceps · [2] · `Wide-Grip_Lat_Pulldown`, `Bent_Over_Barbell_Row`, `Seated_Cable_Rows`, `Barbell_Curl`, `Hammer_Curls` — C · Pernas · [4] · `Barbell_Squat`, `Leg_Press`, `Leg_Extensions`, `Lying_Leg_Curls`, `Barbell_Hip_Thrust`, `Seated_Calf_Raise` — D · Ombros e abdômen · [5] · `Dumbbell_Shoulder_Press`, `Side_Lateral_Raise`, `Seated_Bent-Over_Rear_Delt_Raise`, `Dumbbell_Shrug`, `Cable_Crunch`, `Plank` |
| `upperlower` / **Superior/Inferior** | Superiores e inferiores, 4×/semana | A · Superior · [1,4] · `Barbell_Bench_Press_-_Medium_Grip`, `Wide-Grip_Lat_Pulldown`, `Dumbbell_Shoulder_Press`, `Seated_Cable_Rows`, `Barbell_Curl`, `Triceps_Pushdown_-_Rope_Attachment` — B · Inferior · [2,5] · `Barbell_Squat`, `Leg_Press`, `Leg_Extensions`, `Lying_Leg_Curls`, `Barbell_Hip_Thrust`, `Seated_Calf_Raise` |

**PlanEditor:**
- **Lista de treinos.** "Adicionar treino" cria o próximo label livre (A, B, C…), com nome "Treino X" editável. O treino pode ser removido.
- **Dias.** Chips D S T Q Q S S, cada um com `aria-label` do dia por extenso ("Domingo"…).
- **Exercícios** de cada treino, com estes controles:
  - séries: stepper ±1, de 1 a 10;
  - reps: campo de **texto** (aceita "10-12" ou "30s");
  - carga: stepper ±2,5 kg, de 0 a 500, mais campo numérico;
  - descanso: stepper ±15 s, de 15 a 600;
  - subir, descer e remover;
  - "Adicionar exercício", que abre o `CatalogPicker`.

**CatalogPicker:**
- **Tela cheia,** com busca focada e os chips de músculo e de aparelho. Os valores dos chips são os **únicos presentes no catálogo carregado**.
- **Lista:** miniatura `imageUrl(images[0])`, ou o ícone `Dumbbell` quando não tem foto. Os exercícios próprios aparecem primeiro, também filtrados pela busca.
- **"Criar exercício":** nome, grupo muscular (um dos valores de músculo do glossário) e observação.
- **Sem internet,** se `fetchCatalog` falhar: "Sem internet: só seus exercícios aparecem".

- [ ] **Step 1: Escrever os testes que falham**

```ts
const catalog: Exercise[] = JSON.parse(readFileSync('public/catalog/exercises.json', 'utf8'))
test('todos os ids dos planos prontos existem no catálogo', () => {
  const ids = new Set(catalog.map(e => e.id))
  for (const t of TEMPLATES) for (const w of t.workouts) for (const id of w.exerciseIds) expect(ids.has(id), `${t.id}:${id}`).toBe(true)
})
test('5 planos prontos, na ordem', () =>
  expect(TEMPLATES.map(t => t.name)).toEqual(['Fullbody 3×', 'AB', 'ABC', 'ABCD', 'Superior/Inferior']))
test('instanciar copia dados do catálogo e aplica padrões', () => {
  const p = instantiateTemplate(TEMPLATES[0], catalog)
  const pe = p.workouts[0].exercises[0]
  expect(pe).toMatchObject(PLAN_DEFAULTS)
  expect(pe.name).toBe(catalog.find(e => e.id === pe.exerciseId)!.name)
  expect(p.workouts[0]).toMatchObject({ label: 'A', weekdays: [1, 3, 5] })
})
test('exercício criado vira PlanExercise sem fotos e com observação', () =>
  expect(toPlanExercise({ id: 'custom-1', name: 'Remada na máquina X', muscles: ['dorsais'], note: 'banco 3' }))
    .toMatchObject({ exerciseId: 'custom-1', custom: true, images: [], instructions: [], note: 'banco 3', ...PLAN_DEFAULTS }))
```

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar `templates.ts`. Rodar `bun run test`. Esperado: PASS.
- [ ] **Step 4:** Implementar `CatalogPicker` e `PlanEditor`. Rodar `bun run test` e `bun run build`. Esperado: PASS e build sem erro.
- [ ] **Step 5:** Commit `feat: workout templates, plan editor and catalog picker`.

---

### Task 9: Formato Pump (importar e exportar plano via IA)

**Files:**
- Create: `src/workout/planFormat.ts`, `src/workout/PlanImport.tsx`
- Test: `src/workout/planFormat.test.ts`

**Interfaces:**
- Consumes: `normalize`, `fetchCatalog` (Task 6); `toPlanExercise`, `PLAN_DEFAULTS` (Task 8); `ex` (helpers); tipos (Task 2).
- Produces:
  - Tipos:
    ```ts
    type Dia = 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab'
    interface PumpExercicio { nome: string; series: number; reps: string; cargaKg?: number; descansoSeg?: number; obs?: string }
    interface PumpTreino { letra: string; nome: string; dias: Dia[]; exercicios: PumpExercicio[] }
    interface PumpPlanoFile { formato: 'pump-plano'; versao: 1; treinos: PumpTreino[]; dieta?: unknown }
    class PlanFormatError extends Error { problems: string[] }
    ```
  - `parsePlanFormat(text: string): PumpPlanoFile`:
    - usa o conteúdo do primeiro bloco ```` ``` ```` se houver; senão, do primeiro `{` ao último `}`;
    - aceita `sáb` como `sab`, e `reps` numérico vira texto.

    Se houver problemas, lança `PlanFormatError` com **todos** eles, nesta ordem: os do arquivo, depois os de cada treino (letra, nome, dias, exercícios) e por fim os de cada exercício (nome, series, reps, cargaKg, descansoSeg). Cada treino é identificado como `Treino {letra}`, ou `Treino {n}` se não tiver letra.

| Regra | Mensagem exata |
|---|---|
| sem JSON legível | `Não encontrei um plano em JSON no texto` |
| `formato` ≠ `pump-plano` | `"formato" precisa ser "pump-plano"` |
| `versao` ≠ 1 | `Versão {v} não suportada (este app lê a versão 1)` |
| `treinos` vazio ou não é lista | `"treinos" precisa ter pelo menos um treino` |
| letra vazia | `Treino {n}: "letra" vazia` |
| letra repetida | `Treino {letra}: "letra" repetida` |
| nome vazio | `Treino {letra}: "nome" vazio` |
| dia inválido | `Treino {letra}: dia "{d}" inválido (use seg, ter, qua, qui, sex, sab, dom)` |
| sem exercícios | `Treino {letra}: precisa ter pelo menos um exercício` |
| nome do exercício vazio | `Treino {letra}, exercício {i}: "nome" vazio` |
| series fora de 1–20 ou não inteiro | `Treino {letra}, exercício {i}: "series" precisa ser um número inteiro de 1 a 20` |
| reps vazio | `Treino {letra}, exercício {i}: "reps" vazio` |
| cargaKg presente e não número ≥ 0 | `Treino {letra}, exercício {i}: "cargaKg" precisa ser um número maior ou igual a 0` |
| descansoSeg presente e não inteiro ≥ 0 | `Treino {letra}, exercício {i}: "descansoSeg" precisa ser um número inteiro maior ou igual a 0` |

  - `planFromFormat(f, catalog: Exercise[], customs: CustomExercise[]): { plan: WorkoutPlan; newCustoms: CustomExercise[]; unmatched: string[]; ignoredDiet: boolean }`:
    - **Casamento:** por `normalize(nome)` contra os `customs` primeiro e depois o catálogo.
    - **Sem par:** vira um `CustomExercise` novo (`custom-<uuid>`, `muscles: []`, `note: obs`). O mesmo nome sem par repetido reaproveita o mesmo custom novo.
    - `cargaKg` ausente vira 0, `descansoSeg` ausente vira 90 (`PLAN_DEFAULTS`), e `obs` vira `note`.
    - Os dias são convertidos pra 0–6, e cada treino ganha um `id` novo (`crypto.randomUUID()`).
  - `exportPlanFormat(plan: WorkoutPlan): PumpPlanoFile`.
  - `LLM_PROMPT: string`: texto fixo em pt-BR que:
    - explica o formato com os mesmos campos e regras da tabela;
    - traz um exemplo com 1 treino e 2 exercícios;
    - pede nomes como se fala em academia no Brasil;
    - pede pra responder **só** com o JSON.
  - `<PlanImport onDone={() => void} />`:
    - **Botões:** "Copiar prompt pra IA" e "Copiar meu plano no formato Pump" (via `navigator.clipboard.writeText`). Mais um textarea "Cole aqui a resposta da IA", "Escolher arquivo" (`accept=".json,application/json,text/plain"`) e "Revisar".
    - **"Revisar"** mostra os problemas em lista ou um resumo: treinos com a contagem de exercícios, "Viraram exercícios seus: …" e "A parte de dieta foi ignorada (chega na próxima versão)".
    - **"Importar"** grava `workoutPlan` e acrescenta `newCustoms` em `customExercises`. Quem sincroniza as fotos é o App.
    - **Sem internet** (se `fetchCatalog` falhar): "Precisa de internet pra casar os exercícios com o catálogo", e não importa.

- [ ] **Step 1: Escrever os testes que falham**

```ts
const ok = { formato: 'pump-plano', versao: 1, treinos: [{ letra: 'A', nome: 'Peito', dias: ['seg', 'qui'], exercicios: [{ nome: 'supino reto com barra', series: 4, reps: 10, cargaKg: 40 }, { nome: 'Remada na máquina do Zé', series: 3, reps: '12', obs: 'banco 3' }] }] }
const catalog = [ex('Supino reto com barra', { id: 'Barbell_Bench_Press_-_Medium_Grip' })]
const noId = (p: WorkoutPlan) => p.workouts.map(({ id, ...w }) => w)

test('aceita JSON dentro de bloco de código da resposta da IA', () => {
  expect(parsePlanFormat('Aqui está:\n```json\n' + JSON.stringify(ok) + '\n```\nBom treino!').treinos[0].exercicios[0].reps).toBe('10')
})
test('lista todos os problemas em pt-BR, na ordem', () => {
  const bad = { formato: 'pump-plano', versao: 1, treinos: [{ letra: 'A', nome: 'X', dias: ['segunda'], exercicios: [{ nome: '', series: 'quatro', reps: '10' }] }, { letra: 'A', nome: '', dias: [], exercicios: [] }] }
  try { parsePlanFormat(JSON.stringify(bad)); throw new Error('não lançou') }
  catch (e) { expect((e as PlanFormatError).problems).toEqual([
    'Treino A: dia "segunda" inválido (use seg, ter, qua, qui, sex, sab, dom)',
    'Treino A, exercício 1: "nome" vazio',
    'Treino A, exercício 1: "series" precisa ser um número inteiro de 1 a 20',
    'Treino A: "letra" repetida',
    'Treino A: "nome" vazio',
    'Treino A: precisa ter pelo menos um exercício',
  ]) }
})
test('recusa texto sem JSON, outro formato ou versão mais nova', () => {
  expect(() => parsePlanFormat('oi')).toThrow('Não encontrei um plano em JSON no texto')
  expect(() => parsePlanFormat('{"formato":"x","versao":1,"treinos":[]}')).toThrow()
  expect(() => parsePlanFormat('{"formato":"pump-plano","versao":2,"treinos":[]}')).toThrow()
})
test('casa com o catálogo ignorando acento/caixa; o resto vira exercício seu', () => {
  const r = planFromFormat(parsePlanFormat(JSON.stringify(ok)), catalog, [])
  const [w] = r.plan.workouts
  expect(w).toMatchObject({ label: 'A', name: 'Peito', weekdays: [1, 4] })
  expect(w.exercises[0]).toMatchObject({ exerciseId: 'Barbell_Bench_Press_-_Medium_Grip', sets: 4, reps: '10', weightKg: 40, restSec: 90 })
  expect(w.exercises[1]).toMatchObject({ custom: true, name: 'Remada na máquina do Zé', weightKg: 0, note: 'banco 3' })
  expect(r.unmatched).toEqual(['Remada na máquina do Zé'])
  expect(r.newCustoms).toHaveLength(1)
})
test('mesmo nome sem par duas vezes reaproveita um só exercício seu', () => {
  const two = { ...ok, treinos: [ok.treinos[0], { ...ok.treinos[0], letra: 'B', dias: ['ter'] }] }
  expect(planFromFormat(parsePlanFormat(JSON.stringify(two)), catalog, []).newCustoms).toHaveLength(1)
})
test('exportar e reimportar devolve o mesmo plano (fora os ids)', () => {
  const r = planFromFormat(parsePlanFormat(JSON.stringify(ok)), catalog, [])
  const again = planFromFormat(parsePlanFormat(JSON.stringify(exportPlanFormat(r.plan))), catalog, r.newCustoms)
  expect(noId(again.plan)).toEqual(noId(r.plan))
  expect(again.unmatched).toEqual([])
})
test('dieta presente é ignorada com aviso nesta fase', () =>
  expect(planFromFormat({ ...parsePlanFormat(JSON.stringify(ok)), dieta: {} }, catalog, []).ignoredDiet).toBe(true))
```

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar `planFormat.ts`. Rodar `bun run test`. Esperado: PASS.
- [ ] **Step 4:** Implementar `PlanImport.tsx`. Rodar `bun run test` e `bun run build`. Esperado: PASS e build sem erro.
- [ ] **Step 5:** Commit `feat: pump plan format for llm-assisted import/export`.

---

### Task 10: Aba Treino (dia a dia)

**Files:**
- Create: `src/workout/TreinoTab.tsx`, `src/workout/ExerciseRow.tsx`, `src/workout/ExercisePreview.tsx`, `src/workout/RestBanner.tsx`, `src/workout/SetEditor.tsx`, `src/shell/Toast.tsx`
- Modify: `src/App.tsx` (a aba treino usa `TreinoTab`)
- Test: `src/workout/TreinoTab.test.tsx`

**Interfaces:**
- Consumes: `workoutForDate`, `startSession`, `setDone`, `setRestEnd`, `completeSession`, `remainingSec`, `unlockAudio`, `beep` (Task 7); `usePersisted('workoutPlan' | 'workoutLog')`, `todayKey`, `formatDayLabel` (Task 2); `imageUrl` (Task 6); `PlanEditor` (Task 8); `pe` (helpers).
- Produces: `<TreinoTab />` e `<Toast message={string} />` (aviso no topo por 2 s, com `--card`/`--card-border` e `role="status"`).

**Comportamento** (spec §7.2, mockup `docs/design/mockup-dia-a-dia-v2.html`):

- **Dia fixo enquanto a tela estiver aberta:** `const [today] = useState(() => todayKey())`. Assim, um treino que passa da meia-noite continua no mesmo dia.
- **Fonte das linhas:**
  - Se existe `workoutLog[today]`, tudo vem **só da sessão**.
  - Senão, vem do treino escolhido: `workoutForDate(plan, today)`, ou o escolhido à mão (`useState<string>` com o id).
  - A sessão é criada (`startSession`) no primeiro toque numa série.
- **Topo:** label `{formatDayLabel(today)} · TREINO {label}` em `--label`, maiúsculo, e o nome do treino em `--strong`.
- **Descanso** (dia sem treino e sem sessão): o título "Dia de descanso" e a lista de treinos do plano pra escolher um.
- **Linha do exercício** (`ExerciseRow`):
  - Miniatura de 40 px: um botão com `aria-label="Ver {nome}"`, que abre o preview. Usa a `<img>` de `imageUrl(images[0])`, ou o ícone `Dumbbell` sem `<img>` quando não tem foto.
  - O nome e a linha `{séries} × {reps} · {carga} kg`.
  - Embaixo, a fileira de tracinhos, que quebra linha se precisar. Cada tracinho é desenhado com 16×5 px **dentro de um botão de 44×44**, com `aria-label="Série {n} de {nome}"` e `aria-pressed`.
  - **Os tracinhos substituem o círculo `.chk` do mockup:** não existe check por exercício.
  - Botão "Editar" (ícone `Pencil`, `aria-label="Editar séries de {nome}"`), que abre o `SetEditor`: lista as séries feitas, com steppers de reps (texto) e carga (±2,5). **Não existe segurar pra editar.**
- **Marcar série:**
  - Chama `unlockAudio()` **dentro do handler**.
  - Grava `setDone` com `{ reps, weightKg }` da linha e `setRestEnd(now + restSec*1000)` na mesma gravação da sessão.
  - Tocar de novo desmarca, sem mexer no cronômetro.
- **RestBanner:** aparece quando `session.restEndsAt` existe e o tempo restante é maior que 0. Usa `--soft-bg`/`--soft-border`, `mm:ss` em `--accent`, e os botões "Pular" (grava `setRestEnd(undefined)`) e "+15 s".
  - Atualiza a cada 250 ms com `remainingSec`.
  - Quando o tempo chega a 0 com a tela aberta, chama `beep()` uma vez e limpa o `restEndsAt`.
  - Se ao montar o tempo já for 0, limpa sem bipar.
- **Preview** (`ExercisePreview`, `role="dialog"`): alterna `images[0]` e `images[1]` a cada 1 s, e mostra as instruções numeradas e a `note`. Sem fotos, mostra só o texto. A tela de cima fica com fundo escurecido.
- **"Concluir treino":**
  - Fica desabilitado enquanto não houver sessão.
  - Ao tocar, grava `completeSession` e mostra o toast "Treino concluído".
  - Depois disso, o botão vira "Treino concluído" com o ícone `Check`, desabilitado. As séries continuam editáveis, pra corrigir erro.
- **Sem plano:** o CTA "Montar treino", que abre o `PlanEditor`.

**Fixture dos testes:**

```ts
const plano: WorkoutPlan = { workouts: [
  { id: 'a', label: 'A', name: 'Peito e tríceps', weekdays: [1], exercises: [
    pe({ exerciseId: 'Supino', name: 'Supino reto', sets: 2, reps: '10', weightKg: 40, restSec: 60, images: ['S/0.jpg', 'S/1.jpg'] }),
    pe({ exerciseId: 'custom-1', name: 'Remada X', custom: true, note: 'banco 3' }),
  ] },
] }
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })   // só o relógio; IndexedDB/findBy/user-event seguem com timers reais
  vi.setSystemTime(new Date(2026, 10, 16, 18, 0)) // segunda
  await save('workoutPlan', plano)
})
afterEach(() => vi.useRealTimers())
```

- [ ] **Step 1: Escrever os testes que falham**

```tsx
test('marcar série inicia descanso e persiste; concluir grava check-in', async () => {
  const user = userEvent.setup()
  render(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  expect(await screen.findByText('01:00')).toBeInTheDocument()
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].exercises[0].sets[0]).toEqual({ reps: '10', weightKg: 40 }))
  await user.click(screen.getByRole('button', { name: 'Concluir treino' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].completedAt).toBeDefined())
})
test('descanso sobrevive a recarregar: restante calculado do relógio', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  await waitFor(async () => expect((await load('workoutLog'))?.['2026-11-16'].restEndsAt).toBeDefined())
  unmount()
  vi.setSystemTime(new Date(2026, 10, 16, 18, 0, 30))
  render(<TreinoTab />)
  expect(await screen.findByText('00:30')).toBeInTheDocument()
})
test('editar o plano no meio do treino não muda o que está na tela', async () => {
  const user = userEvent.setup()
  render(<TreinoTab />)
  await user.click(await screen.findByRole('button', { name: 'Série 1 de Supino reto' }))
  await act(() => save('workoutPlan', { workouts: [{ ...plano.workouts[0], exercises: [pe({ name: 'Outro', reps: '5' })] }] }))
  expect(await screen.findByText('2 × 10 · 40 kg')).toBeInTheDocument()
  expect(screen.queryByText('Outro')).not.toBeInTheDocument()
})
test('domingo sem treino mostra Dia de descanso', async () => {
  vi.setSystemTime(new Date(2026, 10, 22, 10, 0))
  render(<TreinoTab />)
  expect(await screen.findByText('Dia de descanso')).toBeInTheDocument()
})
test('exercício sem foto: ícone na miniatura e preview só com texto', async () => {
  const user = userEvent.setup()
  render(<TreinoTab />)
  const thumb = await screen.findByRole('button', { name: 'Ver Remada X' })
  expect(within(thumb).queryByRole('img')).not.toBeInTheDocument()
  await user.click(thumb)
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText('banco 3')).toBeInTheDocument()
  expect(within(dialog).queryByRole('img')).not.toBeInTheDocument()
})
```

O ícone lucide é um `<svg>` sem role `img`: use `aria-hidden="true"` nele.

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar os componentes.
- [ ] **Step 4:** Rodar `bun run test`. Esperado: PASS.
- [ ] **Step 5: Conferência visual.**
  - Rodar `bun run dev` e abrir `http://localhost:5173/pump/` no Playwright MCP, em 390×844, depois de salvar o plano da fixture via `browser_evaluate` (ou pela montagem).
  - Comparar com o mockup: tema, menu em pílula, banner do descanso, tracinhos e alvos ≥ 44 px.
  - No fim, fechar o browser (`browser_close`) e apagar `.playwright-mcp/`.
- [ ] **Step 6:** Commit `feat: daily workout tab with set tracking, rest timer, preview and check-in`.

---

### Task 11: Montagem, configurações, convite de instalação, sync de previews e service worker

**Files:**
- Create:
  - `src/onboarding/Onboarding.tsx`, `src/shell/SettingsScreen.tsx`, `src/shell/InstallGate.tsx`, `src/shell/platform.ts`
  - `src/sw.ts`, `tsconfig.sw.json`
  - `public/icon.svg`, `pwa-assets.config.ts`
  - PNGs gerados em `public/`: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`
- Modify: `vite.config.ts` (PWA), `tsconfig.json` (referência ao `tsconfig.sw.json`), `tsconfig.app.json` (excluir `src/sw.ts`), `src/App.tsx`, `src/main.tsx`, `index.html` (links de ícone), `package.json`, `bun.lock`
- Test: `src/shell/platform.test.ts`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `exportBackup`, `importBackupFile`, `backupDue`, `allData`, `usePersisted`, `DEFAULT_SETTINGS` (Tasks 2–3); `PlanEditor`, `TEMPLATES`, `instantiateTemplate` (Task 8); `PlanImport` (Task 9); `syncPreviewCache` (Task 6); `fetchCatalog` (Task 6).
- Produces:
  - `isIOS(ua: string, maxTouchPoints = 0): boolean`, que pega também iPad se passando por Mac (`Macintosh` com `maxTouchPoints > 1`).
  - `isStandalone(): boolean`, que vem de `matchMedia('(display-mode: standalone)').matches` ou de `(navigator as { standalone?: boolean }).standalone === true`.

**App, na ordem:**

1. **Sync de previews:** no `App`, um `useEffect` com dependência no `workoutPlan` (`usePersisted('workoutPlan', { workouts: [] })`) chama `syncPreviewCache(workoutPlan)` quando o plano carrega e a cada mudança. É o **único** lugar que sincroniza: cobre editar, importar plano, restaurar backup e a montagem.
2. **InstallGate** aparece se `isIOS(navigator.userAgent, navigator.maxTouchPoints) && !isStandalone() && !settings.installDismissed`:
   - Explica "Compartilhar → Adicionar à Tela de Início" e diz que só assim o iPhone não apaga os dados.
   - "Continuar no navegador mesmo assim" grava `installDismissed: true`, com o aviso: "Os dados daqui não passam sozinhos pro app instalado."
   - Se `allData()` não estiver vazio, oferece "Exportar backup" (`exportBackup`), pra importar no app depois.
3. **Onboarding** aparece se `!settings.onboardingDone`. Os passos têm "Pular" e "Voltar":
   - **Perfil:** sexo (M/F), altura em cm e peso em kg, gravados em `profile`.
   - **Treino,** com três opções:
     - um dos `TEMPLATES` (card com nome e descrição): faz `fetchCatalog`, e então `instantiateTemplate` → `<PlanEditor initial={…}>`. Se a busca do catálogo falhar: "Sem internet pra carregar o modelo. Monte do zero com seus exercícios ou tente de novo";
     - "Montar do zero": `<PlanEditor initial={{ workouts: [] }}>`;
     - "Importar de uma IA": `<PlanImport>`.
   - **Fim:** grava `{ ...settings, onboardingDone: true, firstUseAt: settings.firstUseAt ?? todayKey() }`.
4. **Abas,** com o ícone `Settings` (lucide) no topo à direita, que abre a `SettingsScreen`:
   - "Editar treino" (`PlanEditor`);
   - "Importar/exportar plano (IA)" (`PlanImport`);
   - "Editar perfil";
   - "Exportar backup";
   - "Importar backup", que abre um file input `accept=".json,application/json"`, pede `confirm('Isso substitui todos os seus dados. Continuar?')`, chama `importBackupFile` e então `location.reload()`. Em erro, mostra a mensagem;
   - "Refazer montagem", que grava `onboardingDone: false` e mantém os dados.

   Quando `backupDue(settings, todayKey())`, aparece uma faixa no topo das abas, com `--soft-bg`/`--soft-border` e texto `--text`: "Faz 14 dias sem backup", com o botão "Exportar".

**Service worker e PWA:**
- **Dependências:** `bun add -d vite-plugin-pwa workbox-precaching workbox-routing workbox-core @vite-pwa/assets-generator`.
- **`vite.config.ts`:** `VitePWA({ strategies: 'injectManifest', srcDir: 'src', filename: 'sw.ts', injectRegister: false, injectManifest: { globIgnores: ['**/catalog/**'] }, manifest: {...} })`.
  - **Sem `registerType`**: o padrão é `prompt`, sem mostrar prompt nenhum. A versão nova fica esperando e entra quando o app é fechado de vez.
  - O `globIgnores` só documenta a intenção, porque o padrão já não pega `.json`.
- **Registro:** em `src/main.tsx`, `import { registerSW } from 'virtual:pwa-register'; registerSW({ immediate: true })`. Pra tipar, colocar `/// <reference types="vite-plugin-pwa/client" />`.
- **`src/sw.ts`:**
  ```ts
  /// <reference lib="webworker" />
  declare let self: ServiceWorkerGlobalScope
  import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
  import { registerRoute, NavigationRoute } from 'workbox-routing'
  precacheAndRoute(self.__WB_MANIFEST)
  cleanupOutdatedCaches()
  registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))
  // fotos: só lê o cache do plano; nunca grava aqui
  registerRoute(({ url }) => url.hostname === 'cdn.jsdelivr.net',
    async ({ request }) => (await (await caches.open('pump-previews-v1')).match(request)) ?? fetch(request))
  // sem rota para catalog/: vai sempre à rede
  ```
  - Não chamar `skipWaiting` nem `clientsClaim`.
  - Usar `tsconfig.sw.json` com `"lib": ["ES2022", "WebWorker"]` e `include: ["src/sw.ts"]`. Referenciar ele no `tsconfig.json` e excluir o `src/sw.ts` do `tsconfig.app.json`.
- **Manifest:**
  - `name` e `short_name`: `Pump`, com `lang: 'pt-BR'`;
  - `display: 'standalone'`, `background_color` e `theme_color` `#121315`;
  - `start_url` e `scope`: `/pump/`;
  - `icons`: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png` e `maskable-icon-512x512.png` (com `purpose: 'maskable'`).
  - No `index.html`: `<link rel="apple-touch-icon" href="/pump/apple-touch-icon-180x180.png">` e o favicon.
- **Ícone:** `public/icon.svg` (exato):
  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#121315"/><g transform="translate(96 96) scale(13.333)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"/><path d="m2.5 21.5 1.4-1.4"/><path d="m20.1 3.9 1.4-1.4"/><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"/><path d="m9.6 14.4 4.8-4.8"/></g><circle cx="396" cy="116" r="30" fill="#c6ff3d"/></svg>
  ```
  `pwa-assets.config.ts` usa `defineConfig({ preset: minimal2023Preset, images: ['public/icon.svg'] })` de `@vite-pwa/assets-generator/config`. Rodar `bunx pwa-assets-generator` e commitar os PNGs gerados.

- [ ] **Step 1: Escrever os testes que falham**

```tsx
test('isIOS reconhece iPhone e iPad-como-Mac', () => {
  expect(isIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(true)
  expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true)
  expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
})
test('primeira vez abre a montagem; pular leva à aba Treino; depois abre na última aba', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<App />)
  expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Pular' }))   // perfil
  await user.click(screen.getByRole('button', { name: 'Pular' }))   // treino
  expect(await screen.findByRole('button', { name: 'Treino' })).toHaveAttribute('aria-current', 'page')
  await waitFor(async () => expect((await load('settings'))?.onboardingDone).toBe(true))
  unmount()
  await save('settings', { ...(await load('settings'))!, lastTab: 'dieta' })
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Dieta' })).toBeInTheDocument()
  expect(screen.getByText('Em breve')).toBeInTheDocument()
})
```

No jsdom, `matchMedia` não existe e o user agent não é de iOS. Para esses testes, mockar `window.matchMedia = vi.fn(() => ({ matches: false }))` no `test/setup.ts`, assim o InstallGate não aparece. O `syncPreviewCache` precisa de `caches`: definir `globalThis.caches = fakeCacheStorage({})` no setup.

- [ ] **Step 2:** Rodar `bun run test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar. Rodar `bun run test` e `bun run build`. Esperado: PASS e build sem erro, com o `dist/sw.js` gerado.
- [ ] **Step 4: Conferência do PWA no Playwright.**
  1. Rodar `bunx vite preview` e abrir `http://localhost:4173/pump/`.
  2. **Pré-condição:** fazer a montagem com "Montar do zero" e um treino marcado em **todos os dias**, com 1 exercício do catálogo (precisa de internet), e salvar.
  3. Com `browser_evaluate`, conferir:
     - `navigator.serviceWorker.controller` não é nulo (recarregar uma vez, se precisar);
     - `caches.keys()` contém o precache do workbox e `pump-previews-v1`, e este tem as 2 fotos;
     - nenhuma URL do precache contém `catalog/`.
  4. Rodar `await page.context().setOffline(true)` via `browser_run_code_unsafe`, recarregar e conferir que o app abre no treino de hoje com a miniatura aparecendo.
  5. Fechar o browser e apagar `.playwright-mcp/`.
- [ ] **Step 5:** Commit `feat: onboarding, settings, ios install gate, preview sync and service worker`.

---

### Task 12: Publicar no GitHub Pages e testar no iPhone

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `README.md`, em pt-BR:
  - o que é o app;
  - como rodar (`bun install`, `bun run dev`, `bun run test`);
  - como instalar no iPhone;
  - que os dados ficam só no aparelho e precisam de backup;
  - os "Limites conhecidos" do cabeçalho deste plano.

- [ ] **Step 1: Escrever `.github/workflows/pages.yml`:**
  - `on: push: branches: [main]` e `workflow_dispatch`;
  - `permissions: { contents: read, pages: write, id-token: write }`;
  - `concurrency: { group: pages, cancel-in-progress: true }`.

  Job `build` (`ubuntu-latest`):
  1. `actions/checkout@v4`
  2. `oven-sh/setup-bun@v2` com `bun-version: 1.4.4`
  3. `bun install --frozen-lockfile`
  4. `bun run test`
  5. `bun run build`
  6. `actions/configure-pages@v5`
  7. `actions/upload-pages-artifact@v3` com `path: dist`

  Job `deploy`:
  - `needs: build`;
  - `environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }`;
  - um step `actions/deploy-pages@v4` com `id: deployment`.
- [ ] **Step 2:** Atualizar o README e commitar: `git add .github README.md && git commit -m "ci: github pages deploy and readme"`.
- [ ] **Step 3: PARAR e perguntar ao Yago:** "Posso criar o repositório público `yagoramires/pump` e publicar no GitHub Pages?" Só seguir com um sim explícito. Se ele escolher outro nome, ajustar o `base` e o manifest (Global Constraints), rodar `bun run test` e `bun run build` e commitar antes de seguir.
- [ ] **Step 4: Criar o repo e ativar o Pages antes do primeiro push.**
  1. `gh repo create yagoramires/pump --public --source . --remote origin` (sem `--push`)
  2. `gh api -X POST repos/yagoramires/pump/pages -f build_type=workflow`
  3. `git push -u origin main`
- [ ] **Step 5:** Rodar `gh run watch` (esperado: build e deploy verdes) e depois `curl -sI https://yagoramires.github.io/pump/ | head -1` (esperado: `HTTP/2 200`).
- [ ] **Step 6: Teste no iPhone (pelo Yago),** que é o critério de pronto da spec §11. Passar a lista pra ele:
  1. Abrir no Safari, ver o convite e instalar pela tela de início.
  2. No app instalado, fazer a montagem com um plano pronto que tenha treino hoje (ou montar do zero com hoje marcado) e salvar.
  3. Ativar o modo avião, fechar o app de vez e abrir. Esperado: o treino de hoje abre e as fotos do plano aparecem.
  4. Marcar uma série, bloquear a tela por 30 s e voltar. Esperado: o cronômetro mostra o tempo certo. Com o app aberto até zerar e a chave de silêncio desligada, o bipe toca.
  5. Exportar o backup (folha de compartilhar → Salvar em Arquivos), apagar o app, instalar de novo e importar.
     - **Esperado:** voltam o perfil, o plano, o histórico de hoje e os exercícios criados.
     - **E também:** com o modo avião depois de reabrir, as fotos aparecem.
- [ ] **Step 7:** Registrar no README a data do teste e o resultado, commitar `docs: record iphone verification` e dar `git push`, já autorizado no Step 3.
