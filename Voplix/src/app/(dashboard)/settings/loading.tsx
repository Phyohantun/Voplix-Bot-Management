export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-10">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="h-6 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-28 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60" />
      <div className="h-48 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60" />
      <div className="h-6 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-64 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60" />
      <div className="h-40 animate-pulse rounded-lg border border-red-200/60 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20" />
    </div>
  );
}
