import { supabaseAdmin } from '@/lib/supabase/admin';
import { listAllUsersWithPlatformAccounts } from '@/lib/admin-users-list';
import { fetchPlatformSubscriptionSettingsAdmin } from '@/lib/platform-subscription-settings-load';

export type AdminOverviewStats = {
  totalUsers: number;
  activeBots: number;
  pendingSlips: number;
  mrrMmk: number;
  payingProCount: number;
  payingPlusCount: number;
  usersWithBots: number;
  freeCount: number;
  proCount: number;
  plusCount: number;
  recentSignups: { id: string; email: string; display_name: string | null; created_at: string; plan_tier: string }[];
};

function isPaidPeriodActive(subscriptionPeriodEnd: string | null): boolean {
  if (!subscriptionPeriodEnd) return true;
  const d = new Date(subscriptionPeriodEnd);
  return !Number.isNaN(d.getTime()) && d > new Date();
}

export async function loadAdminOverviewStats(): Promise<AdminOverviewStats> {
  const [users, settings, pendingRes, botsRes] = await Promise.all([
    listAllUsersWithPlatformAccounts(),
    fetchPlatformSubscriptionSettingsAdmin(),
    (supabaseAdmin.from('platform_subscription_requests') as any)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    (supabaseAdmin.from('bots') as any).select('*', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  const pendingSlips = pendingRes.count ?? 0;
  const activeBots = botsRes.count ?? 0;

  const { data: botOwnerRows } = await (supabaseAdmin.from('bots') as any)
    .select('user_id')
    .eq('is_active', true);
  const usersWithBots = new Set(
    ((botOwnerRows ?? []) as { user_id: string }[]).map((r) => r.user_id)
  ).size;

  let mrrMmk = 0;
  let payingProCount = 0;
  let payingPlusCount = 0;
  let freeCount = 0;
  let proCount = 0;
  let plusCount = 0;
  for (const u of users) {
    if (u.plan_tier === 'pro') proCount += 1;
    else if (u.plan_tier === 'plus') plusCount += 1;
    else freeCount += 1;

    if (!isPaidPeriodActive(u.subscription_period_end)) continue;
    if (u.plan_tier === 'pro') {
      mrrMmk += settings.price_pro_mmk_month;
      payingProCount += 1;
    } else if (u.plan_tier === 'plus') {
      mrrMmk += settings.price_plus_mmk_month;
      payingPlusCount += 1;
    }
  }

  const recentSignups = [...users]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 12)
    .map((u) => ({
      id: u.id,
      email: u.email,
      display_name: u.display_name,
      created_at: u.created_at,
      plan_tier: u.plan_tier,
    }));

  return {
    totalUsers: users.length,
    activeBots,
    pendingSlips,
    mrrMmk,
    payingProCount,
    payingPlusCount,
    usersWithBots,
    freeCount,
    proCount,
    plusCount,
    recentSignups,
  };
}
