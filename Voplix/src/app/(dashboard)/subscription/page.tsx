import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPlatformAccountForUser } from '@/lib/platform-account';
import { SubscriptionClient } from '@/components/subscription/subscription-client';

export const dynamic = 'force-dynamic';

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/subscription');
  }

  const acct = await getPlatformAccountForUser(user.id);
  const plan = acct?.plan_tier ?? 'free';

  let bankHtml = '';
  let pending: { id: string; plan_tier: string; created_at: string } | null = null;

  const { data: settings } = await (supabase as any)
    .from('platform_subscription_settings')
    .select('bank_instructions_html')
    .eq('id', 'default')
    .maybeSingle();

  if (settings && typeof settings.bank_instructions_html === 'string') {
    bankHtml = settings.bank_instructions_html;
  }

  const { data: pendRows } = await (supabase as any)
    .from('platform_subscription_requests')
    .select('id, plan_tier, created_at')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1);

  if (pendRows?.[0]) {
    pending = pendRows[0] as { id: string; plan_tier: string; created_at: string };
  }

  return (
    <SubscriptionClient
      userEmail={user.email ?? ''}
      currentPlan={plan}
      bankHtml={bankHtml}
      pending={pending}
    />
  );
}
