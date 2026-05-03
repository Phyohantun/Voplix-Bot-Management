import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MenuBuilder } from '@/components/menu/menu-builder';
import { paymentInstructionsFromBotRow } from '@/lib/bot-telegram-copy';
import { getPlanEnforcementSnapshot } from '@/lib/plan-limits';
import { FreePlanUpgradeBanner } from '@/components/dashboard/free-plan-banner';

interface BotRecord {
  id: string;
  bot_username: string;
  start_welcome_message: string | null;
  start_show_menu_only: boolean;
  start_show_tip: boolean;
  payment_instructions: string | null;
  telegram_customer_copy: unknown;
}

interface SupabaseQueryError {
  code?: string;
}

interface StockRow {
  id: string;
  is_sold: boolean;
}

interface MenuItemRecord {
  id: string;
  name: string;
  price: number;
  type: 'DIGITAL_DELIVERY' | 'MANUAL_DELIVERY';
  delivery_content: string | null;
  is_active: boolean | null;
  stock_items?: StockRow[] | StockRow | null;
}

import { PageHeader } from '@/components/dashboard/page-header';

async function getBots(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bots')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    const typedError = error as SupabaseQueryError;

    if (typedError.code === 'PGRST205') {
      return [];
    }

    console.error('Error fetching bots:', error);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const pi = paymentInstructionsFromBotRow({
      payment_instructions: r.payment_instructions as string | null | undefined,
      telegram_customer_copy: r.telegram_customer_copy,
    });
    return {
      id: r.id as string,
      bot_username: r.bot_username as string,
      start_welcome_message: (r.start_welcome_message as string | null) ?? null,
      start_show_menu_only: Boolean(r.start_show_menu_only),
      start_show_tip: Boolean(r.start_show_tip),
      payment_instructions: pi || null,
      telegram_customer_copy: r.telegram_customer_copy,
    };
  });
}

function normalizeStockRows(raw: MenuItemRecord['stock_items']): StockRow[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

async function getMenuItems(botId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, price, type, delivery_content, is_active, stock_items ( id, is_sold )')
    .eq('bot_id', botId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching menu items:', error);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as MenuItemRecord;
    const stocks = normalizeStockRows(r.stock_items);
    const unsold_stock_count = stocks.filter((s) => !s.is_sold).length;
    return {
      id: r.id,
      name: r.name,
      price: r.price,
      type: r.type,
      delivery_content: r.delivery_content,
      is_active: r.is_active !== false,
      unsold_stock_count,
    };
  });
}

export default async function MenuPage({
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
  const selectedBot = bots.find((bot) => bot.id === selectedBotId) ?? bots[0];

  const menuItems = await getMenuItems(selectedBot.id);
  const planSnapshot = await getPlanEnforcementSnapshot(user.id);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Bot menu" 
        description={
          <>
            Products here are sent to Telegram when someone sends <code className="text-zinc-700 dark:text-zinc-300">/start</code> or taps
            &quot;Browse menu&quot;.
          </>
        } 
      />

      {planSnapshot.plan === 'free' ? <FreePlanUpgradeBanner /> : null}

      <MenuBuilder bots={bots} selectedBot={selectedBot} menuItems={menuItems} planSnapshot={planSnapshot} />
    </div>
  );
}
