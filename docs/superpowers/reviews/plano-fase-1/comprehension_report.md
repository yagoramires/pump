# Stage 6: Comprehension Test

Target: plan for Phase 1 (FeatureRange 1–43, DetailedRange 44–631). The reviewer read the document alone, with no other context.
Reviewer: egm-comprehension (completed). **Verdict:** paraphrasable, with 0 🔴, 6 🟡 and 12 🟢.

### What this proposes
The plan builds a static, dark-only, pt-BR React + Vite PWA. It is installed on an iPhone from GitHub Pages under `/pump/`.

The user builds a weekly workout plan in one of three ways:
- from one of 5 ready-made templates;
- from scratch with an 876-exercise catalog translated into pt-BR;
- by pasting JSON in a "Pump format" produced by an outside LLM.

At the gym, the user sees today's workout, ticks off sets, runs a rest timer based on the wall clock (an `endAt` timestamp), opens an exercise preview, and checks in by completing the session. All of this works offline.

A first-run "montagem" (onboarding) and an iOS install gate come before the tabs. The Evolução and Dieta tabs are stubs ("Em breve") until Phases 2–3. Data safety relies on a manual JSON backup, with a reminder after 14 days.

### How the existing system works, per this document
There is no existing system. The repo starts empty except for `docs/`. The plan sets up this architecture:
- **User state** lives only in IndexedDB, as one `idb-keyval` key per `UserData` field. Components read and write it through a `usePersisted` hook.
- **The catalog** is a JSON file generated once at build time. A Bun script merges an upstream free-exercise-db snapshot pinned to a commit, a fixed glossary, and 18 batch files of translations written by the agent. The app fetches the file over HTTP, and the service worker never precaches it.
- **The service worker** is a custom Workbox one (`injectManifest`) that precaches only the app shell. It serves exercise photos read-only from a `pump-previews-v1` Cache API store. The page fills that store (`syncPreviewCache`) only when a plan is saved or imported.
- **A day's session** copies the exercise identity and set count from the plan. It is stored in `workoutLog` under a local `YYYY-MM-DD` key.

### Findings

1. 🟡 **The roundtrip test contradicts the workout-id rule** (L502 vs L510).
   - Each imported workout gets a new `randomUUID`, so `toEqual(r.plan.workouts)` fails on `id`.
   - Fix: compare without `id`, or make ids deterministic.
2. 🟡 **How the Treino tab gets its display data is unclear** (L37, 131, 342, 530–534).
   - The session lacks reps, weight, rest, images, instructions and note, and the plan never says how a session row joins back to the plan, or what the screen shows when the exercise was removed.
   - Also missing: whether rows come from the plan before the first set, and where a workout picked by hand on a rest day is kept before the session exists.
3. 🟡 **Shared state and the state after import are not described** (L140, 162, 164, 182–183, 396, 466, 581–582).
   - Several `usePersisted` hooks hold the same key, and nothing says how one learns about another's write.
   - Example: `downloadBackup` writes `lastBackupAt` and the App overwrites it later. It is also unclear whether the app reloads after `replaceAll`.
4. 🟡 **Backup import never re-syncs the preview cache** (L183, 582, 628–630). The iPhone test (restore, then offline previews) fails.
5. 🟡 **The local-date test depends on the machine's timezone** (L36, 147–150, 621).
   - GitHub Actions runs in UTC, so the `toISOString` bug would pass in CI.
   - Fix: set `TZ=America/Sao_Paulo` in the test script or the vitest config.
6. 🟡 **The mockup is in a gitignored folder** (L92, 527, 560). A subagent or clone in another worktree won't have it, and there is no description to fall back on.
7. 🟢 "NeyHub" is not explained (L590).
8. 🟢 "Not stored in the browser" vs the browser's HTTP cache (L25, 297). Make clear that the HTTP cache is allowed.
9. 🟢 "Descanso" means both a rest day and the rest timer (L531–533). The test looks up "Descanso".
10. 🟢 Terms defined late or never: check-in (L5), montagem (L14, 57), TACO (L14), `Workout.label` vs `name` (L128).
11. 🟢 Theme token names (L89) do not map clearly to the roles in L21 (timer = soft).
12. 🟢 The Task 10 fixture is under-specified (`Supino reto`, reps `'10'`, 40 kg). The test helpers (`ex`, `planWith`, `planOf`, `workoutOf`, `exercise`, `cachedUrls`) are not described.
13. 🟢 The plan doesn't say plainly that the executing agent writes the translations by hand, with no translation API or script (L7, 268, 281).
14. 🟢 CatalogPicker chips use "valores do glossário", but the glossary lives in `data/` and doesn't ship with the app (L431). The `Upstream`/`Glossary` types are undefined, and the coverage test skips `level`.
15. 🟢 The initial `settings` value is missing (L164). The format of `lastBackupAt` is unstated.
16. 🟢 Where the rest timer lives (memory or persisted) is unstated, and so is whether `beep` fires late (L39, 532–533).
17. 🟢 Task 1 setup:
    - `src/types.ts` is missing from the Create list.
    - `bun create vite .` in a folder that isn't empty.
    - Tests use globals without `globals: true`.
18. 🟢 Unstated prerequisites:
    - The Playwright MCP tools and `gh` must be logged in.
    - "DevTools via `browser_evaluate`" is vague.
    - `pump-previews-v1` only exists if a plan was saved first (L560, 605–611, 623).

The reviewer did not open the spec or the mockup, by design for this stage.
