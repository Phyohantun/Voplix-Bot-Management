import { supabaseAdmin } from '@/lib/supabase/admin';

let cached: { on: boolean; at: number } | null = null;
const TTL_MS = 5000;

export function invalidateMaintenanceCache() {
  cached = null;
}

/** Short-TTL read for middleware — avoids hitting DB on every request. */
export async function readMaintenanceModeOn(): Promise<boolean> {
  if (cached && Date.now() - cached.at < TTL_MS) {
    return cached.on;
  }
  try {
    const { data, error } = await (supabaseAdmin.from('platform_subscription_settings') as any)
      .select('maintenance_mode')
      .eq('id', 'default')
      .maybeSingle();
    if (error) {
      return false;
    }
    const on = Boolean((data as { maintenance_mode?: boolean } | null)?.maintenance_mode);
    cached = { on, at: Date.now() };
    return on;
  } catch {
    return false;
  }
}
