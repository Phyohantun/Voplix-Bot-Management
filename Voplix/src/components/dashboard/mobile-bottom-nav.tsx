'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChatCircle, ShoppingCart, List, Gear, Package } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/menu', label: 'Menu', icon: List, match: (p: string) => p.startsWith('/menu') },
  {
    href: '/stock',
    label: 'Stock',
    icon: Package,
    match: (p: string) => p.startsWith('/stock'),
  },
  { href: '/orders', label: 'Orders', icon: ShoppingCart, match: (p: string) => p.startsWith('/orders') },
  { href: '/bots', label: 'Bots', icon: ChatCircle, match: (p: string) => p.startsWith('/bots') },
  { href: '/settings', label: 'Settings', icon: Gear, match: (p: string) => p.startsWith('/settings') },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bot = searchParams.get('bot');

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-zinc-50/95 px-2 pt-2 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      aria-label="Main navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
        {items.map((item) => {
          const active = item.match(pathname);
          const href =
            item.href !== '/settings' && bot
              ? `${item.href}?bot=${bot}`
              : item.href;
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold transition-colors',
                  active
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                )}
              >
                <item.icon
                  className={cn('h-6 w-6', active && 'text-indigo-600 dark:text-indigo-400')}
                  {...(active ? { weight: 'fill' as const } : {})}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
