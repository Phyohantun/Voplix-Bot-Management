'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ADMIN_NAV_LINKS } from '@/lib/admin-nav';

export function AdminHeader({ title }: { title: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/90 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-lg font-semibold tracking-tight text-white">{title}</h1>
          <nav className="flex flex-wrap items-center gap-2 border-l border-zinc-700 pl-4">
            {ADMIN_NAV_LINKS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-sm transition-colors',
                    active ? 'font-medium text-white' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
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
