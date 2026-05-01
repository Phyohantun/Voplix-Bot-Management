import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrdersDashboard } from '@/components/orders/orders-dashboard';
import { AutoRefresh } from '@/components/dashboard/auto-refresh';

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

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

async function getOrdersPage(
  botId: string | null,
  userId: string,
  page: number,
  pageSize: number
) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = (supabase as any)
    .from('orders')
    .select('*, menu_items!inner(name, price), bots!inner(bot_username, user_id)', { count: 'exact' })
    .eq('bots.user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (botId) {
    query = query.eq('bot_id', botId);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching orders:', error);
    return { orders: [] as any[], total: 0 };
  }

  return { orders: (data as any[]) || [], total: count ?? 0 };
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ bot?: string; page?: string; pageSize?: string }>;
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

  const { orders, total } = await getOrdersPage(selectedBotId, user.id, page, pageSize);

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30000} />
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Orders</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Review payments, confirm or reject orders, and remove old history when you want a shorter list.
        </p>
      </div>

      <OrdersDashboard
        orders={orders}
        totalCount={total}
        page={page}
        pageSize={pageSize}
        selectedBotId={selectedBotId}
      />
    </div>
  );
}
