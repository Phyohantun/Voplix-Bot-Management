import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import {
  sendMessage,
  answerCallbackQuery,
  createMainMenuKeyboard,
  createConfirmOrderKeyboard,
  createPersistentMenuReplyKeyboard,
  TELEGRAM_REPLY_MENU_BUTTON_TEXT,
} from '@/lib/telegram';
import { getUserSession, setUserSession, clearUserSession, UserSession } from '@/lib/redis';

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

type MenuItemType = 'DIGITAL_DELIVERY' | 'MANUAL_DELIVERY' | 'MESSAGE_ONLY';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface MenuItemRecord {
  id: string;
  bot_id: string;
  name: string;
  price: number;
  type: MenuItemType;
  delivery_content: string | null;
  is_active: boolean;
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
      if (normalizedText === TELEGRAM_REPLY_MENU_BUTTON_TEXT) {
        await handleStart(token, chat.id, botId, telegramUserId);
        return NextResponse.json({ ok: true });
      }

      // Handle /start command (including deep-link payloads like /start ref123)
      if (lowerText.startsWith('/start')) {
        await handleStart(token, chat.id, botId, telegramUserId);
        return NextResponse.json({ ok: true });
      }

      // Handle /menu command
      if (lowerText === '/menu') {
        await handleStart(token, chat.id, botId, telegramUserId);
        return NextResponse.json({ ok: true });
      }

      // Handle /help command
      if (lowerText === '/help') {
        await sendMessage(
          token,
          chat.id,
          '<b>Available commands</b>\n\n/start - Show menu\n/menu - Show menu\n/help - Show this help message',
          { parse_mode: 'HTML' }
        );
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
          session
        );
        return NextResponse.json({ ok: true });
      }

      // Default response
      await handleStart(token, chat.id, botId, telegramUserId);
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
        await handleMenuSelection(token, chatId, botId, telegramUserId, telegramUsername, menuItemId, callbackId);
      } else if (data === 'confirm_order') {
        await handleConfirmOrder(token, chatId, botId, telegramUserId, callbackId);
      } else if (data === 'cancel_order') {
        await handleCancelOrder(token, chatId, botId, telegramUserId, callbackId);
      } else {
        await answerCallbackQuery(token, callbackId, 'Unknown action');
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

async function handleStart(token: string, chatId: number, botId: string, telegramUserId: string) {
  // Get menu items
  const { data: menuItems } = await (supabaseAdmin
    .from('menu_items') as any)
    .select('*')
    .eq('bot_id', botId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!menuItems || menuItems.length === 0) {
    await sendMessage(
      token,
      chatId,
      '<b>Welcome!</b>\n\nThere are no products in the menu yet. Please try again later.',
      { parse_mode: 'HTML' }
    );
    return;
  }

  const typedMenuItems = menuItems as MenuItemRecord[];

  const keyboard = createMainMenuKeyboard(
    typedMenuItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
    }))
  );

  const menuLines = typedMenuItems.map((item, index) => {
    const safe = escapeHtml(item.name);
    if (item.price > 0) {
      return `${index + 1}. ${safe} — ${item.price.toLocaleString()} THB`;
    }
    return `${index + 1}. ${safe}`;
  });

  const main = await sendMessage(
    token,
    chatId,
    `<b>Welcome!</b>\n\n<b>Your menu</b>\n${menuLines.join('\n')}\n\n<i>Tap a product button below to continue.</i>`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );

  if (!main.ok) {
    console.error('[webhook] sendMessage (menu) failed:', main.error);
  }

  const tip = await sendMessage(
    token,
    chatId,
    `<i>Tip: use ${escapeHtml(TELEGRAM_REPLY_MENU_BUTTON_TEXT)} or type /menu anytime to see this list again.</i>`,
    { parse_mode: 'HTML', reply_markup: createPersistentMenuReplyKeyboard() }
  );

  if (!tip.ok) {
    console.error('[webhook] sendMessage (reply keyboard) failed:', tip.error);
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
  callbackId: string
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
    await answerCallbackQuery(token, callbackId, 'Item not found');
    return;
  }

  const typedMenuItem = menuItem as MenuItemRecord;

  if (typedMenuItem.type === 'MESSAGE_ONLY') {
    await answerCallbackQuery(token, callbackId);

    const message = typedMenuItem.delivery_content?.trim() || 'Thank you for contacting us.';

    await sendMessage(
      token,
      chatId,
      `<b>${typedMenuItem.name}</b>\n\n${message}`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Check stock for digital delivery
  if (typedMenuItem.type === 'DIGITAL_DELIVERY') {
    const { count } = await (supabaseAdmin
      .from('stock_items') as any)
      .select('*', { count: 'exact', head: true })
      .eq('menu_item_id', menuItemId)
      .eq('is_sold', false);

    if (!count || count === 0) {
      await answerCallbackQuery(token, callbackId, 'This item is out of stock');
      await sendMessage(token, chatId, 'Sorry, this item is currently out of stock.');
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

  const keyboard = createConfirmOrderKeyboard();

  await sendMessage(
    token,
    chatId,
    `<b>${typedMenuItem.name}</b>${typedMenuItem.price > 0 ? `\nPrice: ${typedMenuItem.price.toLocaleString()} THB` : ''}\n\nWould you like to purchase this item?`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
}

async function handleConfirmOrder(
  token: string,
  chatId: number,
  botId: string,
  telegramUserId: string,
  callbackId: string
) {
  const session = await getUserSession(telegramUserId, botId);

  if (!session?.order_id || !session?.menu_item_id) {
    await answerCallbackQuery(token, callbackId, 'Order expired');
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

  await sendMessage(
    token,
    chatId,
    'Please upload your payment slip.\n\nSupported payment methods:\n- Bank Transfer\n- QR Code Payment',
    { parse_mode: 'HTML' }
  );
}

async function handleCancelOrder(
  token: string,
  chatId: number,
  botId: string,
  telegramUserId: string,
  callbackId: string
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

  await sendMessage(
    token,
    chatId,
    'Order cancelled. Use /start to browse the menu again.',
    { parse_mode: 'HTML' }
  );
}

async function handleSlipUpload(
  token: string,
  chatId: number,
  botId: string,
  telegramUserId: string,
  telegramUsername: string,
  photoFileId: string,
  session: UserSession
) {
  if (!session.order_id) return;

  // Get order details
  const { data: order } = await (supabaseAdmin
    .from('orders') as any)
    .select('*, menu_items(*)')
    .eq('id', session.order_id)
    .single();

  if (!order) return;

  // Update order with slip and status
  await (supabaseAdmin
    .from('orders') as any)
    .update({
      status: 'SLIP_SUBMITTED',
      slip_image_url: photoFileId,
      telegram_username: telegramUsername,
    })
    .eq('id', session.order_id);

  // Clear user state
  await clearUserSession(telegramUserId, botId);

  await sendMessage(
    token,
    chatId,
    '<b>Thank you!</b>\n\nYour payment slip has been submitted. We will verify it shortly and send your order.',
    { parse_mode: 'HTML' }
  );
}
