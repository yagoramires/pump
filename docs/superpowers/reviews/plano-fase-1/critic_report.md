# Stage 7: Critic Review (FeatureRange, L1–43)

Reviewers: egm-design (completed, 8 🟡 / 5 🟢), egm-structural (completed, 3 🟡 / 6 🟢), egm-style (completed, 5 🟡 / 9 🟢).
Context: the spec and mockup v2. Standard: feature-spec-standard (for design and structural).

## egm-design: revise before execution

1. 🟡 **L36: the `todayKey` test does not catch the bug in CI.** GitHub Actions runs in UTC. Fix: `"test": "TZ=America/Sao_Paulo vitest run"`, or set it in the vitest setup.
2. 🟡 **L37: Review Focus 2 is only half backed.** The session copies only 3 fields, so the row reads the live plan, and `setDone(exIdx)` goes out of sync. Fix: copy the whole `PlanExercise`, and render from the session.
3. 🟡 **L39: Review Focus 4 promises more than the design delivers.**
   - `endAt` lives only in React state, so it is lost when iOS kills the app or when `autoUpdate` reloads it.
   - `beep` needs an AudioContext unlocked by a tap.
   - Fix: persist `restEndAt`, unlock the AudioContext on the set tap, and state that the alert only fires while the app is in the foreground.
4. 🟡 **L7/L26: preview sync only happens at some callers.** It doesn't run after restoring a backup, and failures are never retried. Fix: sync on boot and whenever `workoutPlan` changes.
5. 🟡 **L38: Review Focus 3 covers parsing only.**
   - `clear` and `setMany` run in separate transactions.
   - A pump v1 file with a malformed `data` still replaces everything.
   - Fix: one transaction (or write first, then delete stale keys), and check the shape of the known keys.
6. 🟡 **L13–17: no forward-compatibility rule for data.**
   - The Phase 3 streak ("faltar a um treino agendado quebra") needs to know what was scheduled on past days, and Phase 1 only keeps the current plan.
   - There is no `schemaVersion` or migration on boot.
   - Fix: keep a plan history with effective dates (or record the scheduled workout per day), plus `schemaVersion` with a migration step.
7. 🟡 **L36/L32: the midnight case.** A session open at 23:30 changes its key at midnight. Fix: an open session stays active until it is completed, with a test.
8. 🟡 **L1–43: no alternatives or limits.**
   - Missing one-line reasons for: `injectManifest` vs `generateSW`, idb-keyval vs Dexie, jsDelivr vs bundling the photos, lazy session creation.
   - There is no Risks & Limits section (jsDelivr, Pages, iOS eviction, SW updates).
9. 🟢 **L5: "tudo funcionando offline" is too broad.** Building or importing a plan needs internet. The Goal also leaves out the AI import, the install gate and Settings.
10. 🟢 **L17: the app opens on the last tab**, which can be the "Em breve" placeholder in Phase 1. Fix: only persist `lastTab` when it is `treino`.
11. 🟢 **L23: 44 px dashes.**
    - With 5–6 sets, they don't fit in a 390 px row. Use the visual dash inside a 44 px hit area, wrapping to its own line.
    - Say that the dashes replace the mockup's `.chk`.
    - Long-press needs `-webkit-touch-callout: none`.
12. 🟢 **L9: versions not pinned.** Pin the Vite major, `packageManager` and `bun-version` in CI.
13. 🟢 **L27: jsDelivr has no fallback.** State the spec §9 fallback: host the photos with the app.

## egm-structural: pass with changes

1. 🟡 **L24: says `navigator.storage.persist()` is missing.** **Contested by the plan itself:** Task 2 defines `requestPersist()` and Step 5 calls it at boot. egm-design checked the same point and found it covered. Optional: mention it in the Global Constraints.
2. 🟡 **L5: the Goal doesn't show the full scope** (Pump format, install gate, Settings and the backup reminder), and "Fases seguintes" doesn't list them either.
3. 🟡 **L7–9: Alternatives Rule.** idb-keyval and `injectManifest` are chosen without stating the rejected option. One sentence is enough (e.g. generateSW was rejected because the photo route must read the cache and never write to it).
4. 🟢 **"Fases seguintes"** doesn't follow the template. Rename it "Non-Goals" or make it an H2.
5. 🟢 **L21: theme tokens** are repeated as prose, with names that don't match the CSS variables in L89. Use a table keyed by variable name, or reference spec §6.
6. 🟢 **L11: the spec reference isn't a link**, and the header doesn't list the mockup.
7. 🟢 **L40: the Task 10 test** cited in Review Focus 5 is only a comment stub.
8. 🟢 **No Risks & Limits section**: jsDelivr, the catalog needing internet, iOS not vibrating.
9. 🟢 **The tasks (H3) sit under "## Estrutura de arquivos".** Add a "## Tasks" heading.

## egm-style

1. 🟡 **L5: "tudo funcionando offline" overclaims.** Limit it to gym use.
2. 🟡 **L5/L40: 876 and 3 without photos have no source** and differ from the spec's "~800, 2 fotos cada". Cite commit f00c92c. (egm-design confirmed the numbers match the upstream data in L229.)
3. 🟡 **L23: "operável com uma mão" can't be verified.** Say what is observable instead: primary actions in the lower half, no two-hand gestures.
4. 🟡 **L28 vs L31: `base: '/pump/'` is stated as fixed** while the repo name is still open. Add: "assumindo o repo `pump`; trocar `base`/escopo do SW se mudar".
5. 🟡 **L31: the publish gate is weakened.** The spec says "sem OK explícito do Yago", and the plan says "sem confirmar o nome". Restore the explicit OK to publish.
6. 🟢 **L21:** "borda" vs "border" are confusing, and the whole §6 is repeated.
7. 🟢 **L23:** the touch area vs the drawn size is unclear ("o visual pode ser menor").
8. 🟢 **L25:** drops the spec caveat "o cache HTTP não conta". Also, "nem guarda essa rota" should be "sem runtime caching".
9. 🟢 **L5:** "check-in" isn't defined. Write "Concluir treino (check-in)".
10. 🟢 **L7:** "gerado uma vez" should be "gerado em build-time por script".
11. 🟢 **L9:** version pinning is inconsistent.
12. 🟢 **L30:** "Commits curtos" has no measure.
13. 🟢 **L37:** "não quebra" isn't observable.
14. 🟢 **Headings switch** between English and pt-BR (probably the template).
