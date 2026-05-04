import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BroadcastClient } from '@/components/broadcast/broadcast-client';
import { AutoRefresh } from '@/components/dashboard/auto-refresh';
import { getPlanEnforcementSnapshot } from '@/lib/plan-limits';

async function getBots(userId: string) {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('bots')
    .select('id, bot_username')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return (data as Array<{ id: string; bot_username: string }>) || [];
}

export default async function BroadcastPage({
  searchParams,
}: {
  searchParams: Promise<{ bot?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const bots = await getBots(user.id);
  const params = await searchParams;
  const selectedBotId = params.bot && bots.some((b) => b.id === params.bot) ? params.bot : null;
  const planSnapshot = await getPlanEnforcementSnapshot(user.id);

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30000} />
      <BroadcastClient
        bots={bots}
        initialBotId={selectedBotId}
        canUseBroadcast={planSnapshot.canUseBroadcast}
        plan={planSnapshot.plan}
        broadcastsThisMonth={planSnapshot.broadcastsThisMonth}
        maxBroadcastsPerMonth={planSnapshot.maxBroadcastsPerMonth}
      />
    </div>
  );
}
