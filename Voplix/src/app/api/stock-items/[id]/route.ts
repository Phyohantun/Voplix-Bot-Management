import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkStockItemAllowed } from '@/lib/plan-limits';

type StockRow = {
  id: string;
  menu_item_id: string;
  is_sold: boolean;
  menu_items: { bots: { user_id: string } };
};

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

    const stockGate = await checkStockItemAllowed(user.id);
    if (!stockGate.ok) {
      return NextResponse.json({ error: stockGate.message }, { status: 403 });
    }

    const { data: raw, error: fetchErr } = await supabaseAdmin
      .from('stock_items')
      .select('id, menu_item_id, is_sold, menu_items(bots(user_id))')
      .eq('id', id)
      .single();

    const row = raw as StockRow | null;

    if (fetchErr || !row || row.menu_items.bots.user_id !== user.id) {
      return NextResponse.json({ error: 'Stock line not found' }, { status: 404 });
    }

    if (row.is_sold) {
      return NextResponse.json({ error: 'Cannot delete sold stock lines' }, { status: 400 });
    }

    const { error } = await (supabaseAdmin as any).from('stock_items').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/stock-items/[id]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
