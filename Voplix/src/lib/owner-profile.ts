import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type OwnerProfileLayout = {
  display_name: string | null;
  business_name: string | null;
  avatar_data_url: string | null;
  notification_last_seen_at: string | null;
};

export const getOwnerProfileForLayout = cache(async (userId: string): Promise<OwnerProfileLayout | null> => {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('owner_profiles')
    .select('display_name, business_name, avatar_data_url, notification_last_seen_at')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as OwnerProfileLayout) ?? null;
});
