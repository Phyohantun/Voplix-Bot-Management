'use client';

import { User } from '@supabase/supabase-js';
import { Bell, CaretDown, List } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DashboardSidebar } from './sidebar';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface DashboardHeaderProps {
  user: User;
  profile: {
    display_name: string | null;
    business_name: string | null;
    avatar_data_url: string | null;
    notification_last_seen_at?: string | null;
  } | null;
  announcements: Array<{ id: string; title: string; message: string; created_at: string }>;
  unreadCount: number;
  bots: Array<{ id: string; bot_username: string }>;
}

const BOT_SCOPED_PAGES = ['/dashboard', '/menu', '/stock', '/orders', '/broadcast'];

export function DashboardHeader({ user, profile, announcements, unreadCount, bots }: DashboardHeaderProps) {
  const { t } = useLanguage();
  const [openProfile, setOpenProfile] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeBotId = searchParams.get('bot');
  const [isSwitchingBot, startSwitchBotTransition] = useTransition();
  const [pendingBotId, setPendingBotId] = useState<string | null>(null);
  const selectedBot =
    ((pendingBotId ? bots.find((b) => b.id === pendingBotId) : null) ||
      (activeBotId ? bots.find((b) => b.id === activeBotId) : null) ||
      bots[0] ||
      null);
  const firstName =
    typeof user.user_metadata?.first_name === 'string' ? user.user_metadata.first_name.trim() : '';
  const lastName =
    typeof user.user_metadata?.last_name === 'string' ? user.user_metadata.last_name.trim() : '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  const initials = useMemo(() => {
    const src = (firstName || profile?.display_name || user.email || 'U').trim();
    return src.slice(0, 1).toUpperCase();
  }, [firstName, profile?.display_name, user.email]);

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const markNotificationsRead = async () => {
    if (unreadCount <= 0) return;
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_last_seen_at: true }),
    });
    router.refresh();
  };

  useEffect(() => {
    if (!BOT_SCOPED_PAGES.includes(pathname)) return;
    if (bots.length === 0) return;
    if (activeBotId && bots.some((b) => b.id === activeBotId)) return;
    router.replace(`${pathname}?bot=${bots[0].id}`);
  }, [activeBotId, bots, pathname, router]);

  useEffect(() => {
    if (!BOT_SCOPED_PAGES.includes(pathname)) return;
    bots.forEach((bot) => {
      router.prefetch(`${pathname}?bot=${bot.id}`);
    });
  }, [bots, pathname, router]);

  useEffect(() => {
    // Clear optimistic state once URL catches up.
    if (pendingBotId && activeBotId === pendingBotId) {
      setPendingBotId(null);
    }
  }, [activeBotId, pendingBotId]);

  const handleBotChange = (value: string | null) => {
    if (!value) return;
    setPendingBotId(value);
    const nextUrl = BOT_SCOPED_PAGES.includes(pathname) ? `${pathname}?bot=${value}` : `/dashboard?bot=${value}`;

    startSwitchBotTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  };

  return (
    <header className="sticky top-0 z-40 flex min-h-20 shrink-0 items-center gap-x-3 border-b border-zinc-200 bg-white/90 px-3 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 sm:gap-x-6 sm:px-6 lg:px-8">
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="lg:hidden text-zinc-600 dark:text-zinc-400" />
          }
        >
          <List className="h-6 w-6" />
          <span className="sr-only">Open sidebar</span>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[85vw] max-w-72 border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 p-0"
        >
          <DashboardSidebar user={user} mobile />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 items-center justify-between gap-2">
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
            {t('Welcome')}, {fullName || profile?.display_name || user.email?.split('@')[0] || 'Owner'}
          </p>
          {bots.length > 0 ? (
            <div className="mt-1 w-full max-w-[220px] sm:max-w-[300px]">
              <Select value={selectedBot?.id || ''} onValueChange={handleBotChange}>
                <SelectTrigger
                  className="h-8 border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  disabled={isSwitchingBot}
                >
                  <span className="truncate">{selectedBot ? `@${selectedBot.bot_username}` : t('Select bot')}</span>
                </SelectTrigger>
                <SelectContent className="border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                  {bots.map((bot) => (
                    <SelectItem
                      key={bot.id}
                      value={bot.id}
                      className="text-zinc-900 dark:text-white"
                    >
                      @{bot.bot_username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSwitchingBot ? (
                <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-500">{t('Switching bot…')}</p>
              ) : null}
            </div>
          ) : (
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
              {profile?.business_name || 'Digital Shop'}
            </p>
          )}
        </div>

        <div className="ml-1 flex items-center gap-0.5 sm:ml-3 sm:gap-1">
          <LanguageToggle />
          <ThemeToggle />
          <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-600 dark:text-zinc-300"
            onClick={async () => {
              const next = !openNotifications;
              setOpenNotifications(next);
              setOpenProfile(false);
              if (next) await markNotificationsRead();
            }}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-4 rounded-full border border-zinc-300 bg-zinc-200 px-1 text-[10px] text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                {unreadCount}
              </span>
            ) : null}
            <span className="sr-only">Notifications</span>
          </Button>
          {openNotifications ? (
            <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1rem))] rounded-lg border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <p className="px-2 py-1 text-xs uppercase tracking-wide text-zinc-500">System announcements</p>
              <div className="max-h-80 overflow-auto">
                {announcements.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-zinc-600 dark:text-zinc-400">No announcements yet.</p>
                ) : (
                  announcements.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{item.title}</p>
                      <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{item.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
          </div>
        </div>

        <div className="relative ml-1 sm:ml-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => {
              setOpenProfile((v) => !v);
              setOpenNotifications(false);
            }}
          >
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {initials}
            </div>
            <CaretDown className="h-4 w-4 text-zinc-400" />
          </button>
          {openProfile ? (
            <div className="absolute right-0 mt-2 w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <button
                type="button"
                className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                onClick={() => {
                  setOpenProfile(false);
                  router.push('/settings');
                }}
              >
                Account
              </button>
              <button
                type="button"
                className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
