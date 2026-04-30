'use client';

import { User } from '@supabase/supabase-js';
import { Bell, ChevronDown, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DashboardSidebar } from './sidebar';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DashboardHeaderProps {
  user: User;
  profile: {
    display_name: string | null;
    business_name: string | null;
    avatar_data_url: string | null;
  } | null;
  announcements: Array<{ id: string; title: string; message: string; created_at: string }>;
  unreadCount: number;
  bots: Array<{ id: string; bot_username: string }>;
}

const BOT_SCOPED_PAGES = ['/dashboard', '/menu', '/orders', '/broadcast'];

export function DashboardHeader({ user, profile, announcements, unreadCount, bots }: DashboardHeaderProps) {
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

  const initials = useMemo(() => {
    const src = (profile?.display_name || profile?.business_name || user.email || 'U').trim();
    return src.slice(0, 1).toUpperCase();
  }, [profile?.display_name, profile?.business_name, user.email]);

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
    <header className="sticky top-0 z-40 flex min-h-20 shrink-0 items-center gap-x-4 border-b border-zinc-800 bg-zinc-900/95 px-4 py-3 backdrop-blur sm:gap-x-6 sm:px-6 lg:px-8">
      <Sheet>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="lg:hidden text-zinc-400" />}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open sidebar</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 bg-zinc-900 border-zinc-800 p-0">
          <DashboardSidebar user={user} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 items-center justify-between">
        <div className="flex-1 text-center lg:text-left">
          <p className="text-sm text-zinc-400 truncate">
            Welcome, {profile?.display_name || user.email?.split('@')[0] || 'Owner'}
          </p>
          {bots.length > 0 ? (
            <div className="mx-auto mt-1 w-full max-w-[300px] lg:mx-0">
              <Select value={selectedBot?.id || ''} onValueChange={handleBotChange}>
                <SelectTrigger className="h-8 bg-zinc-800 border-zinc-700 text-white" disabled={isSwitchingBot}>
                  <span className="truncate">{selectedBot ? `@${selectedBot.bot_username}` : 'Select bot'}</span>
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {bots.map((bot) => (
                    <SelectItem key={bot.id} value={bot.id} className="text-white">
                      @{bot.bot_username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSwitchingBot ? (
                <p className="mt-1 text-sm font-medium text-indigo-300">Switching bot...</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm font-semibold text-white truncate">{profile?.business_name || 'Digital Shop'}</p>
          )}
        </div>

        <div className="relative ml-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-300"
            onClick={async () => {
              const next = !openNotifications;
              setOpenNotifications(next);
              setOpenProfile(false);
              if (next) await markNotificationsRead();
            }}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-indigo-600 px-1 text-[10px] text-white">
                {unreadCount}
              </span>
            ) : null}
            <span className="sr-only">Notifications</span>
          </Button>
          {openNotifications ? (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-zinc-800 bg-zinc-900 p-2 shadow-xl">
              <p className="px-2 py-1 text-xs uppercase tracking-wide text-zinc-500">System announcements</p>
              <div className="max-h-80 overflow-auto">
                {announcements.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-zinc-400">No announcements yet.</p>
                ) : (
                  announcements.map((item) => (
                    <div key={item.id} className="rounded-md px-2 py-2 hover:bg-zinc-800">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{item.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative ml-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-800"
            onClick={() => {
              setOpenProfile((v) => !v);
              setOpenNotifications(false);
            }}
          >
            <div className="h-8 w-8 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-sm text-zinc-200">
              {profile?.avatar_data_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_data_url} alt="Profile avatar" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </button>
          {openProfile ? (
            <div className="absolute right-0 mt-2 w-44 rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-xl">
              <button
                type="button"
                className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                onClick={() => {
                  setOpenProfile(false);
                  router.push('/profile');
                }}
              >
                Profile
              </button>
              <button
                type="button"
                className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
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
