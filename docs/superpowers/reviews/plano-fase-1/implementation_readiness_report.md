# Stage 9: Implementation Readiness (DetailedRange, L44–631)

Reviewers:
- **egm-implementation-readiness** (completed): 4 🔴, 13 🟡, ~13 🟢. Verdict: NOT READY.
- **egm-codebase-details** (completed): 2 🔴, 12 🟡, ~18 🟢. Verdict: not ready. Checked against local vitest 5.0.5 and vite 8.3.5 from the sibling `yield` project; everything else from memory.
- **egm-style** (completed): 2 🔴, 18 🟡, 13 🟢. Verdict: not ready.

## 🔴 Blockers (deduplicated)

| # | Problem | Lines | Raised by |
|---|---|---|---|
| B1 | **The roundtrip test can never pass.** New `randomUUID` vs `toEqual` on `workouts`. Fix: compare without `id`. | 499–504 vs 510 | IR, CD, ST |
| B2 | **The session copies too little.** The row reads the live plan, and the join breaks after an edit (or with a repeated exercise). There is no `workoutLabel`. Fix: copy reps, weightKg, restSec, images, instructions and note, plus `workoutLabel`. | 131–132, 342, 530–533 | IR (ST M14) |
| B3 | **Stale `usePersisted` copies overwrite restored or saved data.** Fix: a shared store or change event, plus `location.reload()` after import. | 140, 162, 164, 182–183, 396, 582 | IR |
| B4 | **Scaffolding can delete `docs/` and `.superpowers/`.** `bun create vite .` runs in a non-empty folder with nothing committed. Fix: commit `docs/` first and scaffold in a temp folder. | 91 | IR (CD M11, ST M1) |
| B5 | **`vi.useFakeTimers()` with default options freezes fake-indexeddb, `findBy*` and user-event.** Checked in local vitest 5.0.5: by default it fakes `setTimeout`/`setInterval`/`setImmediate`. Fix: `toFake: ['Date']` or only `vi.setSystemTime`, `userEvent.setup({advanceTimers})`, and `waitFor` on reads. | 538–553 | CD (IR M7, ST M13) |
| B6 | **Task 12 commit and Pages order.** The workflow is not committed before the push, Pages is enabled after `--push`, and the Step 6 push is unclear. Fix: commit, `gh repo create` without `--push`, enable Pages, then push. | 621–631 | ST (IR M13, CD M9) |

## 🟡 Majors (deduplicated)

1. **Task 1 toolchain:**
   - `test:` inside vite's `defineConfig` fails `tsc -b`. Use `vitest/config` or a reference.
   - Add `globals: true` + `types: ["vitest/globals","@testing-library/jest-dom"]`, or explicit imports.
   - Import `jest-dom/vitest` in setup.
   - `git init -b main`.
   - `src/types.ts` is missing from Create.
   - The viewport `<meta>` belongs in `index.html`, not `theme.css`.
   
   (IR M1, CD M1, ST M2/M3)
2. **Incomplete file lists:**
   - files the template generates (tsconfig.app/node, eslint, App.css, react.svg, vite.svg, README, bun.lock);
   - `App.tsx` changed in Task 2;
   - generated PNGs, assets config and `workbox-core` in Task 11;
   - README is Modify in Task 12.
   
   (IR M2, CD M11)
3. **`TZ` is not set in the tests**, so the `todayKey` bug passes in UTC CI. `weekday` must parse the date as local (`new Date(y,m-1,d)`). (CD M2)
4. **Search tie-break:** the test expects alphabetical order inside the prefix group, but this isn't specified. Also not specified: substring matching, empty query, and whether the muscle filter includes secondary muscles. (CD M3, ST M10)
5. **Batch order "por id" is ambiguous**, so parallel batches can overlap or leave gaps. Use `.sort()` (code-unit order), or have the script write `batches.json`. Importing the script in the test can run `process.exit`: guard with `if (import.meta.main)`. (IR M3, ST M7)
6. **The glossary shape is only implied** (the `"null"` key, `level`). In the Task 4 test, `up` is used outside its scope. (ST M8/M9)
7. **Templates are delegated to the implementer.** Specify the exact ids, labels, descriptions and the ABCD day mapping. (IR M4, ST N9)
8. **PlanEditor, Onboarding and CatalogPicker interfaces:**
   - Missing an `initial?: WorkoutPlan` prop (or "Onboarding saves first").
   - What happens offline during onboarding.
   - Reps is text, not a stepper. Step sizes for kg and rest are not set.
   - Who saves the custom exercise and generates its id.
   - How `label` is assigned, and whether there is a cancel.
   - `toPlanExercise` defaults.
   
   (IR M5, ST M15)
