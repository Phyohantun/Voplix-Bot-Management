export const DEFAULT_BOT_TELEGRAM_COPY = {
  empty_menu_html: '<b>Nothing here yet!</b>\n\nCheck back later for new products.',
  menu_intro_html: '<b>Welcome!</b>\n\nHere is our current menu:',
  menu_footer_html: '\n\n<i>Click a product below to continue.</i>',
  help_text_html:
    '<i>Tip: Use the {{browse_menu_button}} keyboard button or type /menu to see this list again anytime.</i>',
  browse_menu_button: 'Browse Menu',
  purchase_price_label: 'Price',
  purchase_question: 'Would you like to purchase this item?',
  button_confirm_pay: '✅ Confirm & Pay',
  button_cancel: '❌ Cancel',
  slip_request_html:
    '<b>Order Created!</b>\n\nAfter you have paid, please send your payment slip as a photo. We will verify it and process your order.',
  order_cancelled: 'Order cancelled. Use /start to browse the menu again.',
  help_command_html:
    '<b>Available Commands</b>\n\n/start - Show the menu\n/menu - Show the menu\n/help - Show this help message',
  slip_out_of_band_html:
    '<b>Payment Slip</b>\n\nWe only accept slips after you click <b>Confirm & Pay</b> on an order. If you already sent one, please wait for verification — no need to send extra photos.',
  slip_order_not_found: 'We could not find your order. Please try again using /start.',
  slip_already_received:
    'We already have your payment slip for this order. Please wait for verification — no need to send more photos.',
  slip_order_completed: 'This order is already completed. Use /start if you need something else.',
  slip_order_rejected: 'This order was rejected. Use /start to place a new order if you still need the item.',
  slip_wrong_state: 'We cannot accept another slip for this order in its current state. Use /start if you need help.',
  slip_save_failed: 'There was an error saving your slip. Please try again in a moment or ask for help.',
  slip_submitted_thanks_html:
    '<b>Thank you!</b>\n\nYour payment slip has been submitted. We will verify it and deliver your order shortly.',
  callback_item_not_found: 'Item not found or no longer available.',
  callback_out_of_stock: 'Sorry, this item is currently out of stock.',
  callback_order_expired: 'Order session expired.',
  callback_unknown_action: 'Unknown action.',
  order_confirmed_template_html:
    '<b>Order Confirmed!</b>\n\n{{product_name}}\n\n<b>Delivery for you:</b>\n{{delivery}}',
  order_rejected_template_html:
    '<b>Order Status</b>\n\nYour order for {{product_name}} was rejected.{{reason_block}}\n\nIf you think this is a mistake, please ask for help.',
};

export type BotTelegramCopy = Record<keyof typeof DEFAULT_BOT_TELEGRAM_COPY, string>;

export const BOT_TELEGRAM_COPY_LABELS: Record<keyof typeof DEFAULT_BOT_TELEGRAM_COPY, { title: string; hint?: string }> = {
  empty_menu_html: {
    title: 'Empty Menu',
    hint: 'When no products exist yet. HTML allowed.',
  },
  menu_intro_html: {
    title: 'Menu — Intro (if no custom welcome)',
  },
  menu_footer_html: {
    title: 'Menu — Footer',
    hint: 'e.g. "Click a product below...". HTML.',
  },
  help_text_html: {
    title: 'Menu — Help Tip',
    hint: 'Use {{browse_menu_button}} for the bottom keyboard name. HTML.',
  },
  browse_menu_button: {
    title: 'Bottom Keyboard — "Browse Menu" Name',
    hint: 'Must match what you say in the Help Tip. Plain text.',
  },
  purchase_price_label: {
    title: 'Purchase Screen — Price Label',
    hint: 'Shown as "Label: Amount". Plain text.',
  },
  purchase_question: {
    title: 'Purchase Screen — Question below price',
    hint: 'Plain text (shown after product name and price).',
  },
  button_confirm_pay: { title: 'Button — Confirm & Pay', hint: 'Keep short.' },
  button_cancel: { title: 'Button — Cancel', hint: 'Keep short.' },
  slip_request_html: {
    title: 'After Confirm & Pay — Slip Request',
    hint: 'Sent after your payment-details message (from Menu → Payment details). HTML.',
  },
  order_cancelled: { title: 'Order Cancelled', hint: 'After user clicks Cancel.' },
  help_command_html: { title: '/help Command Response', hint: 'HTML.' },
  slip_out_of_band_html: {
    title: 'Photo outside of slip phase',
    hint: 'When user sends a photo but no order is waiting for a slip. HTML.',
  },
  callback_out_of_stock: {
    title: 'Out of Stock (Small Popup)',
    hint: 'Max ~190 chars (Telegram limit).',
  },
  slip_order_not_found: { title: 'Slip — Order Not Found', hint: 'HTML.' },
  slip_already_received: { title: 'Slip — Already Received', hint: 'HTML.' },
  slip_order_completed: { title: 'Slip — Order Completed', hint: 'HTML.' },
  slip_order_rejected: { title: 'Slip — Order Rejected', hint: 'HTML.' },
  slip_wrong_state: { title: 'Slip — Wrong Order State', hint: 'HTML.' },
  slip_save_failed: { title: 'Slip — Save Error', hint: 'HTML.' },
  slip_submitted_thanks_html: { title: 'Slip — Success Thanks', hint: 'HTML.' },
  callback_item_not_found: { title: 'Popup — Item Not Found', hint: 'Max ~190 chars.' },
  callback_order_expired: { title: 'Popup — Session Expired', hint: 'Max ~190 chars.' },
  callback_unknown_action: { title: 'Popup — Unknown Button', hint: 'Max ~190 chars.' },
  order_confirmed_template_html: {
    title: 'Order Confirmed (After you approve)',
    hint: 'Use {{product_name}} and {{delivery}}. HTML.',
  },
  order_rejected_template_html: {
    title: 'Order Rejected',
    hint: 'Use {{product_name}} and {{reason_block}}. HTML.',
  },
};

