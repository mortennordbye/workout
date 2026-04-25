# BACKLOG

Anything Claude (or anyone) leaves unfinished, partially implemented, or explicitly defers goes here. Each entry: what, why deferred, what would unblock it, where the relevant code lives.

Don't put work-in-progress here. WIP belongs on a branch. This is for *known* gaps the team has agreed to leave for later.

When you finish an item, delete it. When you add an item, write enough that someone unfamiliar with the conversation can pick it up.

---

## Smart-progression UX

### Proper warm-up modeling (`setType` column)
- **What:** Add `set_type text default 'working'` to `program_sets` and `workout_sets` (`"working" | "warmup" | "backoff"`). UI toggle in `NewSetView.tsx` / `SetEditView.tsx` to mark a set. Algorithm skips suggestions for any set with `setType !== "working"`. AI prompt should emit `setType: "warmup"` for the first set of compound lifts when appropriate.
- **Why deferred:** The 70 % heuristic in `isProbableWarmupSet` (`src/lib/utils/progression.ts`) was shipped as Tier 1. Plan says don't add the column until real-world use proves the heuristic misclassifies — wait for concrete cases.
- **Unblocked by:** A user reporting the heuristic flagged a top set, or failed to flag an unusual warmup. Or a UX desire to label sets explicitly.
- **Touchpoints:** `src/db/schema/programs.ts`, `src/db/schema/workout-sets.ts`, `src/lib/actions/workout-sets.ts:806-826` (warmup filter — replace heuristic with explicit check), `src/components/features/NewSetView.tsx`, `src/components/features/SetEditView.tsx`, `src/lib/utils/ai-prompt.ts`.

### Skip suggestion compute for completed sets
- **What:** In `getProgressiveSuggestions`, skip program sets whose corresponding `workoutSet.isCompleted = true` in the active session.
- **Why deferred:** Marginal CPU win. UI already hides suggestions for completed sets via `!isCompleted` gate at `WorkoutSetsList.tsx:1042`. Adds a DB query for negligible benefit.
- **Unblocked by:** Profiling that shows suggestion compute is a real bottleneck (unlikely with current dataset sizes).
- **Touchpoints:** `src/lib/actions/workout-sets.ts:806-826`.

### Per-exercise (not per-set) progression UI
- **What:** Collapse the per-set `↑ Xkg` badges into one affordance per exercise: "↑ all working sets to 82.5 kg". Today, Tier 1.D propagates the apply across siblings, but the badges still render per-set.
- **Why deferred:** Bigger UX redesign than fits this round. Wait for Tier 2 (`setType`) which would change which sets are "working" anyway.
- **Unblocked by:** Tier 2 ships, or user feedback says the per-set badges still feel cluttered after Tier 1.
- **Touchpoints:** `src/components/features/WorkoutSetsList.tsx:1040-1207`.

### `latest.weightKg` vs program-planned weight quirk
- **What:** `buildSuggestion` uses `latest.weightKg` from history as `baseWeight` (`src/lib/utils/progression.ts:219`), not the program's planned weight. If a user logs a one-off heavy single, the next suggestion is built off that single — which then usually shows "held" because the consensus gate kicks in. Surprising in edge cases.
- **Why deferred:** Rare in practice; the consensus gate masks most surprise. Tier 1 changes don't make it worse.
- **Unblocked by:** A user reporting concrete confusion.
- **Touchpoints:** `src/lib/utils/progression.ts:218-219`.

## Codebase hygiene

### ESLint debt blocking `pnpm verify`
- **What:** Codebase has ~47 lint errors/warnings (mostly `react-hooks/set-state-in-effect`, unused vars, optional-chain bangs). `pnpm verify` runs only `tsc --noEmit + vitest` — no ESLint.
- **Why deferred:** Per `CLAUDE.md`: "ESLint is intentionally not in `verify` yet because the codebase has pre-existing lint errors that need a deliberate cleanup pass; once those are fixed it should be added."
- **Unblocked by:** A focused cleanup session that fixes (not silences) the existing errors. Then add `pnpm lint` to the `verify` script in `package.json`.
- **Touchpoints:** Top offenders by file: `src/contexts/workout-session-context.tsx`, `src/components/features/PageTransition.tsx`, `src/components/features/CycleScheduleBuilder.tsx`, `src/__tests__/progressive-suggestions.test.ts:245`. Run `docker-compose exec app pnpm lint` for the full list.

### Out-of-app push notifications via Service Worker
- **What:** `src/lib/notifications.ts:33` has a `TODO`. Today the app uses the browser Notification API (in-app only). Real out-of-app push needs a Service Worker registration + `pushManager.subscribe()` + server-side delivery.
- **Why deferred:** Not blocking any current flow.
- **Unblocked by:** Product decision that out-of-app push is needed.
- **Touchpoints:** `src/lib/notifications.ts`.
