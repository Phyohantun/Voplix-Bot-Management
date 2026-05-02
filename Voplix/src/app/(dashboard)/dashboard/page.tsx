import { createClient } from '@/lib/supabase/server';
import { fetchDashboardPageModel } from '@/lib/dashboard-data';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { shopCurrencyFromUser } from '@/lib/currency';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bot?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: bots } = await (supabase as any)
    .from('bots')
    .select('id, bot_username')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const botList = (bots as { id: string; bot_username: string }[]) || [];
  const selectedBotId = params.bot && botList.some((b) => b.id === params.bot) ? params.bot : null;

  const model = await fetchDashboardPageModel(supabase, user.id, selectedBotId);
  const currency = shopCurrencyFromUser(user);

  const loadedAtIso = new Date().toISOString();

  return (
    <DashboardView
      key={loadedAtIso}
      currency={currency}
      selectedBotId={selectedBotId}
      loadedAtIso={loadedAtIso}
      initial={model}
    />
  );
}
