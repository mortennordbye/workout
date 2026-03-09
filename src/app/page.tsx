import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Workout</h1>
      </div>

      {/* Main content – vertically centred */}
      <div className="flex-1 flex flex-col items-center justify-center gap-12 px-6">
        {/* Start Workout circular button */}
        <Link href="/new-workout">
          <button
            className="
              w-40 h-40 rounded-full
              border-4 border-primary
              flex items-center justify-center
              text-primary font-semibold text-lg text-center leading-snug
              hover:bg-primary/10 active:scale-95 transition-transform
            "
          >
            Start
            <br />
            Workout
          </button>
        </Link>

        {/* Quick links */}
        <Link
          href="/programs"
          className="text-primary text-sm font-medium hover:opacity-80"
        >
          Programs
        </Link>
      </div>
    </div>
  );
}
