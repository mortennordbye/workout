export default function MoreLoading() {
  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <header className="flex-none px-4 pt-6 pb-4 border-b border-border">
        <h1 className="text-3xl font-bold tracking-tight">More</h1>
      </header>
      <main className="flex-1 overflow-y-auto pb-nav-safe">
        <div className="animate-pulse divide-y divide-border">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 min-h-[56px]">
              <div className="w-5 h-5 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-28" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
