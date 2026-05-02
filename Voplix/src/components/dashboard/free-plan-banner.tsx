import Link from 'next/link';
import { cn } from '@/lib/utils';

export function FreePlanUpgradeBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60',
        className
      )}
    >
      <p className="text-sm text-zinc-800 dark:text-zinc-200">
        You are on the <span className="font-medium">Free</span> plan. Upgrade for unlimited products, digital stock,
        and higher order limits.
      </p>
      <Link
        href="/subscription"
        className="mt-2 inline-flex text-sm font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
      >
        View plans and upgrade
      </Link>
    </div>
  );
}
