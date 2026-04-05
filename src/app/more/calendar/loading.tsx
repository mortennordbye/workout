export default function CalendarLoading() {
  return (
    <div className="h-[100dvh] pb-nav-safe bg-background flex flex-col overflow-hidden">
      <div className="flex items-center px-4 pt-6 pb-2 shrink-0">
        <div className="h-5 w-16 bg-muted rounded animate-pulse" />
      </div>
      <div className="px-4 pt-2 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 animate-pulse">
        <div className="rounded-2xl bg-card h-80 mb-4" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-card h-16" />
          ))}
        </div>
      </div>
    </div>
  );
}
