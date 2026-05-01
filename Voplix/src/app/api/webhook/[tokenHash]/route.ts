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
  mergeBotTelegramCopy,
  telegramHtmlToPlain,
  escapeHtml,
  type BotTelegramCopy,
} from '@/lib/bot-telegram-copy';

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tokenHash: string }> }
) {
  try {
    const { tokenHash } = await params;
    const update: TelegramUpdate = await request.json();

    console.log('[webhook] hit', {
      tokenHash: tokenHash.slice(0, 8),
      hasMessage: !!update.message,
      text: update.message?.text,
      hasCallback: !!update.callback_query,
    });

    // Find bot by token hash
    const { data: bot, error: botError } = await (supabaseAdmin
      .from('bots') as any)
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .single();

    if (botError || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    const token = decrypt((bot as any).token_encrypted);
    const botId = (bot as any).id;
    const copy = mergeBotTelegramCopy((bot as any).telegram_customer_copy);

    // Handle message
    if (update.message) {
      const { from, chat, text, photo } = update.message;
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
          telegramUserId,
          telegramUsername,
          menuItemId,
          callbackId,
          copy
        );
      } else if (data === 'confirm_order') {
        await handleConfirmOrder(token, chatId, botId, telegramUserId, callbackId, copy);
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

  const pricePart =
    typedMenuItem.price > 0
      ? `\n${escapeHtml(copy.purchase_price_label)}: ${escapeHtml(formatCurrencyAmount(typedMenuItem.price, shopCurrency))}`
      : '';

  await sendMessage(
    token,
    chatId,
    `<b>${escapeHtml(typedMenuItem.name)}</b>${pricePart}\n\n${copy.purchase_question}`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
}

async function handleConfirmOrder(
  token: string,
  chatId: number,
  botId: string,
  telegramUserId: string,
  callbackId: string,
  copy: BotTelegramCopy
) {
  const session = await getUserSession(telegramUserId, botId);

  if (!session?.order_id || !session?.menu_item_id) {
    await answerCallbackQuery(token, callbackId, copy.callback_order_expired);
    return;
  }

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

  await sendMessage(token, chatId, copy.slip_submitted_thanks_html, { parse_mode: 'HTML' });
}
