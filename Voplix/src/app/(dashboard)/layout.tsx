import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { CurrencyProvider } from '@/components/dashboard/currency-context';
import { getOwnerProfileForLayout } from '@/lib/owner-profile';
import { shopCurrencyFromUser } from '@/lib/currency';
import { getPlatformAccountForUser } from '@/lib/platform-account';
import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav';
import { DashboardActivityProvider } from '@/components/dashboard/dashboard-activity-context';
import { DashboardAlertStrip } from '@/components/dashboard/dashboard-alert-strip';
import { DashboardActivityPoller } from '@/components/dashboard/dashboard-activity-poller';
import { countPendingSlipOrdersForUser } from '@/lib/dashboard-activity';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const platformAccount = await getPlatformAccountForUser(user.id);
  const status = platformAccount?.account_status;
  if (status === 'suspended') {
    redirect('/account-suspended');
  }

  const [profile, announcementsResult, botsResult] = await Promise.all([
    getOwnerProfileForLayout(user.id),
    (supabase as any)
      .from('system_announcements')
      .select('id, title, message, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20),
    (supabase as any)
      .from('bots')
      .select('id, bot_username')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
  ]);

  const announcements = (announcementsResult?.data as any[]) || [];
  const bots = (botsResult?.data as any[]) || [];

  const unreadCount = announcements.filter((a) => {
    if (!profile?.notification_last_seen_at) return true;
    return new Date(a.created_at).getTime() > new Date(profile.notification_last_seen_at).getTime();
  }).length;

  const initialPendingSlipOrders = await countPendingSlipOrdersForUser(user.id);

  const currency = shopCurrencyFromUser(user);

  return (
      <CurrencyProvider value={currency}>
        <DashboardActivityProvider
          initialPendingSlipOrders={initialPendingSlipOrders}
          initialUnreadAnnouncements={unreadCount}
        >
          <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
            <DashboardSidebar user={user} />
            <div className="lg:pl-72">
              <DashboardHeader
                user={user}
                profile={profile}
                announcements={(announcements as any[]) || []}
                unreadCount={unreadCount}
                bots={(bots as any[]) || []}
              />
              <DashboardAlertStrip />
              <main className="px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-8 lg:pb-8">{children}</main>
            </div>
            <Suspense fallback={null}>
              <MobileBottomNav />
            </Suspense>
            <DashboardActivityPoller />
          </div>
        </DashboardActivityProvider>
      </CurrencyProvider>
  );
}