export const BOT_TELEGRAM_COPY_SECTIONS = [
  {
    title: 'Browsing & Menu',
    keys: [
      'empty_menu_html',
      'menu_intro_html',
      'menu_footer_html',
      'help_text_html',
      'browse_menu_button',
      'help_command_html',
    ],
  },
  {
    title: 'Ordering & Payment',
    keys: [
      'purchase_price_label',
      'purchase_question',
      'button_confirm_pay',
      'button_cancel',
      'slip_request_html',
      'order_cancelled',
    ],
  },
  {
    title: 'Payment Slips',
    keys: [
      'slip_submitted_thanks_html',
      'slip_out_of_band_html',
      'slip_already_received',
      'slip_order_not_found',
      'slip_order_completed',
      'slip_order_rejected',
      'slip_wrong_state',
      'slip_save_failed',
    ],
  },
  {
    title: 'Help, Stock & Popups',
    keys: [
      'callback_out_of_stock',
      'callback_item_not_found',
      'callback_order_expired',
      'callback_unknown_action',
    ],
  },
  {
    title: 'After you Approve / Reject (Dashboard)',
    keys: ['order_confirmed_template_html', 'order_rejected_template_html'],
  },
] as const;

/** Stored inside `telegram_customer_copy` JSON (not a separate DB column). */
export const PAYMENT_INSTRUCTIONS_JSON_KEY = 'payment_instructions' as const;

export function paymentInstructionsFromCustomerCopyJson(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const v = (data as Record<string, unknown>)[PAYMENT_INSTRUCTIONS_JSON_KEY];
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

/** Prefer legacy `payment_instructions` column if present; else JSON meta key. */
export function paymentInstructionsFromBotRow(bot: {
  payment_instructions?: string | null;
  telegram_customer_copy?: unknown;
}): string {
  const col = typeof bot.payment_instructions === 'string' ? bot.payment_instructions.trim() : '';
  if (col) return col;
  return paymentInstructionsFromCustomerCopyJson(bot.telegram_customer_copy) ?? '';
}

function isPlainCopyObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Merge template keys from dashboard; keeps `payment_instructions` and other non-template keys unless cleared. */
export function mergeTelegramCustomerCopyJson(
  previous: unknown,
  incomingTemplates: unknown,
  mode: 'replace_templates' | 'clear_all_templates'
): Record<string, unknown> {
  const base = isPlainCopyObject(previous) ? { ...previous } : {};

  if (mode === 'clear_all_templates') {
    const keep = paymentInstructionsFromCustomerCopyJson(base);
    const next: Record<string, unknown> = {};
    if (keep) next[PAYMENT_INSTRUCTIONS_JSON_KEY] = keep;
    return next;
  }

  const next = { ...base };
  if (!incomingTemplates || typeof incomingTemplates !== 'object') return next;

  const inc = incomingTemplates as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_BOT_TELEGRAM_COPY)) {
    if (!(k in inc)) continue;
    const v = inc[k];
    if (typeof v === 'string' && v.trim()) next[k] = v;
    else delete next[k];
  }
  return next;
}

export function mergeBotTelegramCopy(customCopy: any): BotTelegramCopy {
  const result = { ...DEFAULT_BOT_TELEGRAM_COPY };
  if (!customCopy || typeof customCopy !== 'object') return result;

  for (const key of Object.keys(DEFAULT_BOT_TELEGRAM_COPY) as Array<keyof typeof DEFAULT_BOT_TELEGRAM_COPY>) {
    if (typeof customCopy[key] === 'string' && customCopy[key].trim() !== '') {
      result[key] = customCopy[key];
    }
  }
  return result;
}

export function parseTelegramCustomerCopyFromClient(data: any): Record<string, string> {
  const result: Record<string, string> = {};
  if (!data || typeof data !== 'object') return result;

  for (const key of Object.keys(DEFAULT_BOT_TELEGRAM_COPY)) {
    if (typeof data[key] === 'string' && data[key].trim() !== '') {
      result[key] = data[key];
    }
  }
  return result;
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function telegramHtmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>?/gm, '');
}

export function applyTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}
