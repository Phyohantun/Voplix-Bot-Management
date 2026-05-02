import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSubscriptionsClient, type SubscriptionRequestRow } from '@/components/admin/admin-subscriptions-client';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminSubscriptionsPage() {
  let bankHtml = '';
  let requests: SubscriptionRequestRow[] = [];
  const loadWarnings: string[] = [];

  try {
    const { data: settings, error: sErr } = await (supabaseAdmin.from('platform_subscription_settings') as any)
      .select('bank_instructions_html')
      .eq('id', 'default')
      .maybeSingle();
    if (sErr) {
      loadWarnings.push(`Bank settings: ${sErr.message}`);
    } else {
      bankHtml = (settings?.bank_instructions_html as string) ?? '';
    }

    const { data: reqData, error: rErr } = await (supabaseAdmin.from('platform_subscription_requests') as any)
      .select('id, user_id, requester_email, plan_tier, slip_storage_path, status, admin_notes, reviewed_at, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (rErr) {
      loadWarnings.push(`Subscription requests: ${rErr.message}`);
    } else {
      requests = (reqData as SubscriptionRequestRow[]) ?? [];
    }
  } catch (e) {
    loadWarnings.push(e instanceof Error ? e.message : 'Failed to load');
  }

  return (
    <>
      <AdminHeader
        title="Subscriptions"
        nav={[
          { href: '/admin', label: 'Customers' },
          { href: '/admin/subscriptions', label: 'Subscriptions & bank' },
        ]}
      />
      <AdminSubscriptionsClient
        initialBankHtml={bankHtml}
        initialRequests={requests}
        loadWarnings={loadWarnings}
      />
    </>
  );
}
