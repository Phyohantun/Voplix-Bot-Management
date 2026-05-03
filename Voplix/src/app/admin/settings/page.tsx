import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSettingsClient } from '@/components/admin/admin-settings-client';
import { getPlatformSubscriptionSettingsAdmin } from '@/lib/platform-subscription-settings-load';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PLATFORM_SUBSCRIPTION_SLIPS_BUCKET } from '@/lib/platform-subscription-constants';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const s = await getPlatformSubscriptionSettingsAdmin();
  let promptpayUrl: string | null = null;
  if (s.promptpay_qr_storage_path?.trim()) {
    const { data: signed } = await supabaseAdmin.storage
      .from(PLATFORM_SUBSCRIPTION_SLIPS_BUCKET)
      .createSignedUrl(s.promptpay_qr_storage_path.trim(), 900);
    promptpayUrl = signed?.signedUrl ?? null;
  }

  return (
    <>
      <AdminHeader title="Platform settings" />
      <AdminSettingsClient initialSettings={s} initialPromptpayUrl={promptpayUrl} />
    </>
  );
}
