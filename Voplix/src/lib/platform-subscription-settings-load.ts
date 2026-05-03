import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type PlatformSubscriptionSettingsAdmin = {
  id: string;
  bank_instructions_html: string;
  maintenance_mode: boolean;
  price_pro_mmk_month: number;
  price_plus_mmk_month: number;
  subscription_period_days: number;
  promptpay_qr_storage_path: string | null;
  override_max_bots_free: number | null;
  override_max_bots_pro: number | null;
  override_max_bots_plus: number | null;
  override_free_menu_item_cap: number | null;
  override_free_orders_per_month: number | null;
};

const DEFAULTS: Omit<PlatformSubscriptionSettingsAdmin, 'id'> = {
  bank_instructions_html: '',
  maintenance_mode: false,
  price_pro_mmk_month: 45000,
  price_plus_mmk_month: 65000,
  subscription_period_days: 30,
  promptpay_qr_storage_path: null,
  override_max_bots_free: null,
  override_max_bots_pro: null,
  override_max_bots_plus: null,
  override_free_menu_item_cap: null,
  override_free_orders_per_month: null,
};

function normalizeRow(data: Record<string, unknown> | null): PlatformSubscriptionSettingsAdmin {
  if (!data) {
    return { id: 'default', ...DEFAULTS };
  }
  return {
    id: String(data.id ?? 'default'),
    bank_instructions_html: typeof data.bank_instructions_html === 'string' ? data.bank_instructions_html : '',
    maintenance_mode: Boolean(data.maintenance_mode),
    price_pro_mmk_month: Number.isFinite(Number(data.price_pro_mmk_month))
      ? Math.max(0, Math.floor(Number(data.price_pro_mmk_month)))
      : DEFAULTS.price_pro_mmk_month,
    price_plus_mmk_month: Number.isFinite(Number(data.price_plus_mmk_month))
      ? Math.max(0, Math.floor(Number(data.price_plus_mmk_month)))
      : DEFAULTS.price_plus_mmk_month,
    subscription_period_days: Number.isFinite(Number(data.subscription_period_days))
      ? Math.max(1, Math.min(3650, Math.floor(Number(data.subscription_period_days))))
      : DEFAULTS.subscription_period_days,
    promptpay_qr_storage_path:
      typeof data.promptpay_qr_storage_path === 'string' && data.promptpay_qr_storage_path.trim()
        ? data.promptpay_qr_storage_path.trim()
        : null,
    override_max_bots_free: numOrNull(data.override_max_bots_free),
    override_max_bots_pro: numOrNull(data.override_max_bots_pro),
    override_max_bots_plus: numOrNull(data.override_max_bots_plus),
    override_free_menu_item_cap: numOrNull(data.override_free_menu_item_cap),
    override_free_orders_per_month: numOrNull(data.override_free_orders_per_month),
  };
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Cached per request in RSC; API routes should call `fetchPlatformSubscriptionSettingsAdmin` instead. */
export const getPlatformSubscriptionSettingsAdmin = cache(async (): Promise<PlatformSubscriptionSettingsAdmin> => {
  return fetchPlatformSubscriptionSettingsAdmin();
});

export async function fetchPlatformSubscriptionSettingsAdmin(): Promise<PlatformSubscriptionSettingsAdmin> {
  const { data, error } = await (supabaseAdmin.from('platform_subscription_settings') as any)
    .select(
      'id, bank_instructions_html, maintenance_mode, price_pro_mmk_month, price_plus_mmk_month, subscription_period_days, promptpay_qr_storage_path, override_max_bots_free, override_max_bots_pro, override_max_bots_plus, override_free_menu_item_cap, override_free_orders_per_month'
    )
    .eq('id', 'default')
    .maybeSingle();

  if (error) {
    console.warn('[platform_subscription_settings]', error.message);
    return { id: 'default', ...DEFAULTS };
  }
  return normalizeRow(data as Record<string, unknown> | null);
}
