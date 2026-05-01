import { supabaseAdmin } from '@/lib/supabase/admin';
import { parsePreferredCurrency, type ShopCurrency } from '@/lib/currency';

/** Resolves display currency from the bot owner’s auth user_metadata (preferred_currency). */
export async function getShopCurrencyForBot(botId: string): Promise<ShopCurrency> {
  const { data: bot } = await (supabaseAdmin as any)
    .from('bots')
    .select('user_id')
    .eq('id', botId)
    .maybeSingle();

  if (!bot?.user_id) return 'THB';

  const { data: authData, error } = await supabaseAdmin.auth.admin.getUserById(bot.user_id);
  if (error || !authData?.user) return 'THB';

  return parsePreferredCurrency(authData.user.user_metadata?.preferred_currency);
}
