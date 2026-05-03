import type { SupabaseClient } from '@supabase/supabase-js';
import { revenueAmountFromOrderRow } from '@/lib/order-revenue';

export type PendingOrderRow = {
  id: string;
  telegram_username: string | null;
  created_at: string;
  slip_image_url: string | null;
  menu_items: { name: string; price: number; type?: string } | null;
};

export type DashboardTrend = {
  label: string;
  direction: 'up' | 'down' | 'flat';
  /** Short hint under the percentage */
  hint: string;
};

export type GettingStartedState = {
  hasBot: boolean;
  hasProduct: boolean;
  hasStock: boolean;
  hasOrder: boolean;
};

function utcDayStart(offsetFromToday: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offsetFromToday, 0, 0, 0, 0));
}

function iso(d: Date) {
  return d.toISOString();
}

function pctChange(current: number, previous: number): DashboardTrend {
  if (previous <= 0 && current <= 0) return { label: '—', direction: 'flat', hint: 'vs prior day' };
  if (previous <= 0 && current > 0) return { label: '+100%', direction: 'up', hint: 'vs prior day' };
  const raw = ((current - previous) / previous) * 100;
  const rounded = Math.round(raw * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  const dir = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
  return { label: `${sign}${rounded}%`, direction: dir, hint: 'vs prior day' };
}

function slipActivityTrend(current: number, previous: number): DashboardTrend {
  const t = pctChange(current, previous);
  return { ...t, hint: 'slip activity (24h vs prior 24h)' };
}

async function botIdsForUser(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('bots')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true);
  return ((data as { id: string }[]) || []).map((b) => b.id);
}

async function countOrdersInRange(
  supabase: SupabaseClient,
  botIds: string[],
  start: string,
  end: string,
  botFilter: string | null
): Promise<number> {
  if (botIds.length === 0) return 0;
  const ids = botFilter && botIds.includes(botFilter) ? [botFilter] : botIds;
  const { count } = await (supabase as any)
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .in('bot_id', ids)
    .is('deleted_at', null)
    .gte('created_at', start)
    .lt('created_at', end);
  return count ?? 0;
}

async function sumCompletedRevenueInRange(
  supabase: SupabaseClient,
  userId: string,
  botIds: string[],
  start: string,
  end: string,
  botFilter: string | null
): Promise<number> {
  if (botIds.length === 0) return 0;
  let q = (supabase as any)
    .from('orders')
    .select('revenue_amount, menu_items(price)')
    .in('status', ['COMPLETED', 'APPROVED'])
    .eq('bots.user_id', userId)
    .gte('updated_at', start)
    .lt('updated_at', end);
  if (botFilter && botIds.includes(botFilter)) q = q.eq('bot_id', botFilter);
  const { data, error } = await q;
  if (error || !data) return 0;
  return (data as Parameters<typeof revenueAmountFromOrderRow>[0][]).reduce(
    (s, row) => s + revenueAmountFromOrderRow(row),
    0
  );
}

async function countBotsCreatedInRange(
  supabase: SupabaseClient,
  userId: string,
  start: string,
  end: string
): Promise<number> {
  const { count } = await (supabase as any)
    .from('bots')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)
    .gte('created_at', start)
    .lt('created_at', end);
  return count ?? 0;
}

async function countSlipActivityInRange(
  supabase: SupabaseClient,
  botIds: string[],
  start: string,
  end: string,
  botFilter: string | null
): Promise<number> {
  if (botIds.length === 0) return 0;
  const ids = botFilter && botIds.includes(botFilter) ? [botFilter] : botIds;
  const { count } = await (supabase as any)
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'SLIP_SUBMITTED')
    .in('bot_id', ids)
    .is('deleted_at', null)
    .gte('updated_at', start)
    .lt('updated_at', end);
  return count ?? 0;
}

