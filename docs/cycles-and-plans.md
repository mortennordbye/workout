# Training cycles & the triathlon plan

A **cycle** is a periodized weekly schedule. A **plan generator** builds one (cycle + slots + programs + sets) in a transaction.

## Cycle model

- `training_cycles` + `training_cycle_slots` (`src/db/schema/training-cycles.ts`). Each slot is a day-of-week (or rotation position) → a `programId` (null = rest day).
- Position logic for rotation cycles: `src/lib/utils/cycle-position.ts` (`walkRotation`).
- Read/display: `getActiveCycleForUser`, `getCyclePeriodization` (`src/lib/actions/training-cycles.ts`).

## The triathlon plan generator

Two files:
- **Blueprint** (pure): `src/lib/utils/triathlon-plan.ts` → `buildTriathlonPlan({ weeks, restDay, goal, level })` returns a `PlanBlueprint` (days → exercises → sets). Unit-tested in `src/__tests__/triathlon-plan.test.ts`.
- **Persistence** (DB): `src/lib/actions/triathlon-plan.ts` → `generateTriathlonPlan` ensures the referenced exercises exist (`ENSURED_EXERCISES`), resolves names→ids, then inserts cycle + slots + programs + program_exercises + program_sets. UI: `src/components/features/TriathlonPlanForm.tsx` (`/cycles/triathlon`).

### Current week layout (2 strength + endurance)

| Day | Session |
|---|---|
| 1 Mon | **Workout A** — Squat & Horizontal (Front Squat, DB Bench, Pendlay Row, Bulgarian Split Squat, Seated Calf Raise, Pallof Press) |
| 2 Tue | Run — Threshold Intervals |
| 3 Wed | Bike — Endurance + Swim |
| 4 Thu | **Workout B** — Hinge & Vertical (RDL, Weighted Pull-up, DB Shoulder Press, Seated Leg Curl, Face Pull, Ab Wheel Rollout) |
| 5 Fri | Recovery Swim |
| 6 Sat | Long Bike + Brick Run |
| 7 Sun | Long Run |

Strength is a **flat, RIR-capped hypertrophy/maintenance block**: same target reps across working sets, no phase re-prescription (no `sessionRole: "strength"`), `weightKg: 0` (athlete loads to the target reps at the prescribed RIR), `weight` mode (the spec's `smart` is mapped to `weight` so reps stay static). Per-exercise type + per-set `targetRir` are set by the generator. Pallof Press is a **timed isometric hold** (`isTimed`, `durationSeconds`).

**Gotcha:** `TriathlonPlanForm` defaults `restDay` to a non-strength day (Fri/Recovery Swim). The old default was Thu (the bike day in the *old* 3-strength layout) — Thu is now Workout B, so an old default would silently wipe a strength session. If you change the day layout, re-check the default rest day.

### Endurance prescription

Sessions are built from structured segments (`sessionFrom`, `intervalRun`, `swimEndurance`, `steady`), not one distance blob. Polarized 80/20: only interval reps are Z4 (`targetHeartRateZone`, `sessionRole: "work"`), everything else easy Z2. `peakDistanceMeters` is the race-prep anchor; week-1 `distanceMeters` is scaled below it by the periodization curve. Peak volumes per athlete level in `PEAK_VOLUMES`.

## Periodization & adaptation — `src/lib/utils/periodization.ts`

- `periodizedLoad(week, totalWeeks, goal, deloadCadence)` → the volume curve (phase + multiplier); `phaseLayout`, `deloadCadenceForLevel`, taper/deload factors.
- `uncoupledAcwr(weeklyLoads)` — acute:chronic workload injury guardrail.
- `intervalPhaseRecipe`/`strengthPhaseRecipe` — phase-aware zone/rest (used by the *endurance* sessions; strength is now flat).
- **No-wearable adaptation:** `computeAdaptationFactor({ adherence, avgReadiness, avgRpe })` → a ±band (90–105%). Wired in `computeCycleAdaptation` (`training-cycles.ts`), which averages real `workout_sets.rpe` (now RIR-derived) over the last 7 days, then `syncPeriodizedTargets` rewrites the week's endurance targets. Idempotent per week via `lastSyncedWeek`.
- It's **algorithmic, not an LLM.** The separate LLM path (`ai-generate.ts` + `ai-prompt.ts`, Gemini/OpenRouter) generates one-off strength programs and does **not** consume the adaptation factor.

## Deferred (see `BACKLOG.md`)

Wearable-based autoregulation (Tier B), prescribe-target-RIR was shipped, laterality (unilateral/bilateral) dimension, and a precise per-exercise type backfill (the `0039` migration's movement-pattern heuristic over-tags isolation work as compound).
