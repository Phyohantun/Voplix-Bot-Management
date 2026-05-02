import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as { admin_notes?: unknown };
    const notes = typeof body.admin_notes === 'string' ? body.admin_notes.trim() || null : null;

    const { data: reqRow, error: fetchErr } = await (supabaseAdmin.from('platform_subscription_requests') as any)
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!reqRow) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    if (reqRow.status !== 'pending') {
      return NextResponse.json({ error: 'Request is not pending' }, { status: 400 });
    }

    const { error } = await (supabaseAdmin.from('platform_subscription_requests') as any)
      .update({
        status: 'rejected',
        admin_notes: notes,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[POST reject subscription]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
