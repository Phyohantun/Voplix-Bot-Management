import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { sendMessage } from '@/lib/telegram';
import { mergeBotTelegramCopy, applyTemplate, escapeHtml } from '@/lib/bot-telegram-copy';

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

    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

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
        manual_delivery_data: reason ? { reject_reason: reason } : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const copy = mergeBotTelegramCopy(order.bots.telegram_customer_copy);
    const reasonBlock = reason ? `\n\nReason: ${escapeHtml(reason)}` : '';
    const rejectHtml = applyTemplate(copy.order_rejected_template_html, {
      product_name: escapeHtml(String(order.menu_items.name)),
      reason_block: reasonBlock,
    });

    const token = decrypt(order.bots.token_encrypted);
    await sendMessage(token, order.telegram_user_id, rejectHtml, { parse_mode: 'HTML' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
