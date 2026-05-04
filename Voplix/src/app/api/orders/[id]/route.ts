import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { roundMoney } from '@/lib/order-revenue';

type OrderWithBot = {
  id: string;
  status: string;
  bots: { user_id: string };
};

async function clearStockRefsForOrders(orderIds: string[]) {
  if (orderIds.length === 0) return;
  await (supabaseAdmin as any).from('stock_items').update({ order_id: null }).in('order_id', orderIds);
}

/** Owner removes order from history only (soft delete). Row kept for revenue accuracy. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: raw, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, status, deleted_at, bots(user_id)')
      .eq('id', id)
      .single();

    const order = raw as (OrderWithBot & { deleted_at: string | null; status: string }) | null;

    if (fetchError || !order || order.bots.user_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'PENDING_PAYMENT' || order.status === 'SLIP_SUBMITTED') {
      return NextResponse.json(
        {
          error:
            'This order is still in progress (waiting for payment or slip). Remove it from the list only after you reject the slip or the buyer finishes payment — use Reject instead of delete for slips.',
        },
        { status: 409 }
      );
    }

    if (order.deleted_at) {
      return NextResponse.json({ success: true });
    }

    await clearStockRefsForOrders([id]);

    const { error: upError } = await (supabaseAdmin as any)
      .from('orders')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id);

    if (upError) {
      return NextResponse.json({ error: upError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/orders/[id]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Adjust recorded revenue for a completed / approved order (owner only). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const rawAmt = body.revenue_amount;
    if (typeof rawAmt !== 'number' && typeof rawAmt !== 'string') {
      return NextResponse.json({ error: 'revenue_amount is required' }, { status: 400 });
    }
    const n = Number(rawAmt);
    if (!Number.isFinite(n) || n < 0 || n > 99_999_999.99) {
      return NextResponse.json({ error: 'Invalid revenue amount' }, { status: 400 });
    }
    const revenue_amount = roundMoney(n);

    const { data: raw, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, status, deleted_at, bots(user_id)')
      .eq('id', id)
      .single();

    const order = raw as (OrderWithBot & { deleted_at: string | null }) | null;

    if (fetchError || !order || order.bots.user_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'COMPLETED' && order.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Only completed orders can have revenue edited' }, { status: 400 });
    }

    const { error: upError } = await (supabaseAdmin as any)
      .from('orders')
      .update({
        revenue_amount,
        revenue_manually_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (upError) {
      return NextResponse.json({ error: upError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, revenue_amount });
  } catch (e) {
    console.error('PATCH /api/orders/[id]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
