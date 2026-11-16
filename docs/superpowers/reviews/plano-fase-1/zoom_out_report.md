# Stage 5: Initial Zoom Out

Target: `docs/superpowers/plans/2026-11-16-pump-fase-1-fundacao-e-treino.md`, full file. Context: the spec and mockup v2.
Reviewers: egm-zoom-out (completed), egm-inventive-catalyst (completed).

## egm-zoom-out: changes requested (2 🔴, 2 🟡, 3 🟢)

1. 🔴 **Several in-memory copies of the same key overwrite each other** (L140, 162, 164, 182-183, 577-582, 630).
   - `usePersisted` gives each component its own copy of the data.
   - Some writes go around that copy: `downloadBackup` (`lastBackupAt`), `importBackupFile` (`replaceAll`), Onboarding, and PlanEditor/PlanImport writing `workoutPlan` while TreinoTab holds its own copy.
   - Failure case: after importing a backup, marking a set saves the old `workoutLog = {}` on top of the restored history. That is the spec §4 anti-goal.
   - Fix: give each key one owner (move the state up to App, or fire a per-key change event), call `location.reload()` after an import, and add a test.
2. 🔴 **The session copy is too thin** (L37, 127, 131, 342-343, 530-534, 356-361).
   - The exercise row needs reps, weightKg, restSec, images, instructions and note, so it has to read the live plan.
   - This contradicts Review Focus #2. Also, `setDone` by `exIdx` hits the wrong exercise after a reorder.
   - Fix: `SessionExercise = PlanExercise & { sets }`, and `startSession` = `structuredClone`. Extend the test.
3. 🟡 **Preview cache sync lives in the save buttons** (L396, 439, 466, 183, 581-582).
   - Importing a backup, "Refazer montagem" and the skip paths never sync, so previews fail offline after a restore.
   - Fix: one App-level effect whenever `workoutPlan` changes, plus once on boot.
4. 🟡 **The rest timer's `endAt` has no defined home** (L39, 532-533, 584-588, 629).
   - It would live in component state and be lost when iOS kills or reloads the app.
   - `autoUpdate` can reload the app mid-workout. With `injectManifest`, that also requires `skipWaiting`/`clientsClaim`.
   - Fix: persist `restEndsAt` on the `WorkoutSession`, and document the `skipWaiting` requirement.
5. 🟢 **Fields nothing reads in Phase 1** (L126-129, 238-239): `category`, `level`, `WorkoutPlan.updatedAt`, `PlanExercise.muscles`.
6. 🟢 **Two ways to edit a set** (L532).
   - Long-press is hard to discover and clashes with iOS long-press menus. Keep only "editar".
   - Also say that the set dashes replace the mockup's `.chk` circle.
7. 🟢 **Exact name matching for the AI import** (L461, 510). Typical AI output ("Supino reto" against "Supino reto com barra") will mostly become custom exercises with no photos. This is a spec-level note.

## egm-inventive-catalyst: false compromises found (7 🟡, 3 🟢)

1. 🟡 **Multiple copies of the same key (Intermediary)**: same as zoom-out #1. Fix: a per-key store with subscriptions and `update(k, fn)`, or `location.reload()` after import, plus a two-hook test.
2. 🟡 **Restore is not atomic** (L141, 183, 198-202).
   - `clear` and `setMany` run as two separate transactions. If the write fails after `clear`, all data is lost.
   - Fix: one readwrite transaction (idb-keyval `createStore` + `store.clear()`/`put` in the same callback), plus a test where a put fails.
3. 🟡 **Failed preview downloads are never retried** (L301, 326, 586, 396, 439, 466).
   - Weak signal at save time, or iOS clearing the cache, leaves previews missing offline until the next edit.
   - Fix: also run `syncPreviewCache` at boot (when online) and on the `online` event. The latest plan must win.
4. 🟡 **Thin session, matched by position**: same as zoom-out #2.
   - Also: on a rest day where the workout was picked by hand, after a reload `workoutForDate` returns undefined.
   - Fix: draw the screen from the session only.
5. 🟡 **`endAt` only in memory, and the beep is outside a user gesture** (L345, 532-533, 629).
   - iOS only plays WebAudio from an AudioContext created or resumed during a tap, so a beep fired by a timer 60 s later stays silent.
   - Fix: persist `{endAt, exerciseId}`, and create or resume the AudioContext in the tap that marks the set, scheduling the oscillator for `currentTime + restSec`.
6. 🟡 **`autoUpdate` reloads the app mid-workout** (L584-588).
   - Fix: activate on the next cold start (`prompt` without showing a prompt, or no forced reload), and spell out `sw.ts` and the registration calls.
7. 🟡 **Name matching leaves most AI imports without photos** (L461-463, 489-498, 510).
   - Fix: build `LLM_PROMPT` when it is copied, with the list of exact catalog names and an instruction to copy them word for word. Matching stays exact. Cost: ~15-20 KB of prompt.
8. 🟢 **A workout past midnight splits into two sessions** (L530). Fix: fix the session date when it is created and keep it in the screen state.
9. 🟢 **Two workouts on the same weekday**: one is hidden without warning (L341, 437). Fix: show a picker, or warn in the editor.
10. 🟢 **Backup versioned with no migration step** (L178-180, 211). Fix: a `migrate(data, from)` that does nothing in v1.

The catalyst notes that the `autoUpdate`/`injectManifest` behavior and the `createStore` transaction were recalled from memory, not checked against the docs.
