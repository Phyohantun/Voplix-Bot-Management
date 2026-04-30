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

async function getOrders(botId: string | null, userId: string) {
  const supabase = await createClient();
  
  let query = (supabase as any)
    .from('orders')
    .select('*, menu_items!inner(name, price), bots!inner(bot_username, user_id)')
    .eq('bots.user_id', userId)
    .order('created_at', { ascending: false });

  if (botId) {
    query = query.eq('bot_id', botId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }

  return (data as any[]) || [];
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ bot?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  const bots = await getBots(user.id);
  
  if (bots.length === 0) {
    redirect('/onboarding');
  }

  const params = await searchParams;
  const selectedBotId = params.bot || null;
  
  const orders = await getOrders(selectedBotId, user.id);
  
  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30000} />
      <div>
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <p className="text-zinc-400">Manage and fulfill customer orders</p>
      </div>
      
      <OrdersDashboard 
        bots={bots}
        orders={orders}
        selectedBotId={selectedBotId}
      />
    </div>
  );
}
