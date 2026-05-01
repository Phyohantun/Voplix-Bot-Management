export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="h-28 animate-pulse rounded-lg bg-zinc-900" />
        <div className="h-28 animate-pulse rounded-lg bg-zinc-900" />
        <div className="h-28 animate-pulse rounded-lg bg-zinc-900" />
        <div className="h-28 animate-pulse rounded-lg bg-zinc-900" />
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-zinc-900" />
    </div>
  );
}
