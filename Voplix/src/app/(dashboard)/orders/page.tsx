import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrdersDashboard } from '@/components/orders/orders-dashboard';
import { AutoRefresh } from '@/components/dashboard/auto-refresh';
import { FreePlanUpgradeBanner } from '@/components/dashboard/free-plan-banner';
import { getPlanEnforcementSnapshot } from '@/lib/plan-limits';
import { applyOrderStatusFilter, parseOrderStatusFilter, type OrderStatusFilter } from '@/lib/owner-orders-filter';

async function getBots(userId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('bots')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bots:', error);
    return [];
  }

  return (data as any[]) || [];
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

async function getOrdersPage(
  botId: string | null,
  userId: string,
  page: number,
  pageSize: number,
  statusFilter: OrderStatusFilter
) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = (supabase as any)
    .from('orders')
    .select('*, menu_items!inner(name, price, type, delivery_content), bots!inner(bot_username, user_id)', {
      count: 'exact',
    })
    .eq('bots.user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (botId) {
    query = query.eq('bot_id', botId);
  }

  query = applyOrderStatusFilter(query, statusFilter);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching orders:', error);
    return { orders: [] as any[], total: 0 };
  }

  return { orders: (data as any[]) || [], total: count ?? 0 };
}

async function getBotsForCleanup(userId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('bots')
    .select('id, bot_username')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data as { id: string; bot_username: string }[]) || [];
}

async function countSlipSubmittedForOwner(userId: string, botId: string | null) {
  const supabase = await createClient();
  const { data: botRows, error: bErr } = await (supabase as any)
    .from('bots')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (bErr) return 0;
  const ids = ((botRows as { id: string }[]) || []).map((b) => b.id);
  if (ids.length === 0) return 0;

  let q = (supabase as any)
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .in('bot_id', ids)
    .eq('status', 'SLIP_SUBMITTED')
    .is('deleted_at', null);

  if (botId && ids.includes(botId)) {
    q = q.eq('bot_id', botId);
  }

  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ bot?: string; page?: string; pageSize?: string; filter?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const bots = await getBots(user.id);

  if (bots.length === 0) {
    redirect('/onboarding');
  }

  const params = await searchParams;
  const selectedBotId = params.bot && bots.some((b: any) => b.id === params.bot) ? params.bot : null;

  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const rawSize = parseInt(params.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(10, rawSize));

  const statusFilter = parseOrderStatusFilter(params.filter);

  const [{ orders, total }, reviewCountTotal, planSnapshot, cleanupBots] = await Promise.all([
    getOrdersPage(selectedBotId, user.id, page, pageSize, statusFilter),
    countSlipSubmittedForOwner(user.id, selectedBotId),
    getPlanEnforcementSnapshot(user.id),
    getBotsForCleanup(user.id),
  ]);

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30000} />
      {planSnapshot.plan === 'free' ? <FreePlanUpgradeBanner /> : null}

      <OrdersDashboard
        orders={orders}
        totalCount={total}
        page={page}
        pageSize={pageSize}
        selectedBotId={selectedBotId}
        reviewCountTotal={reviewCountTotal}
        statusFilter={statusFilter}
        cleanupBots={cleanupBots}
      />
    </div>
  );
}
