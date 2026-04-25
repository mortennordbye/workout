# BACKLOG

Anything Claude (or anyone) leaves unfinished, partially implemented, or explicitly defers goes here. Each entry: what, why deferred, what would unblock it, where the relevant code lives.

Don't put work-in-progress here. WIP belongs on a branch. This is for *known* gaps the team has agreed to leave for later.

When you finish an item, delete it. When you add an item, write enough that someone unfamiliar with the conversation can pick it up.

---

## Pitfalls — fix before they bite

### Service-worker has no offline mutation queue
- **What:** `src/app/sw.ts` caches reads but does NOT queue failed mutations. A user logging a set in a no-signal gym will see the action fail and the log silently drops. Comment in code calls this out as "future enhancement".
- **Why deferred:** Largest effort of all the pitfalls (~80–150 LOC + careful testing). The other pitfalls block this in priority.
- **Unblocked by:** All other pitfalls and polish items shipping; then dedicate a focused ~1–2 day pass.
- **Touchpoints:** `src/app/sw.ts`, IndexedDB queue, Background Sync API integration with `logWorkoutSet` and `completeWorkoutSession`.

## Improvements — incremental polish

### Failure handling for set completion (originally "optimistic UI")
- **What:** Closer look shows the UI is already optimistic — `completedSets` and rest timers are updated synchronously in `toggleSet` BEFORE the `await logWorkoutSet`. The actual gap is failure handling: if `logWorkoutSet` returns `{success: false}` or throws, the local state shows the set complete but it's not in the DB. No rollback, no retry, no error UI. Need: (a) a toast/banner system, (b) decide rollback-vs-keep-and-retry policy, (c) wire it into the few `void logWorkoutSet(...)` and `await logWorkoutSet(...)` call sites.
- **Why deferred:** Larger than the plan implied. Pairs naturally with the offline queue (#5) since both deal with "the request didn't complete cleanly".
- **Unblocked by:** Decision on UX (toast vs banner, auto-retry vs manual, rollback vs leave).
- **Touchpoints:** `src/components/features/WorkoutSetsList.tsx:265–298`, also in `confirmRunLog` and the run log path. New toast/snackbar primitive needed.

### Drop the legacy `users.goal` column
- **What:** `parseUserGoals` falls back to legacy single-value `goal` field. Read-only — nothing writes it any more. Once we're confident the new `goals` JSON array is populated for all active users, the column + fallback can go.
- **Why deferred:** Want a migration window first.
- **Unblocked by:** Confirming via DB query that all active users have non-null `goals`.
- **Touchpoints:** `src/db/schema/users.ts:22`, `parseUserGoals`, `workout-sets.ts:719`, `ai-generate.ts:252`.

## New features — additive

### Per-set notes
- **What:** Add a `notes text` column to `workout_sets`. Small "+ note" affordance per completed set. Use cases: "left shoulder twinged on rep 6", "felt easy", "added belt". Surface in history + session detail.
- **Why deferred:** First user-facing add after the data-integrity bundle.
- **Unblocked by:** Nothing.
- **Touchpoints:** `src/db/schema/workout-sets.ts`, `src/lib/validators/workout.ts`, `src/components/features/WorkoutSetsList.tsx`, `SessionDetailClient.tsx`.

### Mid-cycle auto-deload trigger
- **What:** `progression.ts` has `isStuck` per-exercise deload detection; cycles support `endAction = "deload"` only at end-of-cycle. Add a mid-cycle "you've been at RPE ≥ 9 for 3 sessions across multiple exercises — consider a deload" recommendation in `WorkoutInsightBanner`.
- **Why deferred:** "Smart features" round.
- **Unblocked by:** Nothing.
- **Touchpoints:** `src/lib/utils/progression.ts`, `src/lib/actions/workout-sets.ts` (insight builder), `src/components/features/WorkoutInsightBanner.tsx`.

## Smart-progression UX (deferred long-term)

### Skip suggestion compute for completed sets
- **What:** In `getProgressiveSuggestions`, skip program sets whose corresponding `workoutSet.isCompleted = true` in the active session.
- **Why deferred:** Marginal CPU win. UI already hides suggestions for completed sets via `!isCompleted` gate at `WorkoutSetsList.tsx:1042`. Adds a DB query for negligible benefit.
- **Unblocked by:** Profiling that shows suggestion compute is a real bottleneck (unlikely with current dataset sizes).
- **Touchpoints:** `src/lib/actions/workout-sets.ts:806-826`.

### Per-exercise (not per-set) progression UI
- **What:** Collapse the per-set `↑ Xkg` badges into one affordance per exercise: "↑ all working sets to 82.5 kg". Today, applying a suggestion propagates across siblings, but the badges still render per-set.
- **Why deferred:** Bigger UX redesign than the recent rounds covered. Hold until you've used the current per-set badges for a while and confirmed the clutter is real.
- **Unblocked by:** Concrete user feedback that the per-set badges are still too noisy now that warm-ups are filtered and the apply propagates.
- **Touchpoints:** `src/components/features/WorkoutSetsList.tsx:1040-1207`.

### `latest.weightKg` vs program-planned weight quirk
- **What:** `buildSuggestion` uses `latest.weightKg` from history as `baseWeight` (`src/lib/utils/progression.ts:219`), not the program's planned weight. If a user logs a one-off heavy single, the next suggestion is built off that single — which then usually shows "held" because the consensus gate kicks in. Surprising in edge cases.
- **Why deferred:** Rare in practice; the consensus gate masks most surprise. Tier 1 changes don't make it worse.
- **Unblocked by:** A user reporting concrete confusion.
- **Touchpoints:** `src/lib/utils/progression.ts:218-219`.

## Codebase hygiene (deferred long-term)

### Out-of-app push notifications via Service Worker
- **What:** Today the app uses the browser Notification API (in-app only). Real out-of-app push needs a Service Worker registration + `pushManager.subscribe()` + server-side delivery.
- **Why deferred:** Not blocking any current flow.
- **Unblocked by:** Product decision that out-of-app push is needed.
- **Touchpoints:** `src/lib/notifications.ts`.
