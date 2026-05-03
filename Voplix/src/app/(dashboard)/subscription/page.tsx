import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPlatformAccountForUser } from '@/lib/platform-account';
import { SubscriptionClient } from '@/components/subscription/subscription-client';
import { getPlanEnforcementSnapshot } from '@/lib/plan-limits';
import { sanitizeOwnerHtml } from '@/lib/sanitize-html';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PLATFORM_SUBSCRIPTION_SLIPS_BUCKET } from '@/lib/platform-subscription-constants';

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

  let bankRaw = '';
  let pending: { id: string; plan_tier: string; created_at: string } | null = null;
  let slipPath: string | null = null;

  const [planSnapshot, settingsRes, pendRes] = await Promise.all([
    getPlanEnforcementSnapshot(user.id),
    (supabase as any)
      .from('platform_subscription_settings')
      .select('bank_instructions_html')
      .eq('id', 'default')
      .maybeSingle(),
    (supabase as any)
      .from('platform_subscription_requests')
      .select('id, plan_tier, created_at, slip_storage_path')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const settings = settingsRes?.data;
  if (settings && typeof settings.bank_instructions_html === 'string') {
    bankRaw = settings.bank_instructions_html;
  }

  const pendRows = pendRes?.data as
    | { id: string; plan_tier: string; created_at: string; slip_storage_path: string }[]
    | null;
  if (pendRows?.[0]) {
    pending = {
      id: pendRows[0].id,
      plan_tier: pendRows[0].plan_tier,
      created_at: pendRows[0].created_at,
    };
    slipPath = pendRows[0].slip_storage_path || null;
  }

  let pendingSlipUrl: string | null = null;
  if (slipPath) {
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(PLATFORM_SUBSCRIPTION_SLIPS_BUCKET)
      .createSignedUrl(slipPath, 3600);
    if (!signErr && signed?.signedUrl) {
      pendingSlipUrl = signed.signedUrl;
    }
  }

  const bankHtml = sanitizeOwnerHtml(bankRaw);
  const supportWhatsappUrl = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_URL || '').trim();

  return (
    <SubscriptionClient
      userEmail={user.email ?? ''}
      currentPlan={plan}
      bankHtml={bankHtml}
      pending={pending}
      pendingSlipUrl={pendingSlipUrl}
      planSnapshot={planSnapshot}
      supportWhatsappUrl={supportWhatsappUrl}
    />
  );
}
