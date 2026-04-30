import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { sendMessage } from '@/lib/telegram';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { manual_delivery_data } = body;

    // Get order with bot and menu item
    const { data: order } = await (supabaseAdmin
      .from('orders') as any)
      .select('*, bots(*), menu_items(*)')
      .eq('id', id)
      .single();

    if (!order || order.bots.user_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let deliveryContent = '';

    // Handle digital delivery
    if (order.menu_items.type === 'DIGITAL_DELIVERY') {
      // Get available stock
      const { data: stockItem } = await (supabaseAdmin
        .from('stock_items') as any)
        .select('*')
        .eq('menu_item_id', order.menu_item_id)
        .eq('is_sold', false)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (stockItem) {
        deliveryContent = stockItem.content_text;
        
        // Mark stock as sold
        await (supabaseAdmin
          .from('stock_items') as any)
          .update({
            is_sold: true,
            sold_at: new Date().toISOString(),
            order_id: id,
          })
          .eq('id', stockItem.id);
      } else {
        deliveryContent = order.menu_items.delivery_content || 'Your order is ready!';
      }
    } else if (order.menu_items.type === 'MANUAL_DELIVERY' && manual_delivery_data) {
      // Format manual delivery data
      deliveryContent = Object.entries(manual_delivery_data)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    } else {
      deliveryContent = order.menu_items.delivery_content || 'Thank you for your purchase!';
    }

    // Update order
    const { error: updateError } = await (supabaseAdmin
      .from('orders') as any)
      .update({
        status: 'COMPLETED',
        manual_delivery_data: manual_delivery_data || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Send delivery message via Telegram
    const token = decrypt(order.bots.token_encrypted);
    
    await sendMessage(
      token,
      order.telegram_user_id,
      `<b>Order Confirmed!</b>\n\n${order.menu_items.name}\n\n<b>Your Delivery:</b>\n${deliveryContent}`,
      { parse_mode: 'HTML' }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error approving order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
