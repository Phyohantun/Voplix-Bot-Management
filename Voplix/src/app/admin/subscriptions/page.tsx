import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSubscriptionsClient, type SubscriptionRequestRow } from '@/components/admin/admin-subscriptions-client';
import { supabaseAdmin } from '@/lib/supabase/admin';

export default async function AdminSubscriptionsPage() {
  let bankHtml = '';
  let requests: SubscriptionRequestRow[] = [];
  let loadError: string | null = null;

  try {
    const { data: settings, error: sErr } = await (supabaseAdmin.from('platform_subscription_settings') as any)
      .select('bank_instructions_html')
      .eq('id', 'default')
      .maybeSingle();
    if (sErr) {
      loadError = sErr.message;
    } else {
      bankHtml = (settings?.bank_instructions_html as string) ?? '';
    }

    const { data: reqData, error: rErr } = await (supabaseAdmin.from('platform_subscription_requests') as any)
      .select('id, user_id, requester_email, plan_tier, slip_storage_path, status, admin_notes, reviewed_at, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (rErr) {
      loadError = loadError ? `${loadError}; ${rErr.message}` : rErr.message;
    } else {
      requests = (reqData as SubscriptionRequestRow[]) ?? [];
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Failed to load';
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
      {loadError ? (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
            {loadError} — Run migration <code className="text-xs">011_platform_subscription_slips.sql</code> and create
            the Storage bucket <code className="text-xs">platform-subscription-slips</code> (private).
          </p>
        </div>
      ) : (
        <AdminSubscriptionsClient initialBankHtml={bankHtml} initialRequests={requests} />
      )}
    </>
  );
}
