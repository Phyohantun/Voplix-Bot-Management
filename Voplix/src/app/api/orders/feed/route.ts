import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyOrderStatusFilter, parseOrderStatusFilter } from '@/lib/owner-orders-filter';

const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('bot');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const rawSize = parseInt(searchParams.get('pageSize') || '20', 10) || 20;
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(10, rawSize));
    const filter = parseOrderStatusFilter(searchParams.get('filter'));

    const { data: botRows } = await (supabase as any)
      .from('bots')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const allowedBotIds = ((botRows as { id: string }[]) || []).map((b) => b.id);
    if (allowedBotIds.length === 0) {
      return NextResponse.json({ orders: [], total: 0, page, pageSize });
    }

    const scopedBotId = botId && allowedBotIds.includes(botId) ? botId : null;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let countQuery = (supabase as any)
      .from('orders')
      .select('*, menu_items!inner(name, price), bots!inner(bot_username, user_id)', { count: 'exact', head: true })
      .eq('bots.user_id', user.id);

    let dataQuery = (supabase as any)
      .from('orders')
      .select('*, menu_items!inner(name, price), bots!inner(bot_username, user_id)')
      .eq('bots.user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (scopedBotId) {
      countQuery = countQuery.eq('bot_id', scopedBotId);
      dataQuery = dataQuery.eq('bot_id', scopedBotId);
    }

    countQuery = applyOrderStatusFilter(countQuery, filter);
    dataQuery = applyOrderStatusFilter(dataQuery, filter);

    const { count, error: cErr } = await countQuery;
    const { data, error: dErr } = await dataQuery;

    if (cErr || dErr) {
      console.error('orders feed', cErr || dErr);
      return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
    }

    return NextResponse.json({
      orders: (data as any[]) || [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (e) {
    console.error('GET /api/orders/feed', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
