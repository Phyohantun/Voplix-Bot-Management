export const DEFAULT_BOT_TELEGRAM_COPY = {
  empty_menu_html: '<b>Nothing here yet!</b>\n\nCheck back later for new products.',
  /** Shown on /start when menu has items and bot has no custom “start welcome” (Menu → Bot start). */
  menu_intro_html:
    'မင်္ဂလာပါ! ကျွန်တော်တို့ဆိုင်မှ ကြိုဆိုပါတယ်။ အောက်မှ ပစ္စည်းများကို ရွေးချယ်နိုင်ပါသည်။',
  menu_footer_html: '\n\n<i>Click a product below to continue.</i>',
  help_text_html:
    '<i>Tip: Use the {{browse_menu_button}} keyboard button or type /menu to see this list again anytime.</i>',
  browse_menu_button: 'Browse Menu',
  purchase_price_label: 'Price',
  /** Legacy fallback if product_selected_message_html were cleared (normally unused). */
  purchase_question: 'Would you like to purchase this item?',
  /**
   * Product selected — full message when customer taps a product.
   * Placeholders: [ProductName] [Price]
   */
  product_selected_message_html:
    '[ProductName] — [Price] မှာယူလိုပါသလား?\nအတည်ပြုရန် အောက်ပါ ခလုတ်ကို နှိပ်ပါ။',
  button_confirm_pay: 'Confirm & Pay',
  button_cancel: 'Cancel',
  /** Sent right before owner “Payment details” (QR / numbers) after customer taps Confirm & Pay. */
  payment_instruction_intro_html:
    'အောက်ပါ အကောင့်သို့ ငွေလွှဲပြီး slip ပို့ပေးပါ။',
  slip_request_html:
    'ငွေလွှဲပြီးပါက slip ပုံကို ဤချတ်တွင် ပို့ပေးပါ။ ကျွန်ုပ်တို့ စစ်ဆေးပြီး အတည်ပြုပေးပါမည်။',
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
  /** After customer sends slip. Placeholders: [ProductName] [CustomerName] [ShopName] */
  slip_submitted_thanks_html:
    'သင့် slip လက်ခံရရှိပါပြီ\nစစ်ဆေးနေပါသည်။ ခဏစောင့်ပါ။',
  /** When bot is paused (inactive). Placeholders: [ShopName] */
  bot_paused_message_html: 'ယခုအချိန်တွင် ဆိုင်ပိတ်ထားပါသည်။\nနောက်မှ ပြန်လာပါ',
  callback_item_not_found: 'Item not found or no longer available.',
  callback_monthly_order_limit:
    'This shop has reached its order limit for this month. Please try again later or contact the seller.',
  callback_digital_not_available: 'This product type is not available right now. Please choose another item or contact the seller.',
  callback_shop_unavailable: 'This shop cannot take orders right now. Please try again later.',
  callback_out_of_stock: 'Sorry, this item is currently out of stock.',
  callback_order_expired: 'Order session expired.',
  callback_unknown_action: 'Unknown action.',
  /** First Telegram message after you approve the slip — short plain thank-you (no account lines here). */
  order_confirmed_template_html: 'သင့်အော်ဒါ အတည်ပြုပြီးပါပြီ။ ကျေးဇူးတင်ပါသည်။',
  /**
   * Second message after the first. Leave empty to send only the text you type when approving (no extra wrapper).
   * Optional: add a short line plus a placeholder for that pasted text (advanced).
   */
  order_delivery_followup_template_html: '',
  order_rejected_template_html:
    'ဝမ်းနည်းပါသည်။ သင့်အော်ဒါကို အတည်မပြုနိုင်ပါ။ ထပ်မံဆက်သွယ်ပါ။{{reason_block}}',
};

export type BotTelegramCopy = Record<keyof typeof DEFAULT_BOT_TELEGRAM_COPY, string>;

