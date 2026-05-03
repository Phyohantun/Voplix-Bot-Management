import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkStockItemAllowed } from '@/lib/plan-limits';

type MenuRow = {
  id: string;
  bot_id: string;
  type: string;
  bots: { user_id: string };
};

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
    const botId = searchParams.get('bot_id');

    if (!botId) {
      return NextResponse.json({ error: 'bot_id is required' }, { status: 400 });
    }

    const { data: bot } = await (supabaseAdmin as any)
      .from('bots')
      .select('id')
      .eq('id', botId)
      .eq('user_id', user.id)
      .single();

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    const { data: digitalItems, error } = await (supabaseAdmin as any)
      .from('menu_items')
      .select(
        `
        id,
        name,
        price,
        type,
        stock_items (
          id,
          content_text,
          is_sold,
          sold_at,
          created_at
        )
      `
      )
      .eq('bot_id', botId)
      .eq('type', 'DIGITAL_DELIVERY')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: digitalItems || [] });
  } catch (e) {
    console.error('GET /api/stock-items', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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

    const stockGate = await checkStockItemAllowed(user.id);
    if (!stockGate.ok) {
      return NextResponse.json({ error: stockGate.message }, { status: 403 });
    }

    const body = await request.json();
    const menuItemId = body?.menu_item_id;
    const contentText = body?.content_text;

    if (typeof menuItemId !== 'string' || !menuItemId) {
      return NextResponse.json({ error: 'menu_item_id is required' }, { status: 400 });
    }

    if (typeof contentText !== 'string' || !contentText.trim()) {
      return NextResponse.json({ error: 'content_text is required' }, { status: 400 });
    }

    const { data: rawMenu, error: menuErr } = await supabaseAdmin
      .from('menu_items')
      .select('id, type, bots(user_id)')
      .eq('id', menuItemId)
      .single();

    const menu = rawMenu as MenuRow | null;

    if (menuErr || !menu || menu.bots.user_id !== user.id) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    if (menu.type !== 'DIGITAL_DELIVERY') {
      return NextResponse.json({ error: 'Stock applies only to digital products' }, { status: 400 });
    }

    const text = contentText.trim();

    const { data: inserted, error } = await (supabaseAdmin as any)
      .from('stock_items')
      .insert({ menu_item_id: menuItemId, content_text: text })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await (supabaseAdmin as any)
      .from('menu_items')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', menuItemId);

    return NextResponse.json({ stockItem: inserted, added: 1 }, { status: 201 });
  } catch (e) {
    console.error('POST /api/stock-items', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