9. **Task 9 validation is underspecified at a trust boundary:**
   - numeric reps;
   - types of `cargaKg`/`descansoSeg`;
   - positive integer `series`;
   - empty lists;
   - duplicated `letra`;
   - bad JSON;
   - the same unmatched name twice should reuse one custom exercise.
   
   (IR M6, CD nit)
10. **Placeholder tests** (L554, L600) pass while empty. Write them out. (IR M8, CD M12, ST M12)
11. **Undefined test helpers and fixtures:** `ex`, `planWith`, `cachedUrls`, `planOf`, `workoutOf`, `exercise`, the Task 10 fixture, and the `keys()` order of `fakeCacheStorage`. (CD M12, ST M11)
12. **Task 10 vs the mockup:**
    - The `.chk` circle is missing.
    - Long-press and "editar" are undefined.
    - 44 px hit area for the 16×5 px dashes.
    - "Concluir" with no session; marking after completing; does unmarking stop the timer?
    - The `aria-label` "Série N de X" is only in the test.
    
    (IR M9, ST M13)
13. **The `beep` is silent on iOS.** Use a shared AudioContext unlocked in the set tap. Also, the silent switch mutes it and iOS has no vibrate. (IR M10, CD M5)
14. **SW:**
    - `autoUpdate` with injectManifest needs `skipWaiting`/`clientsClaim` (`workbox-core`), plus `cleanupOutdatedCaches` and `createHandlerBoundToURL`.
    - `sw.ts` needs WebWorker types.
    - **Note:** Stage 8 recommends dropping `autoUpdate` instead (a new version applies on the next cold start).
    
    (IR M11, CD M4)
15. **Preview cache after importing a backup.** (IR M12)
16. **iOS export:** `<a download>` with a blob doesn't open the share sheet and fails in standalone mode. Use `navigator.share({files})` with an anchor fallback, plus `accept=".json"` on the import input. (CD M6, medium confidence)
17. **Non-atomic `replaceAll`.** (CD M7; Stage 8 recommends `setMany` then `delMany`)
18. **Task 10 test reads IndexedDB before the write finishes.** Use `waitFor`/`expect.poll`. (CD M8)
19. **Icon pipeline:** the preset, the config file, the CLI and the output names are not specified. (CD M10)
20. **The `usePersisted('settings').lastTab` call doesn't match the tuple** it returns. The initial `Settings` value is missing. (ST M4)
21. **Not specified:**
    - the `pump:storage-error` payload;
    - which token the "faixa vermelha" uses;
    - the `lastBackupAt` format and that it is parsed as a local date.
    
    (ST M5/M6)
22. **Steps with no verification:** Task 8 steps 4–5, Task 9 step 5, and the Task 5 review. (ST M18)
23. **PWA check preconditions:** a plan whose weekdays include today must be saved first. The dev URL is `/pump/`. (ST M16, CD nit)

## 🟢 Nits (selection)
- Pin `bun-version`.
- `save<K extends keyof UserData>`.
- `Settings` type vs `Settings.tsx`: rename to `SettingsScreen`.
- `navigator.standalone` needs a cast.
- The date label: `Intl` produces "seg."/"nov.", so use arrays.
- "Treino concluído ✓" uses a character: use the icon.
- "No padrão do NeyHub" is invisible to a subagent: provide the SVG.
- The `D S T Q Q S S` chips need an `aria-label`.
- `@testing-library/dom` is a peer dependency.
- jsdom `File.text()`: assert the error message.
- Check the vite-plugin-pwa peer range with Vite 8.
- `globIgnores` has no effect (`.json` isn't in the default `globPatterns`), but it documents intent.
- "Refazer montagem" is undefined.
- `fetchCatalog` should throw on `!res.ok`.
