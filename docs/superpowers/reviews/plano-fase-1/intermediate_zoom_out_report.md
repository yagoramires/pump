# Stage 8: Intermediate Zoom Out (proposed fixes, checked together)

Reviewer: egm-zoom-out (completed). **Verdict: approve after picking one fix per risk.** No 🔴, 7 🟡, 8 🟢.

## Conflicts between the proposed fixes
1. 🟡 **SW updates:** documenting `skipWaiting` (ZO-4) makes the mid-workout reload more reliable, which is the opposite of what we want. **Smallest fix:** remove `registerType: 'autoUpdate'` (the default is `prompt`), show no prompt, and don't call `skipWaiting`/`clientsClaim`. A new version takes effect on the next cold start.
2. 🟡 **The App-level preview effect** only sees PlanEditor and PlanImport saves if the shared state is fixed with a broadcast or a single owner. Reload alone isn't enough. After that, remove the 3 calls in the save buttons.
3. 🟡 **Shared state, three options, pick one:**
   - **Pick:** a per-key set of listeners in `db.ts` (`save()` notifies every hook holding the key), `location.reload()` after `importBackupFile`, and a test with two hooks on the same key.
   - **Reject:** `update(k, fn)` and lifting the state up to App.
   - This is a real bug: without the fix, the onboarding gate can get stuck.
4. 🟡 **A scheduled beep conflicts with "Pular" and "+15 s".** **Smallest fix:** one shared AudioContext, created or resumed in the tap that marks the set, and `beep()` at zero. Don't persist `exerciseId` in the timer.
5. 🟢 Removing long-press makes `-webkit-touch-callout` unnecessary. Keep only "editar" and the line saying the dashes replace the `.chk` circle.
6. 🟢 Removing fields must not remove `Exercise.muscles` (the filter needs it).
   - Remove `category`, `level` and `WorkoutPlan.updatedAt`. That shrinks the glossary and the Task 4 tests, and settles comprehension #14.
7. 🟢 Persisting `lastTab` only when it is `treino` (Design-10) conflicts with the spec and the L600 test. **Reject.**

## Scope the spec doesn't need
8. 🟡 **Plan history plus `schemaVersion` and migration (Design-6):** Phase 3 decides how to count the streak. **Reject for Phase 1.**
9. 🟢 **A do-nothing `migrate()` (IC-10):** speculative, since the backup already has `version`. **Reject.**
10. 🟡 **Atomic restore with `createStore` (IC-2):** heavier than needed.
    - **Smallest fix:** `setMany(data)` first, then `delMany(keys not in data)`. If the write fails, nothing is lost. No fault-injection test.
    - Keep a shallow shape check: `data` is an object, its keys are a subset of `UserData`, and `workoutPlan.workouts` is an array.
11. 🟢 **Deferred or rejected:**
    - the `online` listener plus the latest-plan-wins guard (a boot sync is enough, plus a `shortcut:` comment);
    - a runtime fallback for jsDelivr;
    - `packageManager` and a pinned Vite major (keep only `bun-version` in CI);
    - a picker for two workouts on the same day;
    - carrying an open session over past midnight (it conflicts with spec §7.2; use `const [today] = useState(todayKey)` instead);
    - heading renames;
    - a prompt containing the catalog names (**ask Yago**; the default is to defer).
12. 🟢 **Doc additions:** a single ~6-line "Limites conhecidos" block, one clause each for `injectManifest` and idb-keyval in Architecture, and a CSS-variable-to-value table in Task 1 in place of the L21 prose.

## Endorsed
13. 🟡 **Session snapshot:**
    - `SessionExercise = PlanExercise & { sets }` via `structuredClone`, removing `plannedSets`.
    - Keep `setDone` by `exIdx`, since the order is frozen.
    - Before the first tap, rows come from the scheduled or hand-picked workout (kept in screen state). After it, they come from the session only. Session creation stays lazy.
    - Rewrite the Review Focus 2 test.
14. 🟡 **Task 1 can delete `docs/`.** `bun create vite .` runs in a non-empty folder while `docs/` isn't committed. **Fix:** commit `docs/` first, or scaffold in a temp folder and copy. Also add `globals: true`, import `jest-dom/vitest` in setup, and add `src/types.ts` to the Create list.
15. 🟢 **One-line fixes:**
    - `TZ=America/Sao_Paulo` in the test script.
    - Strip `id` in the roundtrip comparison.
    - Copy the mockup into `docs/`.
    - CatalogPicker chips come from the catalog's unique values.
    - L31: "OK explícito do Yago".
    - Goal: "offline" only for gym use.
    - `restEndsAt?: number` is optional.

**Smallest set that covers the real risks:** items 1, 2+3, 4, 10, 13, 14 and 15, plus the limits block. About 12 local edits.

Not checked against the docs: vite-plugin-pwa `registerType`/`skipWaiting`, create-vite in a non-empty folder, and idb-keyval `createStore`.
