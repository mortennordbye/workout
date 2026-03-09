/**
 * Workout Page
 *
 * Main page for logging workout sets during an active session.
 *
 * Flow:
 * 1. Check if user has an active (incomplete) workout session
 * 2. If yes, load that session and its existing sets
 * 3. If no, automatically create a new session
 * 4. Load all available exercises
 * 5. Render the WorkoutLogger component
 *
 * This is a Server Component that fetches data, then passes it to
 * the client-side WorkoutLogger for interactive set logging.
 *
 * Future enhancements:
 * - Add session summary (total sets, volume, duration)
 * - Show previous workout comparison
 * - Add "Complete Workout" button
 * - Show workout templates/programs
 */

import { WorkoutLogger } from "@/components/features/WorkoutLogger";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getAllExercises } from "@/lib/actions/exercises";
import {
    createWorkoutSession,
    getActiveSession,
} from "@/lib/actions/workout-sessions";
import { getSessionSets } from "@/lib/actions/workout-sets";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

// Force dynamic rendering so database queries run on every request.
// Without this, Next.js pre-renders the page at build time (when no real DB
// is available), caches the error state, and serves it forever.
export const dynamic = "force-dynamic";

/**
 * TODO: Replace with actual user authentication
 * For now, using a hardcoded user ID. In production, get from:
 * - Next-Auth session
 * - Clerk authentication
 * - Custom auth solution
 */
const DEMO_USER_ID = 1;

export default async function WorkoutPage() {
  // Get or create active session
  let sessionId: number;
  let sessionDate: string;

  const activeSessionResult = await getActiveSession(DEMO_USER_ID);

  if (activeSessionResult.success && activeSessionResult.data) {
    // Resume existing session
    sessionId = activeSessionResult.data.id;
    sessionDate = activeSessionResult.data.date;
  } else {
    // Create new session
    const today = format(new Date(), "yyyy-MM-dd");
    const newSessionResult = await createWorkoutSession({
      userId: DEMO_USER_ID,
      date: today,
    });

    if (!newSessionResult.success) {
      return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <Card className="border-red-500">
            <CardHeader>
              <CardTitle>Error Starting Workout</CardTitle>
              <CardDescription>{newSessionResult.error}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    sessionId = newSessionResult.data.id;
    sessionDate = newSessionResult.data.date;
  }

  // Fetch exercises and existing sets in parallel
  const [exercisesResult, setsResult] = await Promise.all([
    getAllExercises(),
    getSessionSets(sessionId),
  ]);

  if (!exercisesResult.success) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle>Error Loading Exercises</CardTitle>
            <CardDescription>{exercisesResult.error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const exercises = exercisesResult.data;
  const existingSets = setsResult.success ? setsResult.data : [];

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Session Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Workout Session
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>{format(new Date(sessionDate), "EEEE, MMMM d, yyyy")}</span>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Workout Logger */}
      <WorkoutLogger
        sessionId={sessionId}
        userId={DEMO_USER_ID}
        exercises={exercises}
        initialSets={existingSets}
      />

      {/* TODO: Add Complete Workout Button */}
      {/* <div className="mt-8">
        <Button
          size="lg"
          variant="default"
          className="w-full"
          onClick={() => completeWorkoutSession({ sessionId })}
        >
          Complete Workout
        </Button>
      </div> */}
    </div>
  );
}
