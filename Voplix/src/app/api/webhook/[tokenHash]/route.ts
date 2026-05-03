import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import {
  sendMessage,
  answerCallbackQuery,
  createMainMenuKeyboard,
  createConfirmOrderKeyboard,
  createPersistentMenuReplyKeyboard,
} from '@/lib/telegram';
import { getUserSession, setUserSession, clearUserSession, UserSession } from '@/lib/redis';
import { getShopCurrencyForBot } from '@/lib/owner-currency';
import { formatCurrencyAmount } from '@/lib/currency';
import {
  mergeBotTelegramCopyRespectingPlan,
  telegramHtmlToPlain,
  escapeHtml,
  paymentInstructionsFromBotRow,
  applyBracketPlaceholders,
  type BotTelegramCopy,
} from '@/lib/bot-telegram-copy';
import { getShopDisplayName } from '@/lib/shop-display-name';
import { checkOrderCreationAllowed, effectivePlanTier, loadPlatformAccountFlagsAdmin } from '@/lib/plan-limits';

interface TelegramUpdate {
  message?: {
    message_id: number;
    from: {
      id: number;
      username?: string;
    };
    chat: {
      id: number;
    };
    text?: string;
    photo?: Array<{ file_id: string }>;
    document?: {
      file_id: string;
      mime_type?: string;
    };
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      username?: string;
    };
    data: string;
    message?: {
      chat: {
        id: number;
      };
    };
  };
}

type MenuItemType = 'DIGITAL_DELIVERY' | 'MANUAL_DELIVERY';

interface MenuItemRecord {
  id: string;
  bot_id: string;
  name: string;
  price: number;
  type: MenuItemType;
  delivery_content: string | null;
  is_active: boolean;
}

interface BotStartConfig {
  start_welcome_message: string | null;
  start_show_menu_only: boolean;
  start_show_tip: boolean;
}

async function sendMessageWithFallback(
  token: string,
  chatId: number,
  htmlText: string,
  fallbackText: string,
  options?: { reply_markup?: object }
) {
  const primary = await sendMessage(token, chatId, htmlText, {
    parse_mode: 'HTML',
    ...options,
  });

  if (primary.ok) {
    return primary;
  }

  console.error('[webhook] HTML send failed, retrying plain text:', primary.error);
  return sendMessage(token, chatId, fallbackText, options);
}

const TELEGRAM_MAX_MESSAGE_LEN = 4096;

/**
 * Owner-defined intro (HTML) then bank / QR text from Menu → Payment details (plain, chunked).
 */
