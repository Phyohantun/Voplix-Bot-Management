const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export async function validateBotToken(token: string): Promise<{ ok: boolean; result?: { username: string }; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/getMe`);
    const data = await response.json();
    
    if (data.ok) {
      return {
        ok: true,
        result: {
          username: data.result.username,
        },
      };
    }
    
    return { ok: false, error: 'Invalid token' };
  } catch (error) {
    return { ok: false, error: 'Failed to validate token' };
  }
}

export async function setWebhook(token: string, webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
      }),
    });
    
    const data = await response.json();
    
    if (data.ok) {
      return { ok: true };
    }
    
    return { ok: false, error: data.description || 'Failed to set webhook' };
  } catch (error) {
    return { ok: false, error: 'Failed to set webhook' };
  }
}

export async function deleteWebhook(token: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/deleteWebhook`, {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (data.ok) {
      return { ok: true };
    }
    
    return { ok: false, error: data.description || 'Failed to delete webhook' };
  } catch (error) {
    return { ok: false, error: 'Failed to delete webhook' };
  }
}

export interface TelegramWebhookInfo {
  url: string;
  pending_update_count: number;
  last_error_message?: string;
  last_error_date?: number;
}

export async function getWebhookInfo(
  token: string
): Promise<{ ok: boolean; result?: TelegramWebhookInfo; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/getWebhookInfo`);
    const data = await response.json();

    if (data.ok) {
      return { ok: true, result: data.result as TelegramWebhookInfo };
    }

    return { ok: false, error: data.description || 'Failed to get webhook info' };
  } catch {
    return { ok: false, error: 'Failed to get webhook info' };
  }
}

export async function sendMessage(
  token: string,
  chatId: string | number,
  text: string,
  options?: {
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    reply_markup?: object;
  }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...options,
      }),
    });
    
    const data = await response.json();
    
    if (data.ok) {
      return { ok: true };
    }
    
    return { ok: false, error: data.description || 'Failed to send message' };
  } catch (error) {
    return { ok: false, error: 'Failed to send message' };
  }
}

export async function sendPhoto(
  token: string,
  chatId: string | number,
  photoUrl: string,
  caption?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
      }),
    });
    
    const data = await response.json();
    
    if (data.ok) {
      return { ok: true };
    }
    
    return { ok: false, error: data.description || 'Failed to send photo' };
  } catch (error) {
    return { ok: false, error: 'Failed to send photo' };
  }
}

/** Fetches file bytes from Telegram (server-side only; avoids exposing bot token in browser URLs). */
export async function fetchTelegramFile(
  token: string,
  fileId: string
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const getFileRes = await fetch(`${TELEGRAM_API_BASE}${token}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });
  const getFileData = await getFileRes.json();

  if (!getFileData.ok || !getFileData.result?.file_path) {
    return null;
  }

  const filePath = getFileData.result.file_path as string;
  const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
  const fileRes = await fetch(fileUrl);

  if (!fileRes.ok) {
    return null;
  }

  const contentType = fileRes.headers.get('Content-Type') || 'application/octet-stream';
  const body = await fileRes.arrayBuffer();
  return { body, contentType };
}

export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
    
    const data = await response.json();
    
    if (data.ok) {
      return { ok: true };
    }
    
    return { ok: false, error: data.description || 'Failed to answer callback' };
  } catch (error) {
    return { ok: false, error: 'Failed to answer callback' };
  }
}

/** Reply keyboard label — must match webhook handler for the same string. */
export const TELEGRAM_REPLY_MENU_BUTTON_TEXT = '📋 Browse menu';

/** Persistent bottom keyboard so users can reopen the catalog without typing /menu. */
export function createPersistentMenuReplyKeyboard() {
  return {
    keyboard: [[{ text: TELEGRAM_REPLY_MENU_BUTTON_TEXT }]],
    resize_keyboard: true,
  };
}

/** Telegram inline button labels are limited (~64 chars); long names break the keyboard. */
function truncateTelegramButtonLabel(text: string, maxChars = 58): string {
  const chars = [...text];
  if (chars.length <= maxChars) return text;
  return `${chars.slice(0, maxChars - 1).join('')}…`;
}

export function createMainMenuKeyboard(menuItems: Array<{ id: string; name: string; price: number }>) {
  const buttons = menuItems.map((item) => {
    const label =
      item.price > 0
        ? `${item.name} · ${item.price.toLocaleString()} THB`
        : item.name;
    return [
      {
        text: truncateTelegramButtonLabel(label),
        callback_data: `menu_${item.id}`,
      },
    ];
  });

  return {
    inline_keyboard: buttons,
  };
}

export function createConfirmOrderKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✅ Confirm & Pay', callback_data: 'confirm_order' },
        { text: '❌ Cancel', callback_data: 'cancel_order' },
      ],
    ],
  };
}
