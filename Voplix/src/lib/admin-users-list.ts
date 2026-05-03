import { supabaseAdmin } from '@/lib/supabase/admin';

export type AdminUserRow = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  account_status: string;
  plan_tier: string;
  subscription_period_end: string | null;
  subscription_current_period_start: string | null;
  can_use_broadcast: boolean;
  can_use_stock: boolean;
  can_use_orders: boolean;
  admin_notes: string | null;
};

export async function listAllUsersWithPlatformAccounts(): Promise<AdminUserRow[]> {
  const collected: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null }[] = [];
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }
    const batch = data?.users ?? [];
    for (const u of batch) {
      collected.push({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      });
    }
    if (batch.length < perPage) break;
    page += 1;
    if (page > 100) break;
  }

  if (collected.length === 0) return [];

  const ids = collected.map((u) => u.id);
  const [{ data: accounts, error: accErr }, { data: profiles }] = await Promise.all([
    (supabaseAdmin.from('platform_accounts') as any).select('*').in('user_id', ids),
    (supabaseAdmin.from('owner_profiles') as any).select('user_id, display_name').in('user_id', ids),
  ]);

  if (accErr) {
    console.error('[admin-users-list] platform_accounts:', accErr.message);
  }

  const map = new Map<string, Record<string, unknown>>(
    ((accounts ?? []) as Record<string, unknown>[]).map((a: any) => [a.user_id as string, a])
  );
  const profileMap = new Map<string, string | null>(
    ((profiles ?? []) as { user_id: string; display_name: string | null }[]).map((p) => [
      p.user_id,
      p.display_name?.trim() ? p.display_name.trim() : null,
    ])
  );

  return collected.map((u) => {
    const a = map.get(u.id) as any;
    const endRaw = a?.subscription_period_end as string | null | undefined;
    const startRaw = a?.subscription_current_period_start as string | null | undefined;
    return {
      id: u.id,
      email: u.email ?? '',
      display_name: profileMap.get(u.id) ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      account_status: (a?.account_status as string) ?? 'active',
      plan_tier: (a?.plan_tier as string) ?? 'free',
      subscription_period_end: typeof endRaw === 'string' && endRaw.trim() ? endRaw : null,
      subscription_current_period_start: typeof startRaw === 'string' && startRaw.trim() ? startRaw : null,
      can_use_broadcast: a?.can_use_broadcast !== false,
      can_use_stock: a?.can_use_stock !== false,
      can_use_orders: a?.can_use_orders !== false,
      admin_notes: (a?.admin_notes as string) ?? null,
    };
  });
}
