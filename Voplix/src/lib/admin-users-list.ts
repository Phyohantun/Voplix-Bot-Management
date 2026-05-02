import { supabaseAdmin } from '@/lib/supabase/admin';

export type AdminUserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  account_status: string;
  plan_tier: string;
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
  const { data: accounts, error: accErr } = await (supabaseAdmin.from('platform_accounts') as any)
    .select('*')
    .in('user_id', ids);

  if (accErr) {
    console.error('[admin-users-list] platform_accounts:', accErr.message);
  }

  const map = new Map<string, Record<string, unknown>>(
    ((accounts ?? []) as Record<string, unknown>[]).map((a: any) => [a.user_id as string, a])
  );

  return collected.map((u) => {
    const a = map.get(u.id) as any;
    return {
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      account_status: (a?.account_status as string) ?? 'active',
      plan_tier: (a?.plan_tier as string) ?? 'free',
      can_use_broadcast: a?.can_use_broadcast !== false,
      can_use_stock: a?.can_use_stock !== false,
      can_use_orders: a?.can_use_orders !== false,
      admin_notes: (a?.admin_notes as string) ?? null,
    };
  });
}
