import type { SupabaseClient } from '@supabase/supabase-js';

export type BotCardStats = {
  orderCount: number;
  revenueCompleted: number;
  lastOrderAt: string | null;
};

export async function fetchBotCardStatsMap(
  supabase: SupabaseClient,
  botIds: string[]
): Promise<Record<string, BotCardStats>> {
  const empty = (): BotCardStats => ({
    orderCount: 0,
    revenueCompleted: 0,
    lastOrderAt: null,
  });

  const map: Record<string, BotCardStats> = {};
  for (const id of botIds) map[id] = empty();
  if (botIds.length === 0) return map;

  const { data, error } = await supabase
    .from('orders')
    .select('bot_id, status, created_at, updated_at, menu_items(price)')
    .in('bot_id', botIds);

  if (error || !data) return map;

  const priceFromRow = (row: Record<string, unknown>): number => {
    const mi = row.menu_items;
    if (mi && typeof mi === 'object' && !Array.isArray(mi) && 'price' in mi) {
      return Number((mi as { price: unknown }).price || 0);
    }
    if (Array.isArray(mi) && mi[0] && typeof mi[0] === 'object' && 'price' in mi[0]) {
      return Number((mi[0] as { price: unknown }).price || 0);
    }
    return 0;
  };

  for (const row of data as unknown as Record<string, unknown>[]) {
    const bid = String(row.bot_id);
    const status = String(row.status);
    const created_at = String(row.created_at);
    if (!map[bid]) map[bid] = empty();
    const m = map[bid];
    m.orderCount += 1;
    if (status === 'COMPLETED') {
      m.revenueCompleted += priceFromRow(row);
    }
    const t = created_at;
    if (!m.lastOrderAt || new Date(t).getTime() > new Date(m.lastOrderAt).getTime()) {
      m.lastOrderAt = t;
    }
  }

  return map;
}
