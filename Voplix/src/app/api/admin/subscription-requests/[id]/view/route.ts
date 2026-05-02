import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PLATFORM_SUBSCRIPTION_SLIPS_BUCKET } from '@/lib/platform-subscription-constants';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const { data: row, error } = await (supabaseAdmin.from('platform_subscription_requests') as any)
      .select('slip_storage_path')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!row?.slip_storage_path) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const path = row.slip_storage_path as string;
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(PLATFORM_SUBSCRIPTION_SLIPS_BUCKET)
      .createSignedUrl(path, 120);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: signErr?.message || 'Could not sign URL' }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (e) {
    console.error('[GET /api/admin/subscription-requests/[id]/view]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
