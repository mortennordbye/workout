# BACKLOG

Anything Claude (or anyone) leaves unfinished, partially implemented, or explicitly defers goes here. Each entry: what, why deferred, what would unblock it, where the relevant code lives.

Don't put work-in-progress here. WIP belongs on a branch. This is for *known* gaps the team has agreed to leave for later.

When you finish an item, delete it. When you add an item, write enough that someone unfamiliar with the conversation can pick it up.

---

## Improvements — incremental polish

### Drop the legacy `users.goal` column
- **What:** `parseUserGoals` falls back to legacy single-value `goal` field. Read-only — nothing writes it any more. Once we're confident the new `goals` JSON array is populated for all active users, the column + fallback can go.
- **Why deferred:** Want a migration window first.
- **Unblocked by:** Confirming via DB query that all active users have non-null `goals`.
- **Touchpoints:** `src/db/schema/users.ts:22`, `parseUserGoals`, `workout-sets.ts:719`, `ai-generate.ts:252`.

## New features — additive

### Sport-specific endurance fields (pool length, bike power/cadence, swim stroke)
- **What:** The set editor captures distance/duration/incline/HR-zone only. Triathletes often want pool length, swim stroke, or bike power/cadence. The schema has no columns for these.
- **Why deferred:** Not needed to log and track the three disciplines; add when a concrete need appears.
- **Unblocked by:** A request for one of these specific metrics.
- **Touchpoints:** `src/db/schema/workout-sets.ts`, `src/components/features/SetEditView.tsx`, `src/components/features/LogRunModal.tsx`.

### Link make-up sessions back to the missed cycle slot
- **What:** When a user taps "Make up" on a missed workout, the resulting session is logged with today's date — history won't say "this was Monday's push." A proper fix adds an `intendedDate` column (or `cycle_slot_id` FK) to `workout_sessions` so the original missed date is preserved.
- **Why deferred:** Cosmetic for history; doesn't affect correctness of cycle progression. Wait until users actually ask for accurate history attribution.
- **Unblocked by:** A user reporting that make-up sessions look wrong in the history view.
- **Touchpoints:** `src/db/schema/workout-sessions.ts`, `src/app/page.tsx` (missed-this-week section), `src/lib/actions/workout-sets.ts` (session creation).

### Dismiss a missed workout
- **What:** Today, a missed workout clears from the home-page list only when the user logs a completed session for that program on today's date (day-of-week mode) or completes the rotation slot (rotation mode). There's no explicit "I know I missed it, hide this" action.
- **Why deferred:** Implicit clearing handles the common case. An explicit dismiss adds state (`dismissedMissedSlot` rows or a column) we may not need.
- **Unblocked by:** Users complaining the missed list nags too much.
- **Touchpoints:** `src/lib/actions/training-cycles.ts` (`getActiveCycleForUser`), `src/app/page.tsx` missed-this-week section.

### Two workouts in one day — rotation walker edge case
- **What:** `walkRotation` in `src/lib/utils/cycle-position.ts` consumes at most one completed session per calendar day. If a user logs two workouts on the same date, the second one doesn't advance the rotation cursor.
- **Why deferred:** Vanishingly rare in practice; the previous modulo-counter version had the inverse limitation (double-counted, arguably more wrong).
- **Unblocked by:** Concrete report of a power user hitting it.
- **Touchpoints:** `src/lib/utils/cycle-position.ts` (`walkRotation`), tests in `src/__tests__/cycle-position.test.ts`.


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
