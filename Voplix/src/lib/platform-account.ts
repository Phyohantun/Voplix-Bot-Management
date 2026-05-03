import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type PlatformAccountRow = {
  user_id: string;
  account_status: 'pending' | 'active' | 'suspended';
  plan_tier: 'free' | 'pro' | 'plus';
  subscription_period_end: string | null;
  can_use_broadcast: boolean;
  can_use_stock: boolean;
  can_use_orders: boolean;
  admin_notes: string | null;
};

export const getPlatformAccountForUser = cache(async (userId: string): Promise<PlatformAccountRow | null> => {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('platform_accounts')
    .select(
      'user_id, account_status, plan_tier, subscription_period_end, can_use_broadcast, can_use_stock, can_use_orders, admin_notes'
    )
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[platform_accounts]', error.message);
    return null;
  }
  return (data as PlatformAccountRow) ?? null;
});
