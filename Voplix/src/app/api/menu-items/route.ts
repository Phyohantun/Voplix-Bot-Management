import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const MENU_TYPES = ['DIGITAL_DELIVERY', 'MANUAL_DELIVERY', 'MESSAGE_ONLY'] as const;
type MenuType = (typeof MENU_TYPES)[number];

function isMenuType(v: unknown): v is MenuType {
  return typeof v === 'string' && (MENU_TYPES as readonly string[]).includes(v);
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
    const { bot_id, name, price, type, delivery_content } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!bot_id || typeof bot_id !== 'string') {
      return NextResponse.json({ error: 'bot_id is required' }, { status: 400 });
    }

    const priceNum =
      typeof price === 'number' && Number.isFinite(price) && price >= 0
        ? Math.floor(price)
        : 0;

    const itemType: MenuType = isMenuType(type) ? type : 'MESSAGE_ONLY';

    let delivery: string | null = null;
    if (delivery_content != null) {
      if (typeof delivery_content !== 'string') {
        return NextResponse.json({ error: 'delivery_content must be a string' }, { status: 400 });
      }
      const t = delivery_content.trim();
      delivery = t.length > 0 ? t : null;
    }

    const { data: bot } = await (supabaseAdmin as any)
      .from('bots')
      .select('id')
      .eq('id', bot_id)
      .eq('user_id', user.id)
      .single();

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    const { data: orderRows } = await (supabaseAdmin as any)
      .from('menu_items')
      .select('sort_order')
      .eq('bot_id', bot_id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const topOrder = orderRows?.[0]?.sort_order as number | undefined;
    const sort_order = typeof topOrder === 'number' ? topOrder + 1 : 0;

    const { data: menuItem, error } = await (supabaseAdmin as any)
      .from('menu_items')
      .insert({
        bot_id,
        name: name.trim(),
        price: priceNum,
        type: itemType,
        delivery_content: delivery,
        sort_order,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ menuItem }, { status: 201 });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    let query = (supabaseAdmin as any)
      .from('menu_items')
      .select('*, stock_items(count)')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (botId) {
      query = query.eq('bot_id', botId);
    }

    const { data: menuItems, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ menuItems: menuItems || [] });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
