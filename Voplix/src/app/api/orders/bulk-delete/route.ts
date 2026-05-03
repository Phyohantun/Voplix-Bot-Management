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
      .select('id, bots!inner(user_id)')
      .in('id', uniqueIds);

    if (selError) {
      return NextResponse.json({ error: selError.message }, { status: 500 });
    }

    const ownedIds = (rows || [])
      .filter((r: { bots: { user_id: string } }) => r.bots.user_id === user.id)
      .map((r: { id: string }) => r.id);

    if (ownedIds.length === 0) {
      return NextResponse.json({ error: 'No matching orders' }, { status: 404 });
    }

    await clearStockRefsForOrders(ownedIds);

    const { error: delError } = await (supabaseAdmin as any)
      .from('orders')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .in('id', ownedIds)
      .is('deleted_at', null);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: ownedIds.length });
  } catch (e) {
    console.error('POST /api/orders/bulk-delete', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
