# BACKLOG

Anything Claude (or anyone) leaves unfinished, partially implemented, or explicitly defers goes here. Each entry: what, why deferred, what would unblock it, where the relevant code lives.

Don't put work-in-progress here. WIP belongs on a branch. This is for *known* gaps the team has agreed to leave for later.

When you finish an item, delete it. When you add an item, write enough that someone unfamiliar with the conversation can pick it up.

---

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

### Autoregulation + intensity distribution for triathlon plans
- **What:** The Ironman research brief prescribes two layers we did *not* build: (1) **autoregulation** — trigger an automatic deload from wearable signals (suppressed HRV, elevated resting HR, aerobic decoupling >5%), and "drop, don't cram" handling of missed sessions; (2) **80/20 polarized intensity** — enforce that ~80% of session time sits below VT1 and isolate hard work, rather than only labelling sessions ("Run — Tempo"). We implemented the *structural* layer instead: level-scaled peak volumes + a periodization curve provably within the uncoupled-ACWR ≤1.30 band.
- **Why deferred:** Both need data the app doesn't capture. Autoregulation needs a wearable-data pipeline (HRV/RHR/pace-HR) — there is none. Polarized enforcement needs per-set HR/power *zones*; we log distance/duration only. Out of scope for a plan *generator*.
- **Unblocked by:** (1) Ingesting wearable/HR data (Apple Health / Garmin / Strava) into a per-session store. (2) Adding HR/power-zone capture to the set editor (note the existing "Sport-specific endurance fields" entry above covers the schema gap).
- **Touchpoints:** `src/lib/utils/periodization.ts` (curve already exposes `uncoupledAcwr` for a guardrail), `src/lib/actions/training-cycles.ts` (`syncPeriodizedTargets` is where an autoregulated override would hook in), `src/db/schema/workout-sets.ts` (zone columns).

### iOS backgrounding — residual gaps after the resume-hardening pass
- **What:** A Jun 2026 pass made the rest/exercise timers and completed-set toggles re-sync on resume (visibilitychange + pageshow + focus; rest timers rebuild from `restTimerEnds`, completed sets re-pull from the server). Two gaps remain: (1) the **exercise (timed-set) countdown** isn't persisted, so a *cold* eviction mid-timed-set loses it entirely (only warm resume recovers it); (2) **unsaved SetEditView edits** (typed but not Saved) live only in React state and are lost on eviction — only Saved overrides persist to localStorage.
- **Why deferred:** (1) timed sets are short and rarely span a long background; persisting `endsAt` to the context/localStorage is extra surface for an edge case. (2) auto-persisting drafts on each keystroke is a bigger change; the explicit Save is the documented contract.
- **Unblocked by:** A real iOS device repro showing either gap bites in practice. Then: persist the exercise timer's `endsAt` alongside `restTimerEnds` and rehydrate on mount; and/or debounce-persist SetEditView field state to a draft key cleared on Save/navigation.
- **Touchpoints:** `src/components/features/WorkoutSetsList.tsx` (exercise timer state + resync effects), `src/contexts/workout-session-context.tsx` (persistence keys), `src/components/features/SetEditView.tsx` (draft state).

### Surface failed sets in history & metrics
- **What:** `workout_sets.is_failed` is now logged (explicit failed-set flag, Jun 2026) and shown in-workout (red ✕). History rows and the metrics/PR views don't yet read it — a failed set currently just shows its low `actualReps`. A dedicated "failed" badge in `/history` and exclusion/annotation in PR/volume math would make it explicit.
- **Why deferred:** The flag is captured and progression already reacts to `actualReps < targetReps`; surfacing it in history/metrics is additive polish.
- **Unblocked by:** Wanting failed sets visually distinct in history. Add `isFailed` to the history query + `HistoryRow`, render a badge, and decide whether failed sets count toward volume.
- **Touchpoints:** `src/lib/actions/workout-sets.ts` (history query ~line 711), `src/components/features/` history/metrics components, `src/lib/utils/progression.ts` (optional: treat `isFailed` as a hard fail).

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

## MCP server

### Redis-backed SSE stream resumption for the MCP server
- **What:** The MCP endpoint (`src/app/api/[transport]/route.ts`) runs `createMcpHandler` without a `redisUrl`. With Streamable HTTP, a long-running tool call holds an open response; across multiple instances a session that starts on one can't resume on another, so clients can drop mid-call.
- **Why deferred:** The app currently runs as a **single instance**, where this can't happen. Only relevant if/when it scales to multiple replicas.
- **Unblocked by:** Scaling past one instance — then provision Redis (same region) and pass its URL as the `redisUrl` config option to `createMcpHandler`. Add the var to `src/lib/env.ts` + `.env.example` first. (The in-memory MCP rate limiter in `src/lib/mcp/rate-limit.ts` would need to move to Redis at the same time.)
- **Touchpoints:** `src/app/api/[transport]/route.ts`, `src/lib/mcp/rate-limit.ts`, `src/lib/env.ts`.

