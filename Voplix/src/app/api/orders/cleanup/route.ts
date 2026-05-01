import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const ALLOWED_STATUS = ['COMPLETED', 'REJECTED'] as const;
const MAX_DELETE = 5000;

async function clearStockRefsForOrders(orderIds: string[]) {
  if (orderIds.length === 0) return;
  await (supabaseAdmin as any).from('stock_items').update({ order_id: null }).in('order_id', orderIds);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const botId = typeof body?.bot_id === 'string' ? body.bot_id : null;
    const olderThanDaysRaw = body?.older_than_days;
    const olderThanDays =
      typeof olderThanDaysRaw === 'number' && Number.isFinite(olderThanDaysRaw)
        ? Math.floor(olderThanDaysRaw)
        : parseInt(String(olderThanDaysRaw ?? '90'), 10);

    if (!botId) {
      return NextResponse.json({ error: 'bot_id is required' }, { status: 400 });
    }

    if (olderThanDays < 7 || olderThanDays > 3650) {
      return NextResponse.json({ error: 'older_than_days must be between 7 and 3650' }, { status: 400 });
    }

    const { data: bot, error: botErr } = await (supabaseAdmin as any)
      .from('bots')
      .select('id')
      .eq('id', botId)
      .eq('user_id', user.id)
      .single();

    if (botErr || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - olderThanDays);

    const { data: candidates, error: qErr } = await (supabaseAdmin as any)
      .from('orders')
      .select('id')
      .eq('bot_id', botId)
      .in('status', [...ALLOWED_STATUS])
      .lt('created_at', cutoff.toISOString())
      .limit(MAX_DELETE);

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }

    const ids = (candidates || []).map((r: { id: string }) => r.id);

    if (ids.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    await clearStockRefsForOrders(ids);

    const { error: delError } = await (supabaseAdmin as any).from('orders').delete().in('id', ids);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: ids.length,
      truncated: ids.length >= MAX_DELETE,
    });
  } catch (e) {
    console.error('POST /api/orders/cleanup', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
