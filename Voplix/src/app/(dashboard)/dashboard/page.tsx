import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, ShoppingCart, DollarSign, Clock } from 'lucide-react';
import Link from 'next/link';

async function getDashboardStats(userId: string) {
  const supabase = await createClient();
  
  // Get total bots
  const { count: totalBots } = await (supabase as any)
    .from('bots')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);
  
  // Get pending orders (simplified query)
  const { data: pendingOrdersData } = await (supabase as any)
    .from('orders')
    .select('id, bots!inner(user_id)')
    .eq('status', 'SLIP_SUBMITTED')
    .eq('bots.user_id', userId);
  
  // Get total orders
  const { data: totalOrdersData } = await (supabase as any)
    .from('orders')
    .select('id, bots!inner(user_id)')
    .eq('bots.user_id', userId);
  
  // Get total revenue (completed orders)
  const { data: revenue } = await (supabase as any)
    .from('orders')
    .select('menu_items!inner(price)')
    .eq('status', 'COMPLETED')
    .eq('bots!inner(user_id)', userId);
  
  const totalRevenue = (revenue as any[])?.reduce((sum, order) => sum + (order.menu_items?.price || 0), 0) || 0;
  
  return {
    totalBots: totalBots || 0,
    pendingOrders: (pendingOrdersData as any[])?.length || 0,
    totalOrders: (totalOrdersData as any[])?.length || 0,
    totalRevenue,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  const stats = await getDashboardStats(user.id);
  
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400">A quick view of your bot activity and sales performance.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-300">Total Bots</CardTitle>
            <Bot className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalBots}</div>
            <p className="text-xs text-zinc-400">
              Active bots
            </p>
          </CardContent>
        </Card>
        
        <Link href="/orders">
          <Card className="border-zinc-800 bg-zinc-900 transition-colors hover:bg-zinc-800/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.pendingOrders}</div>
              <p className="text-xs text-zinc-400">
                Awaiting slip verification
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-300">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalOrders}</div>
            <p className="text-xs text-zinc-400">
              All time orders
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-300">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalRevenue.toLocaleString()} THB</div>
            <p className="text-xs text-zinc-400">
              Completed orders
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-zinc-400">Most-used actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link 
              href="/bots"
              className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white transition-colors hover:bg-zinc-700"
            >
              <span className="flex items-center gap-3">
                <Bot className="h-4 w-4 text-indigo-400" />
                Connect bot
              </span>
              <span className="text-xs text-zinc-400">Open</span>
            </Link>
            <Link 
              href="/menu"
              className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white transition-colors hover:bg-zinc-700"
            >
              <span className="flex items-center gap-3">
                <ShoppingCart className="h-4 w-4 text-indigo-400" />
                Manage menu
              </span>
              <span className="text-xs text-zinc-400">Open</span>
            </Link>
            <Link 
              href="/orders"
              className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white transition-colors hover:bg-zinc-700"
            >
              <span className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-indigo-400" />
                Review pending orders
              </span>
              <span className="text-xs text-zinc-400">Open</span>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white">Getting Started</CardTitle>
            <CardDescription className="text-zinc-400">
              Steps to set up your bot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
                1
              </div>
              <span className="text-sm text-zinc-300">Connect your Telegram bot</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
                2
              </div>
              <span className="text-sm text-zinc-300">Create menu items for your products</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
                3
              </div>
              <span className="text-sm text-zinc-300">Add stock for digital products</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-xs text-zinc-300">
                4
              </div>
              <span className="text-sm text-zinc-400">Start receiving orders!</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