### MCP tool coverage is partial (programs/cycles + profile/weight only)
- **What:** The MCP server exposes ~13 tools across programs, training cycles, and profile/weight. Workout logging/history, metrics/PRs, exercises, and social are NOT exposed.
- **Why deferred:** v1 scope was deliberately limited to two domains. The Server Actions for the other domains exist and follow the same `requireSession()` pattern.
- **Unblocked by:** A decision to widen the MCP surface. Mirror the existing pattern: add a `src/lib/mcp/tools/<domain>.ts` with a `register<Domain>Tools(server, userId)` and call it from the endpoint. Reuse the action logic but scope by the MCP `userId` (never reuse the cookie-session actions directly).
- **Touchpoints:** `src/lib/mcp/tools/`, `src/app/api/[transport]/route.ts`.

### `.well-known` route files are outside the tsc program
- **What:** `src/app/.well-known/**/route.ts` live under a dot-folder, which TypeScript's `**/*.ts` include glob skips, so `pnpm verify` does not type-check them (they use relative imports as a result). Next's bundler still builds them.
- **Why deferred:** The files are trivial one-line re-exports; the type-check gap is low-risk.
- **Unblocked by:** Wanting them covered — add an explicit `src/app/.well-known/**/*.ts` entry to `tsconfig.json` `include`.
- **Touchpoints:** `tsconfig.json`, `src/app/.well-known/`.

### MCP rate limiting — move to a shared store if the app scales
- **What:** MCP requests are rate-limited per `userId` (`src/lib/mcp/rate-limit.ts`), but the limiter is in-memory/process-local.
- **Why deferred:** Correct as-is for a **single instance**. Across multiple instances each would track its own counter, so the effective limit would be N× the intended one.
- **Unblocked by:** Scaling past one instance — move the counter to Redis (a token bucket keyed by `userId`). Pairs with the SSE/Redis entry above.
- **Touchpoints:** `src/lib/mcp/rate-limit.ts`, `src/app/api/[transport]/route.ts`.

### Auth: cookieCache delays ban / role revocation by up to 5 min
- **What:** `src/lib/auth.ts` enables a 5-minute encrypted session `cookieCache` to skip the DB session lookup. As a result, banning a user, downgrading an admin (`setUserRole`), or revoking a session takes up to 5 minutes to take effect, because role/ban are read from the cookie, not the DB.
- **Why deferred:** Deliberate performance tradeoff; the window is bounded at 5 min. Accepted for now.
- **Unblocked by:** A need for immediate revocation — then call `auth.api.getSession({ query: { disableCookieCache: true } })` inside `requireAdmin()` / the ban check, or drop `cookieCache`.
- **Touchpoints:** `src/lib/auth.ts`, `src/lib/utils/session.ts`.

### Minor: weight float comparison logs redundant history entries; reactions ignore privacy flag
- **What:** (1) MCP `update_profile` / `manage_weight` and their Server-Action originals compare a JS double against a Postgres `real` weight with `!==`, so re-sending the same weight can log a duplicate `user_weight_entry`. (2) `friends.ts toggleReaction` doesn't check the target's `showActivityToFriends` flag, so a friend can react to a session a user has hidden.
- **Why deferred:** Both are low-harm (data-quality / minor privacy), not data loss or a leak.
- **Unblocked by:** Caring about history cleanliness (round/compare at 0.01) or the privacy flag (add the `showActivityToFriends` check to `toggleReaction`).
- **Touchpoints:** `src/lib/mcp/tools/profile.ts`, `src/lib/actions/profile.ts`, `src/lib/actions/friends.ts`.

### MCP OAuth dynamic client registration is open
- **What:** The Better Auth `mcp` plugin exposes a dynamic client `registration_endpoint`, so any client can self-register an OAuth app. Access still requires the user to log in and consent, so this isn't a data-exposure hole — but it allows unbounded `oauth_application` rows.
- **Why deferred:** Standard MCP behavior; fine for current scale. The gate that matters (user auth + consent) is in place.
- **Unblocked by:** A need to restrict registration — add trusted-client config to the `mcp()` plugin, or prune stale/unused `oauth_application` rows on a schedule.
- **Touchpoints:** `src/lib/auth.ts`, `src/db/schema/auth.ts` (`oauth_application`).

### Run an independent security-review pass over the MCP + auth changes
- **What:** A multi-agent audit (Jun 2026) fixed the critical/high auth + MCP data-integrity findings (cross-user `getProgressiveSuggestions`/`upsertCycleSlot` leaks, `ai-model-configs` admin gating, login open-redirect, placeholder-secret boot guard, non-atomic MCP writes, validation gaps, rate-limit eviction). A fresh, independent pass was offered but deferred for time.
- **Why deferred:** No time right now; the verified high-severity items are already fixed and `pnpm verify` is green.
- **Unblocked by:** Running `/security-review` (or `/code-review high`) over the current branch diff before/after merge, and optionally addressing the lower-severity residuals captured in the entries above (cookieCache revocation lag, weight float dedup, reaction privacy flag).
- **Touchpoints:** whole MCP + auth surface — `src/lib/mcp/`, `src/app/api/[transport]/`, `src/lib/actions/`, `src/lib/auth.ts`, `src/middleware.ts`, `src/lib/env.ts`.
