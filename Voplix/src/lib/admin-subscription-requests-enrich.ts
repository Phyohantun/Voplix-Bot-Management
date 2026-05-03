import { supabaseAdmin } from '@/lib/supabase/admin';

export type AccountSnapshot = {
  plan_tier: string;
  subscription_period_end: string | null;
};

/** Attach current platform account plan + expiry for each request’s user (admin review). */
export async function enrichSubscriptionRequestsWithAccountSnapshots<
  T extends { user_id: string },
>(requests: T[]): Promise<(T & { account_snapshot: AccountSnapshot | null })[]> {
  const userIds = [...new Set(requests.map((r) => r.user_id))];
  if (userIds.length === 0) {
    return requests.map((r) => ({ ...r, account_snapshot: null }));
  }

  const { data: accRows, error } = await (supabaseAdmin.from('platform_accounts') as any)
    .select('user_id, plan_tier, subscription_period_end')
    .in('user_id', userIds);

  if (error) {
    console.error('[enrichSubscriptionRequestsWithAccountSnapshots]', error.message);
  }

  const map = new Map<string, AccountSnapshot>();
  for (const a of (accRows ?? []) as Record<string, unknown>[]) {
    const uid = a.user_id as string;
    const endRaw = a.subscription_period_end;
    map.set(uid, {
      plan_tier: String(a.plan_tier ?? 'free'),
      subscription_period_end:
        typeof endRaw === 'string' && endRaw.trim() ? endRaw : null,
    });
  }

  return requests.map((r) => ({
    ...r,
    account_snapshot: map.get(r.user_id) ?? null,
  }));
}
