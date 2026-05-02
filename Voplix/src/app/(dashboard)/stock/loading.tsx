import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800', className)} />;
}

export default function StockLoading() {
  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <Card className="hidden w-64 shrink-0 border-zinc-200 dark:border-zinc-800 lg:block">
          <CardHeader>
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card className="min-h-[320px] flex-1 border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
