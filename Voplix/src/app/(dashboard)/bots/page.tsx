import { createClient } from '@/lib/supabase/server';
import { getPlanEnforcementSnapshot } from '@/lib/plan-limits';
import { fetchBotCardStatsMap } from '@/lib/bots-page-stats';
import { shopCurrencyFromUser } from '@/lib/currency';
import { BotsClient } from '@/components/bots/bots-client';

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

  return <BotsClient bots={bots} planSnapshot={planSnapshot} statsMap={statsMap} currency={currency} />;
}
