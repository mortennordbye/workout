export default function ProgramsLoading() {
  return (
    <div className="h-[100dvh] bg-background overflow-y-auto pb-nav-safe">
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
        <div className="flex items-center gap-3 animate-pulse">
          <div className="h-5 w-8 bg-muted rounded" />
          <div className="w-10 h-10 rounded-full bg-muted" />
        </div>
      </div>
      <div className="px-4 pt-4 animate-pulse">
        <div className="rounded-2xl bg-card overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3.5 border-b border-border last:border-0">
              <div className="h-4 bg-muted rounded w-36" />
              <div className="h-4 w-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
