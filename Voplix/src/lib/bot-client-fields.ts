/**
 * Columns from `bots` that are safe to serialize to the browser (RSC props, JSON API).
 * Never include `token_encrypted` or `token_hash` — those enable account / webhook takeover.
 */
export const BOT_SELECT_SAFE =
  'id, bot_username, created_at, updated_at, is_active, webhook_set, start_welcome_message, start_show_menu_only, start_show_tip, telegram_customer_copy' as const;

export function stripBotSecrets<T extends Record<string, unknown>>(row: T): Omit<T, 'token_encrypted' | 'token_hash'> {
  const { token_encrypted: _e, token_hash: _h, ...rest } = row as T & {
    token_encrypted?: unknown;
    token_hash?: unknown;
  };
  return rest as Omit<T, 'token_encrypted' | 'token_hash'>;
}
