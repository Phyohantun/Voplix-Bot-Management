import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSubscriptionsClient, type SubscriptionRequestRow } from '@/components/admin/admin-subscriptions-client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { listAllUsersWithPlatformAccounts } from '@/lib/admin-users-list';
import { enrichSubscriptionRequestsWithAccountSnapshots } from '@/lib/admin-subscription-requests-enrich';

export const dynamic = 'force-dynamic';

export default async function AdminSubscriptionsPage() {
  let requests: SubscriptionRequestRow[] = [];
  const loadWarnings: string[] = [];
  let allUsers: Awaited<ReturnType<typeof listAllUsersWithPlatformAccounts>> = [];

  try {
    allUsers = await listAllUsersWithPlatformAccounts();
  } catch (e) {
    loadWarnings.push(e instanceof Error ? e.message : 'Failed to load users');
  }

  try {
    const { data: reqData, error: rErr } = await (supabaseAdmin.from('platform_subscription_requests') as any)
      .select('id, user_id, requester_email, plan_tier, slip_storage_path, status, admin_notes, reviewed_at, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (rErr) {
      loadWarnings.push(`Subscription requests: ${rErr.message}`);
    } else {
      const raw = (reqData as Omit<SubscriptionRequestRow, 'account_snapshot'>[]) ?? [];
      requests = await enrichSubscriptionRequestsWithAccountSnapshots(raw);
    }
  } catch (e) {
    loadWarnings.push(e instanceof Error ? e.message : 'Failed to load requests');
  }

  return (
    <>
      <AdminHeader title="Subscriptions" />
      <AdminSubscriptionsClient
        initialRequests={requests}
        initialPaidUsers={allUsers}
        loadWarnings={loadWarnings}
      />
    </>
  );
}
