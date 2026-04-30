import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { getWebhookInfo } from '@/lib/telegram';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: bots } = await (supabaseAdmin as any)
    .from('bots')
    .select('id, bot_username, token_hash, token_encrypted, is_active')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const botHealth = await Promise.all(
    ((bots as any[]) || []).map(async (bot) => {
      const { count: menuCount } = await (supabaseAdmin as any)
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('bot_id', bot.id)
        .eq('is_active', true);

      try {
        const token = decrypt(bot.token_encrypted);
        const webhookInfo = await getWebhookInfo(token);

        return {
          botId: bot.id,
          username: bot.bot_username,
          isActive: bot.is_active,
          tokenHashPrefix: String(bot.token_hash || '').slice(0, 10),
          menuItemsActive: menuCount || 0,
          decryptOk: true,
          webhook: webhookInfo.ok ? webhookInfo.result : null,
          webhookError: webhookInfo.ok ? null : webhookInfo.error,
        };
      } catch (error) {
        return {
          botId: bot.id,
          username: bot.bot_username,
          isActive: bot.is_active,
          tokenHashPrefix: String(bot.token_hash || '').slice(0, 10),
          menuItemsActive: menuCount || 0,
          decryptOk: false,
          webhook: null,
          webhookError: error instanceof Error ? error.message : 'Unknown decrypt error',
        };
      }
    })
  );

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
    bots: botHealth,
    hint: 'If /start has no response: check decryptOk, webhook.url, and webhook.last_error_message for each bot.',
  });
}
