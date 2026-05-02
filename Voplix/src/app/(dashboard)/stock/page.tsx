import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { StockManager, type DigitalMenuWithStock } from '@/components/stock/stock-manager';
import { getPlanEnforcementSnapshot } from '@/lib/plan-limits';
import { FreePlanUpgradeBanner } from '@/components/dashboard/free-plan-banner';

interface BotRecord {
  id: string;
  bot_username: string;
}

async function getBots(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bots')
    .select('id, bot_username')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bots:', error);
    return [];
  }

  return (data ?? []) as BotRecord[];
}

async function getDigitalWithStock(botId: string): Promise<DigitalMenuWithStock[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select(
      `
      id,
      name,
      price,
      stock_items (
        id,
        content_text,
        is_sold,
        sold_at,
        created_at
      )
    `
    )
    .eq('bot_id', botId)
    .eq('type', 'DIGITAL_DELIVERY')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching digital stock:', error);
    return [];
  }

  return (data ?? []) as DigitalMenuWithStock[];
}

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ bot?: string | string[] }>;
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
  const selectedBotId = Array.isArray(params.bot) ? params.bot[0] : params.bot;
  const selectedBot = bots.find((b) => b.id === selectedBotId) ?? bots[0];

  const digitalItems = await getDigitalWithStock(selectedBot.id);
  const planSnapshot = await getPlanEnforcementSnapshot(user.id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Stock</h1>
        <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          One text line = one unit. Choose a product on the left (or from the list on your phone), then add codes or
          delivery text. Oldest unsold line is used first when you approve an order.
        </p>
        <p className="text-xs text-zinc-500">@{selectedBot.bot_username}</p>
      </div>

      {planSnapshot.plan === 'free' ? <FreePlanUpgradeBanner /> : null}
      {!planSnapshot.canUseStockManagement && planSnapshot.plan !== 'free' ? (
        <p className="max-w-xl text-sm text-amber-800 dark:text-amber-200/90">
          Stock management is turned off for your account. Contact support if this is unexpected.
        </p>
      ) : null}

      <StockManager
        botId={selectedBot.id}
        initialItems={digitalItems}
        canManageStock={planSnapshot.canUseStockManagement}
      />
    </div>
  );
}
