import { supabaseAdmin } from '@/lib/supabase/admin';

/** Orders waiting for slip review across all of the user’s active bots. */
export async function countPendingSlipOrdersForUser(userId: string): Promise<number> {
  const { data: bots, error: bErr } = await (supabaseAdmin.from('bots') as any)
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (bErr || !bots?.length) return 0;

  const ids = (bots as { id: string }[]).map((b) => b.id);
  const { count, error } = await (supabaseAdmin.from('orders') as any)
    .select('*', { count: 'exact', head: true })
    .in('bot_id', ids)
    .eq('status', 'SLIP_SUBMITTED');

  if (error) {
    console.warn('[countPendingSlipOrdersForUser]', error.message);
    return 0;
  }
  return count ?? 0;
}