export async function fetchDashboardPageModel(
  supabase: SupabaseClient,
  userId: string,
  selectedBotId: string | null
): Promise<{
  totalBots: number;
  /** All SLIP_SUBMITTED orders (not capped at 8). */
  pendingCount: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: PendingOrderRow[];
  trends: {
    bots: DashboardTrend;
    pending: DashboardTrend;
    orders: DashboardTrend;
    revenue: DashboardTrend;
  };
  revenueSparkline: number[];
  gettingStarted: GettingStartedState;
  allComplete: boolean;
}> {
  const botIds = await botIdsForUser(supabase, userId);
  const scopeIds = selectedBotId && botIds.includes(selectedBotId) ? [selectedBotId] : botIds;

  if (botIds.length === 0) {
    return {
      totalBots: 0,
      pendingCount: 0,
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: [],
      trends: {
        bots: { label: '—', direction: 'flat', hint: 'Connect a bot to see trends' },
        pending: { label: '—', direction: 'flat', hint: '' },
        orders: { label: '—', direction: 'flat', hint: '' },
        revenue: { label: '—', direction: 'flat', hint: '' },
      },
      revenueSparkline: [0, 0, 0, 0, 0, 0, 0],
      gettingStarted: {
        hasBot: false,
        hasProduct: false,
        hasStock: false,
        hasOrder: false,
      },
      allComplete: false,
    };
  }

  const y0 = utcDayStart(1);
  const y1 = utcDayStart(0);
  const d2 = utcDayStart(2);

  const yesterdayStart = iso(y0);
  const yesterdayEnd = iso(y1);
  const dayBeforeStart = iso(d2);
  const dayBeforeEnd = iso(y0);

  const nowIso = new Date().toISOString();
  const h24 = new Date(Date.now() - 864e5).toISOString();
  const h48 = new Date(Date.now() - 1728e5).toISOString();

  const [
    botsCountRes,
    pendingTotalRes,
    pendingOrdersResult,
    totalOrdersResult,
    revenueRows,
    ordersYesterday,
    ordersDayBefore,
    revYesterday,
    revDayBefore,
    botsYesterday,
    botsDayBefore,
    slipLast24,
    slipPrev24,
  ] = await Promise.all([
    (supabase as any)
      .from('bots')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true),
    (supabase as any)
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'SLIP_SUBMITTED')
      .in('bot_id', scopeIds)
      .is('deleted_at', null),
    (supabase as any)
      .from('orders')
      .select('id, telegram_username, created_at, slip_image_url, menu_items(name, price, type)')
      .eq('status', 'SLIP_SUBMITTED')
      .in('bot_id', scopeIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(8),
    (() => {
      let q = (supabase as any)
        .from('orders')
        .select('id, bots!inner(user_id)')
        .eq('bots.user_id', userId)
        .is('deleted_at', null);
      if (selectedBotId && botIds.includes(selectedBotId)) q = q.eq('bot_id', selectedBotId);
      return q;
    })(),
    (() => {
      let q = (supabase as any)
        .from('orders')
        .select('revenue_amount, menu_items(price)')
        .in('status', ['COMPLETED', 'APPROVED'])
        .eq('bots.user_id', userId);
      if (selectedBotId && botIds.includes(selectedBotId)) q = q.eq('bot_id', selectedBotId);
      return q;
    })(),
    countOrdersInRange(supabase, botIds, yesterdayStart, yesterdayEnd, selectedBotId),
    countOrdersInRange(supabase, botIds, dayBeforeStart, dayBeforeEnd, selectedBotId),
    sumCompletedRevenueInRange(supabase, userId, botIds, yesterdayStart, yesterdayEnd, selectedBotId),
    sumCompletedRevenueInRange(supabase, userId, botIds, dayBeforeStart, dayBeforeEnd, selectedBotId),
    countBotsCreatedInRange(supabase, userId, yesterdayStart, yesterdayEnd),
    countBotsCreatedInRange(supabase, userId, dayBeforeStart, dayBeforeEnd),
    countSlipActivityInRange(supabase, botIds, h24, nowIso, selectedBotId),
    countSlipActivityInRange(supabase, botIds, h48, h24, selectedBotId),
  ]);

  const totalBots = botsCountRes.count ?? 0;
  const pendingTotal = pendingTotalRes.count ?? 0;
  const pendingData = (pendingOrdersResult?.data as PendingOrderRow[]) || [];
  const totalOrders = (totalOrdersResult?.data as unknown[])?.length || 0;
  const revenue =
    ((revenueRows?.data as Parameters<typeof revenueAmountFromOrderRow>[0][]) || []).reduce(
      (s, r) => s + revenueAmountFromOrderRow(r),
      0
    ) || 0;

  const botsTrend = pctChange(botsYesterday, botsDayBefore);
  const pendingTrend = slipActivityTrend(slipLast24, slipPrev24);
  const ordersTrend = pctChange(ordersYesterday, ordersDayBefore);
  const revenueTrend = pctChange(revYesterday, revDayBefore);

  const dayStarts = [6, 5, 4, 3, 2, 1, 0].map((i) => {
    const start = utcDayStart(i);
    const end = utcDayStart(i - 1);
    return { start: iso(start), end: iso(end) };
  });
  const sparkVals = await Promise.all(
    dayStarts.map(({ start, end }) =>
      sumCompletedRevenueInRange(supabase, userId, botIds, start, end, selectedBotId)
    )
  );

  const { count: productCount } = await (supabase as any)
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .in('bot_id', botIds)
    .eq('is_active', true);

  const { data: menuIdRows } = await (supabase as any).from('menu_items').select('id').in('bot_id', botIds);
  const mids = ((menuIdRows as { id: string }[]) || []).map((m) => m.id);
  let stockCount = 0;
  if (mids.length > 0) {
    const { count } = await (supabase as any)
      .from('stock_items')
      .select('*', { count: 'exact', head: true })
      .in('menu_item_id', mids);
    stockCount = count ?? 0;
  }

  const { count: orderCount } = await (supabase as any)
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .in('bot_id', botIds)
    .is('deleted_at', null);

  const gettingStarted: GettingStartedState = {
    hasBot: totalBots > 0,
    hasProduct: (productCount ?? 0) > 0,
    hasStock: stockCount > 0,
    hasOrder: (orderCount ?? 0) > 0,
  };
  const allComplete =
    gettingStarted.hasBot &&
    gettingStarted.hasProduct &&
    gettingStarted.hasStock &&
    gettingStarted.hasOrder;

  return {
    totalBots,
    pendingCount: pendingTotal,
    totalOrders,
    totalRevenue: revenue,
    pendingOrders: pendingData,
    trends: {
      bots: botsTrend,
      pending: pendingTrend,
      orders: ordersTrend,
      revenue: revenueTrend,
    },
    revenueSparkline: sparkVals,
    gettingStarted,
    allComplete,
  };
}
