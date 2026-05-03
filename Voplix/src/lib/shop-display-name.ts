import { supabaseAdmin } from '@/lib/supabase/admin';

/** Shop label for customer-facing templates (bank copy, Telegram placeholders). */
export async function getShopDisplayName(ownerUserId: string, botUsername: string): Promise<string> {
  const { data } = await (supabaseAdmin.from('owner_profiles') as any)
    .select('business_name, display_name')
    .eq('user_id', ownerUserId)
    .maybeSingle();

  const row = data as { business_name?: string | null; display_name?: string | null } | null;
  const business = typeof row?.business_name === 'string' ? row.business_name.trim() : '';
  if (business) return business;
  const display = typeof row?.display_name === 'string' ? row.display_name.trim() : '';
  if (display) return display;
  const u = botUsername.replace(/^@/, '');
  return u ? `@${u}` : 'Shop';
}
