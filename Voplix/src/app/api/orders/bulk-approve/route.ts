import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { approveSlipOrderForOwner } from '@/lib/order-approve';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }

    const { data: rows, error } = await (supabaseAdmin as any)
      .from('orders')
      .select('id, status, menu_items!inner(type), bots!inner(user_id)')
      .in('id', ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    type Row = {
      id: string;
      status: string;
      menu_items: { type: string };
      bots: { user_id: string };
    };
    const owned = ((rows as Row[]) || []).filter((r) => r.bots?.user_id === user.id);

    let approved = 0;
    const failures: string[] = [];

    for (const row of owned) {
      if (row.status !== 'SLIP_SUBMITTED') {
        failures.push(`${row.id.slice(0, 8)}: not awaiting slip approval`);
        continue;
      }
      if (row.menu_items?.type === 'MANUAL_DELIVERY') {
        failures.push(
          `${row.id.slice(0, 8)}: manual product — open the order and approve one by one so you can type what to send the buyer`
        );
        continue;
      }
      const r = await approveSlipOrderForOwner(row.id, user.id, { manual_delivery_data: null });
      if (r.ok) approved++;
      else failures.push(`${row.id.slice(0, 8)}: ${r.error}`);
    }

    return NextResponse.json({ approved, attempted: owned.length, failures });
  } catch (e) {
    console.error('bulk-approve', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
