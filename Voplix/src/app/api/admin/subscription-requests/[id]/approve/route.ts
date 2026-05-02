import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const { data: reqRow, error: fetchErr } = await (supabaseAdmin.from('platform_subscription_requests') as any)
      .select('*')
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

    const userId = reqRow.user_id as string;
    const planTier = reqRow.plan_tier as string;
    if (planTier !== 'pro' && planTier !== 'plus') {
      return NextResponse.json({ error: 'Invalid plan on request' }, { status: 400 });
    }

    const { data: existing, error: exErr } = await (supabaseAdmin.from('platform_accounts') as any)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json({ error: exErr.message }, { status: 500 });
    }

    const ex = (existing ?? {}) as Record<string, unknown>;
    const accountRow = {
      user_id: userId,
      account_status: 'active',
      plan_tier: planTier,
      can_use_broadcast: planTier === 'plus',
      can_use_stock: ex.can_use_stock !== false,
      can_use_orders: ex.can_use_orders !== false,
      admin_notes: (ex.admin_notes as string | null) ?? null,
    };

    const { error: upAccErr } = await (supabaseAdmin.from('platform_accounts') as any).upsert(accountRow, {
      onConflict: 'user_id',
    });
    if (upAccErr) {
      return NextResponse.json({ error: upAccErr.message }, { status: 500 });
    }

    const { error: upReqErr } = await (supabaseAdmin.from('platform_subscription_requests') as any)
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (upReqErr) {
      return NextResponse.json({ error: upReqErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[POST approve subscription]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
