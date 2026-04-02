/**
 * Reset user data script
 *
 * Deletes all user-specific data for DEMO_USER_ID=1 while keeping the
 * user record and the exercise library intact.
 *
 * Cascade rules mean we only need to delete the top-level tables:
 *   workoutSessions  → cascades to workoutSets
 *   programs         → cascades to programExercises → programSets
 *                      (also sets trainingCycleSlots.programId = NULL)
 *   trainingCycles   → cascades to trainingCycleSlots
 *
 * Usage (inside Docker):
 *   docker-compose exec app pnpm db:reset-user
 */

import { eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  programs,
  trainingCycles,
  workoutSessions,
} from "../src/db/schema";

const DEMO_USER_ID = 1;

async function resetUser() {
  console.log(`🗑️  Resetting data for user ${DEMO_USER_ID}...`);

  const deletedSessions = await db
    .delete(workoutSessions)
    .where(eq(workoutSessions.userId, DEMO_USER_ID))
    .returning({ id: workoutSessions.id });

  const deletedPrograms = await db
    .delete(programs)
    .where(eq(programs.userId, DEMO_USER_ID))
    .returning({ id: programs.id });

  const deletedCycles = await db
    .delete(trainingCycles)
    .where(eq(trainingCycles.userId, DEMO_USER_ID))
    .returning({ id: trainingCycles.id });

  console.log(`✅ Deleted ${deletedSessions.length} workout session(s) (+ sets)`);
  console.log(`✅ Deleted ${deletedPrograms.length} program(s) (+ exercises + sets)`);
  console.log(`✅ Deleted ${deletedCycles.length} training cycle(s) (+ slots)`);
  console.log("✅ Reset complete — user record and exercises are untouched");
  process.exit(0);
}

resetUser().catch((err) => {
  console.error("❌ Reset failed:", err);
  process.exit(1);
});