export const BOT_TELEGRAM_COPY_LABELS: Record<keyof typeof DEFAULT_BOT_TELEGRAM_COPY, { title: string; hint?: string }> = {
  empty_menu_html: {
    title: 'Empty Menu',
    hint: 'When no products exist yet. HTML allowed.',
  },
  menu_intro_html: {
    title: '1. Welcome (first time / menu)',
    hint: 'Shown with product list on /start unless you set a custom welcome under Menu → Bot start. Plain text is OK; use <b>…</b> for bold.',
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
    title: 'Legacy — purchase question',
    hint: 'Superseded by Product selected message unless that field is cleared in storage.',
  },
  product_selected_message_html: {
    title: 'Product selected message',
    hint: 'When customer taps a product. Placeholders: [ProductName] [Price]. HTML allowed.',
  },
  button_confirm_pay: { title: 'Button — Confirm & Pay', hint: 'Keep short.' },
  button_cancel: { title: 'Button — Cancel', hint: 'Keep short.' },
  payment_instruction_intro_html: {
    title: 'Payment instructions message',
    hint: 'When customer taps Confirm & Pay, before bank / QR text. [ProductName] [Price] [ShopName]. HTML.',
  },
  slip_request_html: {
    title: 'After payment details — ask for slip',
    hint: 'Sent after payment details + this intro. HTML.',
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
  slip_submitted_thanks_html: {
    title: 'Slip received message',
    hint: 'Right after customer sends slip. [ProductName] [CustomerName] [ShopName]. HTML.',
  },
  bot_paused_message_html: {
    title: 'Bot paused message',
    hint: 'When the shop is paused. [ShopName]. HTML.',
  },
  callback_item_not_found: { title: 'Popup — Item Not Found', hint: 'Max ~190 chars.' },
  callback_monthly_order_limit: { title: 'Popup — Monthly order limit', hint: 'Max ~190 chars.' },
  callback_digital_not_available: { title: 'Popup — Digital unavailable', hint: 'Max ~190 chars.' },
  callback_shop_unavailable: { title: 'Popup — Shop unavailable', hint: 'Max ~190 chars.' },
  callback_order_expired: { title: 'Popup — Session Expired', hint: 'Max ~190 chars.' },
  callback_unknown_action: { title: 'Popup — Unknown Button', hint: 'Max ~190 chars.' },
  order_confirmed_template_html: {
    title: '4a. Order confirmed (first message after you approve)',
    hint: 'Short plain thank-you. Account lines belong in the delivery follow-up (4b) or in what you paste when approving.',
  },
  order_delivery_followup_template_html: {
    title: '4b. Delivery / account details (second message)',
    hint: 'Leave empty to send only what you paste when approving. Otherwise wrap that text with your own short intro.',
  },
  order_rejected_template_html: {
    title: '5. Order rejected (after you reject)',
    hint: 'Use {{product_name}} and {{reason_block}} (owner reason, may be empty). HTML.',
  },
};

/** Keys only Pro/Plus may persist via API (Free always gets built-in defaults for these). */
export const CUSTOMER_MESSAGE_TEMPLATE_KEYS = [
  'product_selected_message_html',
  'payment_instruction_intro_html',
  'slip_request_html',
  'slip_submitted_thanks_html',
  'bot_paused_message_html',
  'order_confirmed_template_html',
  'order_delivery_followup_template_html',
] as const satisfies ReadonlyArray<keyof BotTelegramCopy>;

export const BOT_TELEGRAM_COPY_SECTIONS = [
  {
    title: 'Owner — 5 key customer messages',
    keys: [
      'menu_intro_html',
      'product_selected_message_html',
      'payment_instruction_intro_html',
      'slip_submitted_thanks_html',
      'bot_paused_message_html',
      'order_confirmed_template_html',
      'order_delivery_followup_template_html',
      'order_rejected_template_html',
    ],
  },
  {
    title: 'Browsing & Menu',
    keys: [
      'empty_menu_html',
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
      'callback_monthly_order_limit',
      'callback_digital_not_available',
      'callback_shop_unavailable',
      'callback_order_expired',
      'callback_unknown_action',
    ],
  },
  {
    title: 'After you Approve / Reject (Dashboard)',
    keys: [
      'order_confirmed_template_html',
      'order_delivery_followup_template_html',
      'order_rejected_template_html',
    ],
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

/** Free plan always uses built-in text for Menu → customer message templates (even if old JSON exists). */
export function mergeBotTelegramCopyRespectingPlan(
  customCopy: any,
  planTier: 'free' | 'pro' | 'plus'
): BotTelegramCopy {
  const merged = mergeBotTelegramCopy(customCopy);
  if (planTier !== 'free') return merged;
  const next = { ...merged };
  for (const k of CUSTOMER_MESSAGE_TEMPLATE_KEYS) {
    next[k] = DEFAULT_BOT_TELEGRAM_COPY[k];
  }
  return next;
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

/** Owner-typed lines (plain text) → safe Telegram HTML body with line breaks. */
export function plainLinesToTelegramDeliveryHtml(text: string): string {
  return escapeHtml(text.trim()).replace(/\n/g, '<br/>');
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

/** Replace [ProductName]-style placeholders (owner HTML; substitute pre-escaped values). Longest keys first. */
export function applyBracketPlaceholders(template: string, vars: Record<string, string>): string {
  let result = template;
  const keys = Object.keys(vars).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const val = vars[key] ?? '';
    result = result.split(`[${key}]`).join(val);
  }
  return result;
}
