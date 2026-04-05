export default function HistoryLoading() {
  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <div className="flex items-center px-4 pt-6 pb-2 shrink-0">
        <div className="h-5 w-12 bg-muted rounded animate-pulse" />
      </div>
      <div className="px-4 pt-2 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4">
        <div className="space-y-3 pb-nav-safe animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 h-20" />
          ))}
        </div>
      </div>
    </div>
  );
}
