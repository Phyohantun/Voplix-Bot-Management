'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import {
  SquaresFour,
  ChatCircle,
  ShoppingCart,
  List,
  Warehouse,
  Megaphone,
  Gear,
  SignOut,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { VoplixWordmark } from '@/components/brand/voplix-wordmark';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface DashboardSidebarProps {
  user: User;
  mobile?: boolean;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: SquaresFour },
  { name: 'Bots', href: '/bots', icon: ChatCircle },
  { name: 'Menu', href: '/menu', icon: List },
  { name: 'Stock', href: '/stock', icon: Warehouse },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Broadcast', href: '/broadcast', icon: Megaphone },
  { name: 'Account', href: '/settings', icon: Gear },
];

export function DashboardSidebar({ user, mobile = false }: DashboardSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const activeBotId = searchParams.get('bot');
  const { t } = useLanguage();

  useEffect(() => {
    navigation.forEach((item) => {
      const shouldScopeByBot = ['/dashboard', '/menu', '/stock', '/orders', '/broadcast'].includes(item.href);
      const href = shouldScopeByBot && activeBotId ? `${item.href}?bot=${activeBotId}` : item.href;
      router.prefetch(href);
    });
  }, [activeBotId, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className={mobile ? 'flex h-full w-full flex-col' : 'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col'}>
      <div
        className={`flex grow flex-col gap-y-5 overflow-y-auto bg-zinc-50 px-6 dark:bg-zinc-900 ${mobile ? '' : 'border-r border-zinc-200 dark:border-zinc-800'}`}
      >
        <div className="flex h-16 shrink-0 items-center">
          <Link href="/dashboard" className="flex items-center gap-1.5">
            <div className="h-8 w-8 overflow-hidden rounded-lg ring-1 ring-zinc-300 dark:ring-zinc-700">
              <Image src="/apple-touch-icon.png" alt="Voplix logo" width={32} height={32} className="h-full w-full object-cover" />
            </div>
            <VoplixWordmark className="text-xl" />
          </Link>
        </div>
        
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    {(() => {
                      const shouldScopeByBot = ['/dashboard', '/menu', '/stock', '/orders', '/broadcast'].includes(
                        item.href
                      );
                      const href = shouldScopeByBot && activeBotId ? `${item.href}?bot=${activeBotId}` : item.href;
                      return (
                    <Link
                      href={href}
                      className={cn(
                        'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6',
                        pathname === item.href || pathname.startsWith(`${item.href}/`)
                          ? 'bg-zinc-200 text-zinc-900 ring-1 ring-zinc-300 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700/80'
                          : 'text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-white'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {t(item.name)}
                    </Link>
                      );
                    })()}
                  </li>
                ))}
              </ul>
            </li>
            
            <li className="-mx-6 mt-auto">
              <div className="flex items-center gap-x-4 border-t border-zinc-200 px-6 py-4 text-sm font-semibold leading-6 text-zinc-900 dark:border-zinc-800 dark:text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-300 dark:bg-zinc-700">
                  <span className="text-xs">{user.email?.[0].toUpperCase()}</span>
                </div>
                <span className="sr-only">Your profile</span>
                <span aria-hidden="true" className="truncate">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-x-3 rounded-md px-6 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                <SignOut className="h-5 w-5 shrink-0" />
                {t('Logout')}
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
