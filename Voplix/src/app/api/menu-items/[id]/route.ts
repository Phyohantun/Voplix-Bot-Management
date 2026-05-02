import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  countActiveMenuItemsForUser,
  loadPlatformAccountFlagsAdmin,
  maxActiveMenuItemsForPlan,
  planAllowsAutomatedDelivery,
} from '@/lib/plan-limits';

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
    const { name, price, type, delivery_content, is_active } = body;

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
      if (type === 'DIGITAL_DELIVERY') {
        const flags = await loadPlatformAccountFlagsAdmin(user.id);
        if (!planAllowsAutomatedDelivery(flags.plan_tier)) {
          return NextResponse.json(
            { error: 'Auto delivery (digital) requires Pro or Plus. Upgrade on Subscription.' },
            { status: 403 }
          );
        }
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

    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') {
        return NextResponse.json({ error: 'is_active must be boolean' }, { status: 400 });
      }
      const wasActive = Boolean((menuItem as { is_active?: boolean }).is_active);
      if (is_active && !wasActive) {
        const flags = await loadPlatformAccountFlagsAdmin(user.id);
        const cap = maxActiveMenuItemsForPlan(flags.plan_tier);
        if (cap != null) {
          const n = await countActiveMenuItemsForUser(user.id);
          if (n >= cap) {
            return NextResponse.json(
              { error: `Free plan includes up to ${cap} listed products. Unlist another product or upgrade.` },
              { status: 403 }
            );
          }
        }
      }
      updates.is_active = is_active;
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
