import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPlatformAccountForUser } from '@/lib/platform-account';
import { SubscriptionClient } from '@/components/subscription/subscription-client';
import { getPlanEnforcementSnapshot } from '@/lib/plan-limits';
import { sanitizeOwnerHtml } from '@/lib/sanitize-html';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PLATFORM_SUBSCRIPTION_SLIPS_BUCKET } from '@/lib/platform-subscription-constants';
import { getPlatformSubscriptionSettingsAdmin } from '@/lib/platform-subscription-settings-load';

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
  const subscriptionPeriodEnd = acct?.subscription_period_end ?? null;
  const subscriptionCurrentPeriodStart = acct?.subscription_current_period_start ?? null;

  let bankRaw = '';
  let pending: { id: string; plan_tier: string; created_at: string } | null = null;
  let slipPath: string | null = null;
  let lastRejection: { plan_tier: string; admin_notes: string | null; reviewed_at: string | null } | null = null;

  const [planSnapshot, settings, pendRes, rejectRes] = await Promise.all([
    getPlanEnforcementSnapshot(user.id),
    getPlatformSubscriptionSettingsAdmin(),
    (supabase as any)
      .from('platform_subscription_requests')
      .select('id, plan_tier, created_at, slip_storage_path')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1),
    (supabase as any)
      .from('platform_subscription_requests')
      .select('plan_tier, admin_notes, reviewed_at')
      .eq('user_id', user.id)
      .eq('status', 'rejected')
      .order('reviewed_at', { ascending: false })
      .limit(1),
  ]);

  bankRaw = settings.bank_instructions_html;
  const priceProMmk = settings.price_pro_mmk_month;
  const pricePlusMmk = settings.price_plus_mmk_month;

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

  const rejRows = rejectRes?.data as
    | { plan_tier: string; admin_notes: string | null; reviewed_at: string | null }[]
    | null;
  if (rejRows?.[0]) {
    lastRejection = {
      plan_tier: rejRows[0].plan_tier,
      admin_notes: rejRows[0].admin_notes,
      reviewed_at: rejRows[0].reviewed_at,
    };
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

  let promptpayUrl: string | null = null;
  const ppPath = settings.promptpay_qr_storage_path?.trim();
  if (ppPath) {
    const { data: signedPp } = await supabaseAdmin.storage
      .from(PLATFORM_SUBSCRIPTION_SLIPS_BUCKET)
      .createSignedUrl(ppPath, 3600);
    promptpayUrl = signedPp?.signedUrl ?? null;
  }

  const bankHtml = sanitizeOwnerHtml(bankRaw);
  const supportWhatsappUrl = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_URL || '').trim();
  const multiMonthTelegramUser = (
    process.env.NEXT_PUBLIC_SUBSCRIPTION_MULTI_MONTH_TELEGRAM || 'ismecy'
  )
    .trim()
    .replace(/^@/, '') || 'ismecy';

  return (
    <SubscriptionClient
      userEmail={user.email ?? ''}
      currentPlan={plan}
      subscriptionPeriodEnd={subscriptionPeriodEnd}
      subscriptionCurrentPeriodStart={subscriptionCurrentPeriodStart}
      bankHtml={bankHtml}
      pending={pending}
      pendingSlipUrl={pendingSlipUrl}
      planSnapshot={planSnapshot}
      supportWhatsappUrl={supportWhatsappUrl}
      priceProMmk={priceProMmk}
      pricePlusMmk={pricePlusMmk}
      promptpayUrl={promptpayUrl}
      lastRejection={lastRejection}
      multiMonthTelegramUser={multiMonthTelegramUser}
    />
  );
}
