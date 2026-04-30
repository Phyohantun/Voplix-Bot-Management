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

    // Get order with bot and menu item
    const { data: order } = await (supabaseAdmin
      .from('orders') as any)
      .select('*, bots(*), menu_items(*)')
      .eq('id', id)
      .single();

    if (!order || order.bots.user_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update order
    const { error: updateError } = await (supabaseAdmin
      .from('orders') as any)
      .update({
        status: 'REJECTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Send rejection message via Telegram
    const token = decrypt(order.bots.token_encrypted);
    
    await sendMessage(
      token,
      order.telegram_user_id,
      `<b>Order Update</b>\n\nYour order for ${order.menu_items.name} has been cancelled.\n\nIf you believe this is an error, please contact support.`,
      { parse_mode: 'HTML' }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
