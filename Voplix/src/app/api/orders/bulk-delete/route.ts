import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const MAX_IDS = 200;

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
    const ids = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }

    if (ids.length > MAX_IDS) {
      return NextResponse.json({ error: `At most ${MAX_IDS} orders per request` }, { status: 400 });
    }

    const uniqueIds = [...new Set(ids.filter((x: unknown) => typeof x === 'string'))] as string[];

    if (uniqueIds.length === 0) {
      return NextResponse.json({ error: 'No valid order ids' }, { status: 400 });
    }

    const { data: rows, error: selError } = await (supabaseAdmin as any)
      .from('orders')
      .select('id, status, deleted_at, bots!inner(user_id)')
      .in('id', uniqueIds);

    if (selError) {
      return NextResponse.json({ error: selError.message }, { status: 500 });
    }

    type Row = { id: string; status: string; deleted_at: string | null; bots: { user_id: string } };
    const owned = ((rows || []) as Row[]).filter((r) => r.bots.user_id === user.id);

    if (owned.length === 0) {
      return NextResponse.json({ error: 'No matching orders' }, { status: 404 });
    }

    const pending = new Set(['PENDING_PAYMENT', 'SLIP_SUBMITTED']);
    const deletableIds = owned
      .filter((r) => !pending.has(r.status) && !r.deleted_at)
      .map((r) => r.id);

    const skipped_pending = owned.filter((r) => pending.has(r.status)).length;

    if (deletableIds.length === 0) {
      return NextResponse.json(
        {
          error:
            'No orders can be hidden: selected row(s) are still waiting for payment or slip review. Use Reject for slips, or wait until the order is no longer in progress.',
          skipped_pending,
        },
        { status: 409 }
      );
    }

    await clearStockRefsForOrders(deletableIds);

    const { error: delError } = await (supabaseAdmin as any)
      .from('orders')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .in('id', deletableIds)
      .is('deleted_at', null);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: deletableIds.length,
      skipped_pending,
    });
  } catch (e) {
    console.error('POST /api/orders/bulk-delete', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
