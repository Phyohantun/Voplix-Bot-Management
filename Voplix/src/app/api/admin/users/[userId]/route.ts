import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPlatformAdminEmail } from '@/lib/admin-auth';

const STATUSES = new Set(['pending', 'active', 'suspended']);
const PLANS = new Set(['free', 'pro', 'plus']);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const { data: existing, error: fetchErr } = await (supabaseAdmin.from('platform_accounts') as any)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const ex = (existing ?? null) as Record<string, unknown> | null;

    let account_status = (ex?.account_status as string) ?? 'active';
    if (typeof body.account_status === 'string') {
      if (!STATUSES.has(body.account_status)) {
        return NextResponse.json({ error: 'Invalid account_status' }, { status: 400 });
      }
      account_status = body.account_status;
    }

    let plan_tier = (ex?.plan_tier as string) ?? 'free';
    if (typeof body.plan_tier === 'string') {
      if (!PLANS.has(body.plan_tier)) {
        return NextResponse.json({ error: 'Invalid plan_tier' }, { status: 400 });
      }
      plan_tier = body.plan_tier;
    }

    let can_use_broadcast = ex?.can_use_broadcast !== false;
    if (typeof body.can_use_broadcast === 'boolean') {
      can_use_broadcast = body.can_use_broadcast;
    }

    let can_use_stock = ex?.can_use_stock !== false;
    if (typeof body.can_use_stock === 'boolean') {
      can_use_stock = body.can_use_stock;
    }

    let can_use_orders = ex?.can_use_orders !== false;
    if (typeof body.can_use_orders === 'boolean') {
      can_use_orders = body.can_use_orders;
    }

    let admin_notes: string | null = (ex?.admin_notes as string | null) ?? null;
    if (body.admin_notes === null) {
      admin_notes = null;
    } else if (typeof body.admin_notes === 'string') {
      admin_notes = body.admin_notes.trim() || null;
    }

    let subscription_period_end: string | null =
      typeof ex?.subscription_period_end === 'string' && (ex.subscription_period_end as string).trim()
        ? (ex.subscription_period_end as string)
        : null;

    if (body.cancel_paid_subscription === true) {
      plan_tier = 'free';
      can_use_broadcast = false;
      subscription_period_end = null;
    }

    const extendDays =
      typeof body.extend_subscription_days === 'number' && Number.isFinite(body.extend_subscription_days)
        ? Math.floor(body.extend_subscription_days)
        : 0;
    if (extendDays > 0) {
      const base =
        subscription_period_end && new Date(subscription_period_end) > new Date()
          ? new Date(subscription_period_end)
          : new Date();
      subscription_period_end = new Date(base.getTime() + extendDays * 86400000).toISOString();
    }

    if (plan_tier === 'free' && extendDays <= 0 && body.cancel_paid_subscription !== true) {
      subscription_period_end = null;
    }

    if (extendDays > 0 && plan_tier === 'free') {
      return NextResponse.json(
        { error: 'Account is on Free — set Pro/Plus first or use slip approval to extend paid access.' },
        { status: 400 }
      );
    }

    const row = {
      user_id: userId,
      account_status,
      plan_tier,
      subscription_period_end,
      can_use_broadcast,
      can_use_stock,
      can_use_orders,
      admin_notes,
    };

    const { error: upsertErr } = await (supabaseAdmin.from('platform_accounts') as any).upsert(row, {
      onConflict: 'user_id',
    });

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, account: { ...row, plan_tier, account_status } });
  } catch (e) {
    console.error('[PATCH /api/admin/users/[userId]]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const { data: authData, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getErr) {
      return NextResponse.json({ error: getErr.message }, { status: 400 });
    }
    if (!authData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    try {
      const adminEmail = getPlatformAdminEmail();
      const target = authData.user.email?.trim().toLowerCase();
      if (target && target === adminEmail) {
        return NextResponse.json(
          { error: 'Cannot delete the account whose email matches PLATFORM_ADMIN_EMAIL.' },
          { status: 400 }
        );
      }
    } catch {
      // PLATFORM_ADMIN_EMAIL not set — skip safeguard
    }

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[DELETE /api/admin/users/[userId]]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
