/**
 * History Page
 *
 * Shows workout history with completed workouts and statistics
 */

import { Calendar } from "lucide-react";

export default function HistoryPage() {
  // TODO: Fetch workout history from database
  const workoutHistory: any[] = [];

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 pt-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">History</h1>

      {workoutHistory.length > 0 ? (
        <div className="flex flex-col gap-4">
          {workoutHistory.map((workout, index) => (
            <div key={index} className="p-4 rounded-xl bg-muted">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{workout.programName}</h3>
                <span className="text-sm text-muted-foreground">
                  {workout.date}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {workout.exercises} exercises • {workout.sets} sets
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Calendar className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            No workout history yet.
            <br />
            Start a workout to see your progress here!
          </p>
        </div>
      )}
    </div>
  );
}
