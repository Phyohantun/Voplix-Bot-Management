import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { getPlanEnforcementSnapshot } from '@/lib/plan-limits';
import { fetchBotCardStatsMap } from '@/lib/bots-page-stats';
import { BotShopCard } from '@/components/bots/bot-shop-card';
import { shopCurrencyFromUser } from '@/lib/currency';
import { Noto_Sans_Myanmar } from 'next/font/google';

const notoMm = Noto_Sans_Myanmar({
  subsets: ['myanmar', 'latin'],
  weight: ['600'],
  display: 'swap',
});

interface BotRecord {
  id: string;
  bot_username: string;
  created_at: string;
  is_active: boolean;
  webhook_set: boolean;
}

interface SupabaseQueryError {
  code?: string;
}

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

  return (data ?? []) as BotRecord[];
}

export default async function BotsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const bots = await getBots(user.id);
  const planSnapshot = await getPlanEnforcementSnapshot(user.id);
  const statsMap = await fetchBotCardStatsMap(supabase, bots.map((b) => b.id));
  const currency = shopCurrencyFromUser(user);

  const addButtonClass =
    'w-full rounded-xl bg-zinc-100 px-4 py-2.5 font-medium text-zinc-900 hover:bg-white sm:w-auto dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700';

  const addBotButton = planSnapshot.canAddBot ? (
    <Link href="/onboarding">
      <Button className={addButtonClass}>
        <Plus className="mr-2 h-4 w-4" weight="bold" />
        Add bot
      </Button>
    </Link>
  ) : (
    <Button className={addButtonClass} disabled title="Bot limit reached for your plan">
      <Plus className="mr-2 h-4 w-4" weight="bold" />
      Add bot
    </Button>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Bots</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Telegram shops linked to your account.</p>
        </div>
        {addBotButton}
      </div>

      {!planSnapshot.canAddBot ? (
        <div
          className={`flex flex-col gap-3 rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700 dark:bg-zinc-800/80 ${notoMm.className}`}
        >
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            သင့် plan တွင် {planSnapshot.activeBots}/{planSnapshot.maxBots} bots ပြည့်နေပြီ — Plus plan သို့ upgrade လုပ်ပါ
          </p>
          <Link
            href="/subscription"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Upgrade plan
          </Link>
        </div>
      ) : null}

      {bots.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="aspect-video w-full bg-gradient-to-br from-indigo-500/15 via-zinc-100 to-zinc-300/30 dark:from-indigo-500/10 dark:via-zinc-900 dark:to-zinc-800/40">
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">See your shop in Telegram</p>
              <p className="max-w-md text-xs text-zinc-500 dark:text-zinc-500">
                Short demo clip can be added here later (GIF / video). Connect a bot to receive /start, menu, orders, and slips in chat.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center px-6 py-12">
            <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-white">No bots yet</h3>
            <p className="mb-6 max-w-sm text-center text-sm text-zinc-500 dark:text-zinc-400">
              Connect a Telegram bot to sell through chat and manage orders here.
            </p>
            {planSnapshot.canAddBot ? (
              <Link href="/onboarding">
                <Button className={addButtonClass}>
                  <Plus className="mr-2 h-4 w-4" weight="bold" />
                  Connect a bot
                </Button>
              </Link>
            ) : (
              <Button className={addButtonClass} disabled>
                <Plus className="mr-2 h-4 w-4" weight="bold" />
                Bot limit reached
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot) => (
            <BotShopCard key={bot.id} bot={bot} stats={statsMap[bot.id] ?? { orderCount: 0, revenueCompleted: 0, lastOrderAt: null }} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}
