import type { SupabaseClient } from '@supabase/supabase-js';
import { orderCountsTowardRevenue, revenueAmountFromOrderRow } from '@/lib/order-revenue';

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

  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('orders')
      .select('bot_id, status, created_at, updated_at, deleted_at, revenue_amount, menu_items(price)')
      .in('bot_id', botIds)
      .range(from, from + pageSize - 1);

    if (error || !data?.length) break;

    for (const row of data as unknown as Record<string, unknown>[]) {
      const bid = String(row.bot_id);
      const status = String(row.status);
      const created_at = String(row.created_at);
      if (!map[bid]) map[bid] = empty();
      const m = map[bid];
      if (orderCountsTowardRevenue(status)) {
        m.revenueCompleted += revenueAmountFromOrderRow(row as Parameters<typeof revenueAmountFromOrderRow>[0]);
      }
      if (row.deleted_at) {
        continue;
      }
      m.orderCount += 1;
      const t = created_at;
      if (!m.lastOrderAt || new Date(t).getTime() > new Date(m.lastOrderAt).getTime()) {
        m.lastOrderAt = t;
      }
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return map;
}
