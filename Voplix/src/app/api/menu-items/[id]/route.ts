import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const MENU_TYPES = ['DIGITAL_DELIVERY', 'MANUAL_DELIVERY'] as const;
type MenuType = (typeof MENU_TYPES)[number];

function isMenuType(v: unknown): v is MenuType {
  return typeof v === 'string' && (MENU_TYPES as readonly string[]).includes(v);
}

type MenuItemRowWithBot = {
  id: string;
  bots: { user_id: string };
};

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

    const body = await request.json();
    const { name, price, type, delivery_content } = body;

    const { data: rawItem, error: fetchError } = await supabaseAdmin
      .from('menu_items')
      .select('*, bots(user_id)')
      .eq('id', id)
      .single();

    const menuItem = rawItem as MenuItemRowWithBot | null;

    if (fetchError || !menuItem || menuItem.bots.user_id !== user.id) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (price !== undefined) {
      if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 });
      }
      updates.price = Math.floor(price);
    }

    if (type !== undefined) {
      if (!isMenuType(type)) {
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
      }
      updates.type = type;
    }

    if (delivery_content !== undefined) {
      if (delivery_content !== null && typeof delivery_content !== 'string') {
        return NextResponse.json({ error: 'delivery_content must be string or null' }, { status: 400 });
      }
      if (typeof delivery_content === 'string') {
        const t = delivery_content.trim();
        updates.delivery_content = t.length > 0 ? t : null;
      } else {
        updates.delivery_content = null;
      }
    }

    const payloadKeys = Object.keys(updates).filter((k) => k !== 'updated_at');
    if (payloadKeys.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: updatedItem, error } = await (supabaseAdmin as any)
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ menuItem: updatedItem });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    const { data: rawItem } = await supabaseAdmin
      .from('menu_items')
      .select('*, bots(user_id)')
      .eq('id', id)
      .single();

    const menuItem = rawItem as MenuItemRowWithBot | null;

    if (!menuItem || menuItem.bots.user_id !== user.id) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    const { error } = await (supabaseAdmin as any)
      .from('menu_items')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
