'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AdminHeader({
  title,
  nav,
}: {
  title: string;
  nav?: { href: string; label: string }[];
}) {
  const router = useRouter();

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/90 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-lg font-semibold tracking-tight text-white">{title}</h1>
          {nav?.length ? (
            <nav className="flex flex-wrap items-center gap-2 border-l border-zinc-700 pl-4">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('shrink-0 border-zinc-600 text-zinc-200 hover:bg-zinc-800')}
          onClick={async () => {
            await fetch('/api/admin/logout', { method: 'POST' });
            router.push('/admin/login');
            router.refresh();
          }}
        >
          Admin sign out
        </Button>
      </div>
    </header>
  );
}
