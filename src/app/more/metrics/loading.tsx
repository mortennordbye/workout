export default function MetricsLoading() {
  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <div className="flex items-center px-4 pt-6 pb-2 shrink-0">
        <div className="h-5 w-16 bg-muted rounded animate-pulse" />
      </div>
      <div className="px-4 pt-2 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Metrics</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8 animate-pulse">
        <div className="rounded-2xl bg-card h-52" />
        <div className="rounded-2xl bg-card h-36" />
        <div className="rounded-2xl bg-card h-52" />
      </div>
    </div>
  );
}