async function sendCustomerPaymentInstructions(
  token: string,
  chatId: number,
  payText: string,
  introHtml: string
) {
  const intro = introHtml?.trim();
  if (intro) {
    const introPlain = telegramHtmlToPlain(intro);
    await sendMessageWithFallback(token, chatId, intro, introPlain);
  }

  const trimmed = payText.trim();
  if (!trimmed) return;

  let offset = 0;
  while (offset < trimmed.length) {
    const slice = trimmed.slice(offset, offset + TELEGRAM_MAX_MESSAGE_LEN);
    await sendMessage(token, chatId, slice);
    offset += slice.length;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tokenHash: string }> }
) {
  try {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (webhookSecret && webhookSecret.length >= 16) {
      const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
      if (headerSecret !== webhookSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { tokenHash } = await params;
    const update: TelegramUpdate = await request.json();

    console.log('[webhook] hit', {
      tokenHash: tokenHash.slice(0, 8),
      hasMessage: !!update.message,
      text: update.message?.text,
      hasCallback: !!update.callback_query,
    });

    const { data: bot, error: botError } = await (supabaseAdmin
      .from('bots') as any)
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (botError || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    const token = decrypt((bot as any).token_encrypted);
    const botId = (bot as any).id;
    const ownerUserId = (bot as any).user_id as string;
    const botUsername = (bot as any).bot_username as string;
    const ownerFlags = await loadPlatformAccountFlagsAdmin(ownerUserId);
    const planForCopy = effectivePlanTier(ownerFlags.plan_tier, ownerFlags.subscription_period_end);
    const copy = mergeBotTelegramCopyRespectingPlan((bot as any).telegram_customer_copy, planForCopy);
    const customerPaymentText = paymentInstructionsFromBotRow(bot as any);

    if (!(bot as any).is_active) {
      const shopName = await getShopDisplayName(ownerUserId, botUsername);
      const pausedHtml = applyBracketPlaceholders(copy.bot_paused_message_html, {
        ShopName: escapeHtml(shopName),
      });
      const pausedPlain = telegramHtmlToPlain(pausedHtml);

      if (update.message) {
        const chatId = update.message.chat.id;
        await sendMessageWithFallback(token, chatId, pausedHtml, pausedPlain);
        return NextResponse.json({ ok: true });
      }

      if (update.callback_query) {
        const cq = update.callback_query;
        const chatId = cq.message?.chat.id;
        if (chatId) {
          await answerCallbackQuery(token, cq.id, pausedPlain.slice(0, 190));
          await sendMessageWithFallback(token, chatId, pausedHtml, pausedPlain);
        }
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    // Handle message
    if (update.message) {
      const { from, chat, text, photo, document } = update.message;
      const telegramUserId = from.id.toString();
      const telegramUsername = from.username || '';
      const normalizedText = text?.trim() || '';
      const lowerText = normalizedText.toLowerCase();

      // Track user
      await trackTelegramUser(botId, telegramUserId, telegramUsername);

      // Get user session
      const session = await getUserSession(telegramUserId, botId);

      // Same label as the reply keyboard we show after /start
      if (normalizedText === copy.browse_menu_button) {
        await handleStart(token, chat.id, botId, telegramUserId, copy);
        return NextResponse.json({ ok: true });
      }

      // Handle /start command (including deep-link payloads like /start ref123)
      if (lowerText.startsWith('/start')) {
        await handleStart(token, chat.id, botId, telegramUserId, copy);
        return NextResponse.json({ ok: true });
      }

      // Handle /menu command
      if (lowerText === '/menu') {
        await handleStart(token, chat.id, botId, telegramUserId, copy);
        return NextResponse.json({ ok: true });
      }

      // Handle /help command
      if (lowerText === '/help') {
        await sendMessage(token, chat.id, copy.help_text_html, { parse_mode: 'HTML' });
        return NextResponse.json({ ok: true });
      }

      // Handle photo (slip upload)
      if (photo && session?.state === 'WAITING_FOR_SLIP') {
        await handleSlipUpload(
          token,
          chat.id,
          botId,
          telegramUserId,
          telegramUsername,
          photo[photo.length - 1].file_id,
          session,
          copy
        );
        return NextResponse.json({ ok: true });
      }

      // Document as image or PDF (some clients send slips as files instead of photos)
      if (document && session?.state === 'WAITING_FOR_SLIP') {
        const mime = document.mime_type || '';
        const okMime = mime.startsWith('image/') || mime === 'application/pdf';
        if (okMime) {
          await handleSlipUpload(
            token,
            chat.id,
            botId,
            telegramUserId,
            telegramUsername,
            document.file_id,
            session,
            copy
          );
          return NextResponse.json({ ok: true });
        }
        await sendMessage(token, chat.id, copy.slip_unsupported_file_html, { parse_mode: 'HTML' });
        return NextResponse.json({ ok: true });
      }

      // Photos outside the slip step (e.g. many slips after submit): short reply instead of full /start menu
      if (photo) {
        await sendMessage(token, chat.id, copy.slip_out_of_band_html, { parse_mode: 'HTML' });
        return NextResponse.json({ ok: true });
      }

      // Default response
      await handleStart(token, chat.id, botId, telegramUserId, copy);
    }

    // Handle callback queries
    if (update.callback_query) {
      const { id: callbackId, from, data, message } = update.callback_query;
      const chatId = message?.chat.id;
      
      if (!chatId) {
        return NextResponse.json({ ok: true });
      }

      const telegramUserId = from.id.toString();
      const telegramUsername = from.username || '';

      if (data.startsWith('menu_')) {
        const menuItemId = data.replace('menu_', '');
        await handleMenuSelection(
          token,
          chatId,
          botId,
          (bot as any).user_id as string,
          telegramUserId,
          telegramUsername,
          menuItemId,
          callbackId,
          copy
        );
      } else if (data === 'confirm_order') {
        await handleConfirmOrder(
          token,
          chatId,
          botId,
          ownerUserId,
          telegramUserId,
          callbackId,
          copy,
          customerPaymentText
        );
      } else if (data === 'cancel_order') {
        await handleCancelOrder(token, chatId, botId, telegramUserId, callbackId, copy);
      } else {
        await answerCallbackQuery(token, callbackId, copy.callback_unknown_action);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

async function trackTelegramUser(botId: string, telegramUserId: string, telegramUsername: string) {
  const { data: existing } = await (supabaseAdmin
    .from('telegram_users') as any)
    .select('id')
    .eq('bot_id', botId)
    .eq('telegram_user_id', telegramUserId)
    .single();

  if (existing) {
    await (supabaseAdmin
      .from('telegram_users') as any)
      .update({ last_seen: new Date().toISOString(), telegram_username: telegramUsername })
      .eq('id', (existing as any).id);
  } else {
    await (supabaseAdmin
      .from('telegram_users') as any)
      .insert({
        bot_id: botId,
        telegram_user_id: telegramUserId,
        telegram_username: telegramUsername,
      });
  }
}

async function handleStart(
  token: string,
  chatId: number,
  botId: string,
  telegramUserId: string,
  copy: BotTelegramCopy
) {
  const { data: botConfigData } = await (supabaseAdmin
    .from('bots') as any)
    .select('start_welcome_message, start_show_menu_only, start_show_tip')
    .eq('id', botId)
    .single();

  const botConfig = (botConfigData as BotStartConfig | null) ?? {
    start_welcome_message: null,
    start_show_menu_only: false,
    start_show_tip: true,
  };

  // Get menu items
  const { data: menuItems } = await (supabaseAdmin
    .from('menu_items') as any)
    .select('*')
    .eq('bot_id', botId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!menuItems || menuItems.length === 0) {
    await sendMessageWithFallback(
      token,
      chatId,
      copy.empty_menu_html,
      telegramHtmlToPlain(copy.empty_menu_html)
    );
    return;
  }

  const typedMenuItems = menuItems as MenuItemRecord[];
  const shopCurrency = await getShopCurrencyForBot(botId);

  const keyboard = createMainMenuKeyboard(
    typedMenuItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
    })),
    shopCurrency
  );

  const menuLines = typedMenuItems.map((item, index) => {
    const safe = escapeHtml(item.name);
    if (item.price > 0) {
      return `${index + 1}. ${safe} — ${escapeHtml(formatCurrencyAmount(item.price, shopCurrency))}`;
    }
    return `${index + 1}. ${safe}`;
  });

  const plainMenuLines = typedMenuItems.map((item, index) =>
    item.price > 0
      ? `${index + 1}. ${item.name} — ${formatCurrencyAmount(item.price, shopCurrency)}`
      : `${index + 1}. ${item.name}`
  );

  const introHtml = botConfig.start_welcome_message?.trim()
    ? `${escapeHtml(botConfig.start_welcome_message.trim())}\n\n`
    : copy.menu_intro_html;
  const introPlain = botConfig.start_welcome_message?.trim()
    ? `${botConfig.start_welcome_message.trim()}\n\n`
    : telegramHtmlToPlain(copy.menu_intro_html);

  const main = await sendMessageWithFallback(
    token,
    chatId,
    botConfig.start_show_menu_only
      ? `${menuLines.join('\n')}`
      : `${introHtml}\n\n${menuLines.join('\n')}${copy.menu_footer_html}`,
    botConfig.start_show_menu_only
      ? `${plainMenuLines.join('\n')}`
      : `${introPlain}\n\n${plainMenuLines.join('\n')}${telegramHtmlToPlain(copy.menu_footer_html)}`,
    { reply_markup: keyboard }
  );

  if (!main.ok) {
    console.error('[webhook] sendMessage (menu) failed:', main.error);
  }

  if (botConfig.start_show_tip) {
    const tipHtml = copy.help_text_html.replace(
      /\{\{browse_menu_button\}\}/g,
      escapeHtml(copy.browse_menu_button)
    );
    const tipPlain = telegramHtmlToPlain(
      copy.help_text_html.replace(/\{\{browse_menu_button\}\}/g, copy.browse_menu_button)
    );
    const tip = await sendMessageWithFallback(
      token,
      chatId,
      tipHtml,
      tipPlain,
      { reply_markup: createPersistentMenuReplyKeyboard(copy.browse_menu_button) }
    );

    if (!tip.ok) {
      console.error('[webhook] sendMessage (reply keyboard) failed:', tip.error);
    }
  }

  await setUserSession(telegramUserId, botId, { state: 'VIEWING_MENU' });
}

async function handleMenuSelection(
  token: string,
  chatId: number,
  botId: string,
  ownerUserId: string,
  telegramUserId: string,
  telegramUsername: string,
  menuItemId: string,
  callbackId: string,
  copy: BotTelegramCopy
) {
  // Get menu item
  const { data: menuItem } = await (supabaseAdmin
    .from('menu_items') as any)
    .select('*')
    .eq('id', menuItemId)
    .eq('bot_id', botId)
    .eq('is_active', true)
    .single();

  if (!menuItem) {
    await answerCallbackQuery(token, callbackId, copy.callback_item_not_found);
    return;
  }

  const typedMenuItem = menuItem as MenuItemRecord;

  const orderGate = await checkOrderCreationAllowed(ownerUserId, typedMenuItem.type);
  if (!orderGate.ok) {
    const msg =
      orderGate.code === 'monthly_cap'
        ? copy.callback_monthly_order_limit
        : orderGate.code === 'digital_blocked'
          ? copy.callback_digital_not_available
          : copy.callback_shop_unavailable;
    await answerCallbackQuery(token, callbackId, msg);
    return;
  }

  const shopCurrency = await getShopCurrencyForBot(botId);

  // Check stock for digital delivery
  if (typedMenuItem.type === 'DIGITAL_DELIVERY') {
    const { count } = await (supabaseAdmin
      .from('stock_items') as any)
      .select('*', { count: 'exact', head: true })
      .eq('menu_item_id', menuItemId)
      .eq('is_sold', false);

    if (!count || count === 0) {
      await answerCallbackQuery(token, callbackId, copy.callback_out_of_stock);
      return;
    }
  }

  // Create order
  const { data: order } = await (supabaseAdmin
    .from('orders') as any)
    .insert({
      bot_id: botId,
      menu_item_id: menuItemId,
      telegram_user_id: telegramUserId,
      telegram_username: telegramUsername,
      status: 'PENDING_PAYMENT',
    })
    .select()
    .single();

  // Set user state
  await setUserSession(telegramUserId, botId, {
    state: 'CONFIRMING_ORDER',
    order_id: (order as any)?.id,
    menu_item_id: menuItemId,
  });

  await answerCallbackQuery(token, callbackId);

  const keyboard = createConfirmOrderKeyboard(copy.button_confirm_pay, copy.button_cancel);

  const priceStr = formatCurrencyAmount(typedMenuItem.price, shopCurrency);
  const tmpl = copy.product_selected_message_html?.trim();
  const bodyHtml = tmpl
    ? applyBracketPlaceholders(tmpl, {
        ProductName: escapeHtml(typedMenuItem.name),
        Price: escapeHtml(priceStr),
      })
    : (() => {
        const pricePart =
          typedMenuItem.price > 0
            ? `\n${escapeHtml(copy.purchase_price_label)}: ${escapeHtml(priceStr)}`
            : '';
        return `<b>${escapeHtml(typedMenuItem.name)}</b>${pricePart}\n\n${copy.purchase_question}`;
      })();

  await sendMessage(token, chatId, bodyHtml, { parse_mode: 'HTML', reply_markup: keyboard });
}

async function handleConfirmOrder(
  token: string,
  chatId: number,
  botId: string,
  ownerUserId: string,
  telegramUserId: string,
  callbackId: string,
  copy: BotTelegramCopy,
  customerPaymentText: string
) {
  const session = await getUserSession(telegramUserId, botId);

  if (!session?.order_id || !session?.menu_item_id) {
    await answerCallbackQuery(token, callbackId, copy.callback_order_expired);
    return;
  }

  const { data: menuRow } = await (supabaseAdmin
    .from('menu_items') as any)
    .select('name, price')
    .eq('id', session.menu_item_id)
    .eq('bot_id', botId)
    .maybeSingle();

  const itemName = (menuRow as { name?: string } | null)?.name ?? 'Product';
  const itemPrice = Number((menuRow as { price?: number } | null)?.price ?? 0);
  const shopCurrency = await getShopCurrencyForBot(botId);
  const priceStr = formatCurrencyAmount(itemPrice, shopCurrency);
  const { data: botMeta } = await (supabaseAdmin.from('bots') as any)
    .select('bot_username')
    .eq('id', botId)
    .maybeSingle();
  const botUname = ((botMeta as { bot_username?: string } | null)?.bot_username ?? '') as string;
  const shopName = await getShopDisplayName(ownerUserId, botUname);

  const paymentIntroHtml = applyBracketPlaceholders(copy.payment_instruction_intro_html, {
    ProductName: escapeHtml(itemName),
    Price: escapeHtml(priceStr),
    ShopName: escapeHtml(shopName),
  });

  // Update order status
  await (supabaseAdmin
    .from('orders') as any)
    .update({ status: 'PENDING_PAYMENT' })
    .eq('id', session.order_id);

  // Update user state
  await setUserSession(telegramUserId, botId, {
    state: 'WAITING_FOR_SLIP',
    order_id: session.order_id,
    menu_item_id: session.menu_item_id,
  });

  await answerCallbackQuery(token, callbackId);

  const paymentText = customerPaymentText.trim();
  if (paymentText) {
    await sendCustomerPaymentInstructions(token, chatId, paymentText, paymentIntroHtml);
  }

  await sendMessage(token, chatId, copy.slip_request_html, { parse_mode: 'HTML' });
}

async function handleCancelOrder(
  token: string,
  chatId: number,
  botId: string,
  telegramUserId: string,
  callbackId: string,
  copy: BotTelegramCopy
) {
  const session = await getUserSession(telegramUserId, botId);

  if (session?.order_id) {
    // Delete the order
    await (supabaseAdmin
      .from('orders') as any)
      .delete()
      .eq('id', session.order_id);
  }

  // Clear user state
  await clearUserSession(telegramUserId, botId);

  await answerCallbackQuery(token, callbackId);

  await sendMessage(token, chatId, copy.order_cancelled, { parse_mode: 'HTML' });
}

async function handleSlipUpload(
  token: string,
  chatId: number,
  botId: string,
  telegramUserId: string,
  telegramUsername: string,
  photoFileId: string,
  session: UserSession,
  copy: BotTelegramCopy
) {
  if (!session.order_id) return;

  const { data: order } = await (supabaseAdmin
    .from('orders') as any)
    .select('id, status, bot_id')
    .eq('id', session.order_id)
    .eq('bot_id', botId)
    .single();

  if (!order) {
    await sendMessage(token, chatId, copy.slip_order_not_found, { parse_mode: 'HTML' });
    await clearUserSession(telegramUserId, botId);
    return;
  }

  const status = order.status as string;

  if (status !== 'PENDING_PAYMENT') {
    let msg: string;
    if (status === 'SLIP_SUBMITTED') {
      msg = copy.slip_already_received;
    } else if (status === 'COMPLETED' || status === 'APPROVED') {
      msg = copy.slip_order_completed;
    } else if (status === 'REJECTED') {
      msg = copy.slip_order_rejected;
    } else {
      msg = copy.slip_wrong_state;
    }
    await sendMessage(token, chatId, msg, { parse_mode: 'HTML' });
    await clearUserSession(telegramUserId, botId);
    return;
  }

  // Only one successful transition: burst uploads / parallel webhooks race here; losers get no row updated.
  const { data: updatedRows, error: updateError } = await (supabaseAdmin
    .from('orders') as any)
    .update({
      status: 'SLIP_SUBMITTED',
      slip_image_url: photoFileId,
      telegram_username: telegramUsername,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.order_id)
    .eq('status', 'PENDING_PAYMENT')
    .select('id');

  if (updateError) {
    console.error('[webhook] slip update failed:', updateError);
    await sendMessage(token, chatId, copy.slip_save_failed, { parse_mode: 'HTML' });
    return;
  }

  if (!updatedRows?.length) {
    await sendMessage(token, chatId, copy.slip_already_received, { parse_mode: 'HTML' });
    await clearUserSession(telegramUserId, botId);
    return;
  }

  await clearUserSession(telegramUserId, botId);

  const [{ data: miRow }, { data: botRow }] = await Promise.all([
    (supabaseAdmin.from('menu_items') as any)
      .select('name')
      .eq('id', session.menu_item_id)
      .eq('bot_id', botId)
      .maybeSingle(),
    (supabaseAdmin.from('bots') as any).select('user_id, bot_username').eq('id', botId).maybeSingle(),
  ]);

  const productName = (miRow as { name?: string } | null)?.name ?? 'Product';
  const customerLabel = telegramUsername ? `@${telegramUsername}` : 'Customer';
  const br = botRow as { user_id?: string; bot_username?: string } | null;
  const shopName =
    br?.user_id && br?.bot_username ? await getShopDisplayName(br.user_id, br.bot_username) : 'Shop';

  const thanksHtml = applyBracketPlaceholders(copy.slip_submitted_thanks_html, {
    ProductName: escapeHtml(productName),
    CustomerName: escapeHtml(customerLabel),
    ShopName: escapeHtml(shopName),
  });

  await sendMessage(token, chatId, thanksHtml, { parse_mode: 'HTML' });
}
