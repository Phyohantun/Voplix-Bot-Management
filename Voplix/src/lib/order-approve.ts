import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { sendMessage } from '@/lib/telegram';
import {
  mergeBotTelegramCopyRespectingPlan,
  applyTemplate,
  escapeHtml,
  plainLinesToTelegramDeliveryHtml,
  resolveOrderDeliveryFollowupHtml,
  telegramHtmlToPlain,
} from '@/lib/bot-telegram-copy';
import { roundMoney } from '@/lib/order-revenue';
import { effectivePlanTier, loadPlatformAccountFlagsAdmin } from '@/lib/plan-limits';

type ApproveBody = {
  manual_message?: string | null;
};

/** Turn owner-typed or menu-saved HTML into plain lines for the buyer (no raw tags). */
function ownerDeliveryAsPlainText(raw: string): string {
  const plain = telegramHtmlToPlain(raw).replace(/\r\n/g, '\n').trim();
  return plain;
}

/**
 * Completes an order after slip verification: assigns delivery, marks COMPLETED, notifies customer on Telegram.
 * Only orders in SLIP_SUBMITTED can be approved (dashboard + orders UI).
 */
export async function approveSlipOrderForOwner(
  orderId: string,
  ownerUserId: string,
  body: ApproveBody = {}
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const { data: order } = await (supabaseAdmin
    .from('orders') as any)
    .select('*, bots(*), menu_items(*)')
    .eq('id', orderId)
    .single();

  if (!order || order.bots.user_id !== ownerUserId) {
    return { ok: false, error: 'Order not found', status: 404 };
  }

  if (order.status !== 'SLIP_SUBMITTED') {
    return { ok: false, error: 'Order is not waiting for slip approval', status: 400 };
  }

  const { manual_message } = body;

  let deliveryContent = '';

  if (order.menu_items.type === 'DIGITAL_DELIVERY') {
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

      await (supabaseAdmin
        .from('stock_items') as any)
        .update({
          is_sold: true,
          sold_at: new Date().toISOString(),
          order_id: orderId,
        })
        .eq('id', stockItem.id);

      const { count: remaining } = await (supabaseAdmin
        .from('stock_items') as any)
        .select('*', { count: 'exact', head: true })
        .eq('menu_item_id', order.menu_item_id)
        .eq('is_sold', false);

      if ((remaining ?? 0) === 0) {
        await (supabaseAdmin.from('menu_items') as any)
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', order.menu_item_id);
      }
    } else {
      deliveryContent = order.menu_items.delivery_content || 'Your order is ready!';
    }
  } else if (order.menu_items.type === 'MANUAL_DELIVERY') {
    const pasted = typeof manual_message === 'string' ? manual_message.trim() : '';
    if (!pasted) {
      return {
        ok: false,
        error:
          'This product is fulfilled by you. Enter the exact message the customer should receive (accounts, links, instructions) before approving.',
        status: 400,
      };
    }
    const normalized = ownerDeliveryAsPlainText(pasted);
    if (!normalized) {
      return {
        ok: false,
        error: 'That message is empty after removing formatting. Type the details you want to send the customer.',
        status: 400,
      };
    }
    deliveryContent = normalized;
  } else {
    const fromMenu = order.menu_items.delivery_content
      ? ownerDeliveryAsPlainText(String(order.menu_items.delivery_content))
      : '';
    deliveryContent = fromMenu || 'Thank you for your purchase!';
  }

  const storedManual =
    order.menu_items.type === 'MANUAL_DELIVERY' ? { message: deliveryContent } : null;

  const snapshotRevenue = roundMoney(Number(order.menu_items.price ?? 0));

  const { error: updateError } = await (supabaseAdmin
    .from('orders') as any)
    .update({
      status: 'COMPLETED',
      manual_delivery_data: storedManual,
      revenue_amount: snapshotRevenue,
      revenue_manually_edited: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) {
    return { ok: false, error: updateError.message, status: 500 };
  }

  const ownerFlags = await loadPlatformAccountFlagsAdmin(ownerUserId);
  const planForCopy = effectivePlanTier(ownerFlags.plan_tier, ownerFlags.subscription_period_end);
  const copy = mergeBotTelegramCopyRespectingPlan(order.bots.telegram_customer_copy, planForCopy);
  const productNameEsc = escapeHtml(String(order.menu_items.name));
  const deliveryHtml = plainLinesToTelegramDeliveryHtml(deliveryContent);

  const confirmHtml = applyTemplate(copy.order_confirmed_template_html, {
    product_name: productNameEsc,
    delivery: '',
  });

  const token = decrypt(order.bots.token_encrypted);
  const confirmRes = await sendMessage(token, order.telegram_user_id, confirmHtml, { parse_mode: 'HTML' });
  if (!confirmRes.ok) {
    console.error('[approve] order confirmed message failed:', confirmRes.error);
  }

  const followHtml = resolveOrderDeliveryFollowupHtml(copy.order_delivery_followup_template_html, deliveryHtml);
  const followRes = await sendMessage(token, order.telegram_user_id, followHtml, { parse_mode: 'HTML' });
  if (!followRes.ok) {
    console.error('[approve] delivery / account message failed:', followRes.error);
  }

  return { ok: true };
}
