import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatCircle, ShoppingCart, CurrencyDollar, Clock } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { AutoRefresh } from '@/components/dashboard/auto-refresh';
import { formatOrderTimestamp } from '@/lib/format-order';
import { formatCurrencyAmount, shopCurrencyFromUser } from '@/lib/currency';

interface BotRecord {
  id: string;
  bot_username: string;
}

interface PendingOrderRow {
  id: string;
  telegram_username: string | null;
  created_at: string;
  menu_items: { name: string; price: number } | null;
}

async function getBots(userId: string) {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('bots')
    .select('id, bot_username')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return ((data as BotRecord[]) || []);
}

async function getDashboardStats(userId: string, botId: string | null) {
  const supabase = await createClient();

  const { count: totalBots } = await (supabase as any)
    .from('bots')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  let pendingQuery = (supabase as any)
    .from('orders')
    .select('id, telegram_username, created_at, menu_items(name, price), bots!inner(user_id, id)')
    .eq('status', 'SLIP_SUBMITTED')
    .eq('bots.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(8);
  if (botId) pendingQuery = pendingQuery.eq('bot_id', botId);
  const { data: pendingOrdersData } = await pendingQuery;

  let totalOrdersQuery = (supabase as any)
    .from('orders')
    .select('id, bots!inner(user_id)')
    .eq('bots.user_id', userId);
  if (botId) totalOrdersQuery = totalOrdersQuery.eq('bot_id', botId);
  const { data: totalOrdersData } = await totalOrdersQuery;

  let revenueQuery = (supabase as any)
    .from('orders')
    .select('menu_items(price), bots!inner(user_id), status')
    .eq('status', 'COMPLETED')
    .eq('bots.user_id', userId);
  if (botId) revenueQuery = revenueQuery.eq('bot_id', botId);
  const { data: revenue } = await revenueQuery;

  const totalRevenue =
    (revenue as any[])?.reduce((sum, order) => sum + Number(order.menu_items?.price || 0), 0) || 0;

  return {
    totalBots: totalBots || 0,
    pendingOrdersData: (pendingOrdersData || []) as PendingOrderRow[],
    pendingOrders: (pendingOrdersData as any[])?.length || 0,
    totalOrders: (totalOrdersData as any[])?.length || 0,
    totalRevenue,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bot?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const bots = await getBots(user.id);
  const selectedBotId = params.bot && bots.some((b) => b.id === params.bot) ? params.bot : null;
  const stats = await getDashboardStats(user.id, selectedBotId);
  const currency = shopCurrencyFromUser(user);
  
  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30000} />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
        <p className="text-zinc-600 dark:text-zinc-400">A quick view of your bot activity and sales performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Total Bots</CardTitle>
            <ChatCircle className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.totalBots}</div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Active bots
            </p>
          </CardContent>
        </Card>
        
        <Link href={`/orders${selectedBotId ? `?bot=${selectedBotId}` : ''}`}>
          <Card className="cursor-pointer border-zinc-200 bg-white transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.pendingOrders}</div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Awaiting slip verification
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.totalOrders}</div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              All time orders
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Revenue</CardTitle>
            <CurrencyDollar className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {formatCurrencyAmount(stats.totalRevenue, currency)}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Completed paid orders
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-900 dark:text-white">Quick Actions</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">Most-used actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link 
              href="/bots"
              className="flex items-center justify-between rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm text-zinc-900 transition-colors hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
            >
              <span className="flex items-center gap-3">
                <ChatCircle className="h-4 w-4 text-zinc-500" />
                Connect bot
              </span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Open</span>
            </Link>
            <Link 
              href={`/menu${selectedBotId ? `?bot=${selectedBotId}` : ''}`}
              className="flex items-center justify-between rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm text-zinc-900 transition-colors hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
            >
              <span className="flex items-center gap-3">
                <ShoppingCart className="h-4 w-4 text-zinc-500" />
                Manage menu
              </span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Open</span>
            </Link>
            <Link 
              href={`/orders${selectedBotId ? `?bot=${selectedBotId}` : ''}`}
              className="flex items-center justify-between rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white transition-colors hover:bg-zinc-700"
            >
              <span className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-zinc-500" />
                Review pending orders
              </span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Open</span>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-900 dark:text-white">Getting Started</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">
              Steps to set up your bot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-600 bg-zinc-200 dark:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                1
              </div>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Connect your Telegram bot</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-600 bg-zinc-200 dark:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                2
              </div>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Create menu items for your products</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-600 bg-zinc-200 dark:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                3
              </div>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Add stock for digital products</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 bg-zinc-200/80 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
                4
              </div>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Start receiving orders!</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-white">Pending Orders</CardTitle>
          <CardDescription className="text-zinc-600 dark:text-zinc-400">
            Latest orders waiting for payment verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.pendingOrdersData.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No pending orders.</p>
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {stats.pendingOrdersData.map((order) => (
                  <div key={order.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/60 p-3 text-sm text-zinc-800 dark:text-zinc-200">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/orders${selectedBotId ? `?bot=${selectedBotId}` : ''}`}
                        className="font-medium text-zinc-800 dark:text-zinc-200 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-950 dark:hover:text-zinc-900 dark:text-white"
                      >
                        #{order.id.slice(0, 8)}
                      </Link>
                      <span className="text-xs text-zinc-500 tabular-nums">{formatOrderTimestamp(order.created_at)}</span>
                    </div>
                    <p className="mt-2 text-zinc-700 dark:text-zinc-300">{order.menu_items?.name || '-'}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{order.telegram_username || '-'}</p>
                    <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300">
                      {formatCurrencyAmount(Number(order.menu_items?.price || 0), currency)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                <thead className="text-zinc-600 dark:text-zinc-400">
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-2 text-left font-medium">Order</th>
                    <th className="py-2 text-left font-medium">Customer</th>
                    <th className="py-2 text-left font-medium">Product</th>
                    <th className="py-2 text-left font-medium">Price</th>
                    <th className="py-2 text-left font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.pendingOrdersData.map((order) => (
                    <tr key={order.id} className="border-b border-zinc-200 dark:border-zinc-800/70 text-zinc-800 dark:text-zinc-200">
                      <td className="py-2">
                        <Link
                          href={`/orders${selectedBotId ? `?bot=${selectedBotId}` : ''}`}
                          className="text-zinc-800 dark:text-zinc-200 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-950 dark:hover:text-zinc-900 dark:text-white"
                        >
                          #{order.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-2">{order.telegram_username || '-'}</td>
                      <td className="py-2">{order.menu_items?.name || '-'}</td>
                      <td className="py-2">
                        {formatCurrencyAmount(Number(order.menu_items?.price || 0), currency)}
                      </td>
                      <td className="py-2 tabular-nums">{formatOrderTimestamp(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
