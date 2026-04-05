export default function NewWorkoutLoading() {
  return (
    <div className="h-[100dvh] pb-nav-safe bg-background flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-2 shrink-0">
        <div className="h-5 w-14 bg-muted rounded animate-pulse" />
        <div className="w-16" />
      </div>
      <div className="px-4 pt-2 pb-6 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">New Workout</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 animate-pulse">
        <div className="rounded-2xl bg-card overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3.5 border-b border-border last:border-0">
              <div className="h-4 bg-muted rounded w-32" />
              <div className="h-4 w-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
