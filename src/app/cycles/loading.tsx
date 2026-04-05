export default function CyclesLoading() {
  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-2 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Cycles</h1>
        <div className="flex items-center gap-3 animate-pulse">
          <div className="h-5 w-8 bg-muted rounded" />
          <div className="w-10 h-10 rounded-full bg-muted" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-6 px-4 pt-4 pb-nav-safe animate-pulse">
        <div>
          <div className="h-3 w-12 bg-muted rounded mb-2" />
          <div className="rounded-2xl bg-card h-28" />
        </div>
        <div>
          <div className="h-3 w-10 bg-muted rounded mb-2" />
          <div className="rounded-2xl bg-card overflow-hidden">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5 border-b border-border last:border-0">
                <div className="h-4 bg-muted rounded w-28" />
                <div className="h-3 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
