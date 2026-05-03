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
    const botId = typeof body?.bot_id === 'string' && body.bot_id ? body.bot_id : null;

    const { data: botRows, error: botErr } = await (supabaseAdmin as any)
      .from('bots')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (botErr) {
      return NextResponse.json({ error: botErr.message }, { status: 500 });
    }

    const botIds = ((botRows as { id: string }[]) || []).map((b) => b.id);
    if (botIds.length === 0) {
      return NextResponse.json({ approved: 0, attempted: 0, failures: [] as string[] });
    }

    let scopedIds = botId && botIds.includes(botId) ? [botId] : botIds;

    const { data: rows, error } = await (supabaseAdmin as any)
      .from('orders')
      .select('id, menu_items!inner(type)')
      .eq('status', 'SLIP_SUBMITTED')
      .in('bot_id', scopedIds)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    type Row = { id: string; menu_items: { type: string } };
    const list = (rows as Row[]) || [];
    let approved = 0;
    const failures: string[] = [];

    for (const row of list) {
      if (row.menu_items?.type === 'MANUAL_DELIVERY') {
        failures.push(
          `${row.id.slice(0, 8)}: manual product — open Orders, add the customer message, then approve one by one`
        );
        continue;
      }
      const r = await approveSlipOrderForOwner(row.id, user.id, {});
      if (r.ok) approved++;
      else failures.push(`${row.id.slice(0, 8)}: ${r.error}`);
    }

    return NextResponse.json({ approved, attempted: list.length, failures });
  } catch (e) {
    console.error('bulk-approve-pending', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
