export default function HomeLoading() {
  return (
    <div className="h-[100dvh] pb-nav-safe bg-background flex flex-col overflow-hidden">
      <div className="px-6 pt-6 pb-3 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-center">LogEveryLift</h1>
      </div>
      <div className="flex-1 flex flex-col gap-3 px-6 min-h-0 overflow-hidden pb-4 animate-pulse">
        <div className="rounded-2xl bg-muted h-44 shrink-0" />
        <div className="rounded-2xl bg-muted flex-1" />
      </div>
    </div>
  );
}
