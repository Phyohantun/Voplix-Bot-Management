import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { enrichSubscriptionRequestsWithAccountSnapshots } from '@/lib/admin-subscription-requests-enrich';

export async function GET() {
  try {
    const { data, error } = await (supabaseAdmin.from('platform_subscription_requests') as any)
      .select('id, user_id, requester_email, plan_tier, slip_storage_path, status, admin_notes, reviewed_at, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const raw = data ?? [];
    const requests = await enrichSubscriptionRequestsWithAccountSnapshots(raw);

    return NextResponse.json({ requests });
  } catch (e) {
    console.error('[GET /api/admin/subscription-requests]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
