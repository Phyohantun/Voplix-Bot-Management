import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

type OrderWithBot = {
  id: string;
  bots: { user_id: string };
};

async function clearStockRefsForOrders(orderIds: string[]) {
  if (orderIds.length === 0) return;
  await (supabaseAdmin as any).from('stock_items').update({ order_id: null }).in('order_id', orderIds);
}

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
      .select('id, bots(user_id)')
      .eq('id', id)
      .single();

    const order = raw as OrderWithBot | null;

    if (fetchError || !order || order.bots.user_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    await clearStockRefsForOrders([id]);

    const { error: delError } = await (supabaseAdmin as any).from('orders').delete().eq('id', id);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/orders/[id]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
