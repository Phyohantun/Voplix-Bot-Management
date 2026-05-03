import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { invalidateMaintenanceCache } from '@/lib/maintenance-cache';
import { fetchPlatformSubscriptionSettingsAdmin } from '@/lib/platform-subscription-settings-load';

const SETTINGS_ID = 'default';

export async function GET() {
  try {
    const s = await fetchPlatformSubscriptionSettingsAdmin();
    return NextResponse.json(s);
  } catch (e) {
    console.error('[GET /api/admin/subscription-settings]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const prev = await fetchPlatformSubscriptionSettingsAdmin();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const next = {
      id: SETTINGS_ID,
      bank_instructions_html:
        typeof body.bank_instructions_html === 'string' ? body.bank_instructions_html : prev.bank_instructions_html,
      maintenance_mode: typeof body.maintenance_mode === 'boolean' ? body.maintenance_mode : prev.maintenance_mode,
      price_pro_mmk_month:
        typeof body.price_pro_mmk_month === 'number' && Number.isFinite(body.price_pro_mmk_month)
          ? Math.max(0, Math.floor(body.price_pro_mmk_month))
          : prev.price_pro_mmk_month,
      price_plus_mmk_month:
        typeof body.price_plus_mmk_month === 'number' && Number.isFinite(body.price_plus_mmk_month)
          ? Math.max(0, Math.floor(body.price_plus_mmk_month))
          : prev.price_plus_mmk_month,
      subscription_period_days:
        typeof body.subscription_period_days === 'number' && Number.isFinite(body.subscription_period_days)
          ? Math.max(1, Math.min(3650, Math.floor(body.subscription_period_days)))
          : prev.subscription_period_days,
      override_max_bots_free: intOrUndef(body.override_max_bots_free, prev.override_max_bots_free),
      override_max_bots_pro: intOrUndef(body.override_max_bots_pro, prev.override_max_bots_pro),
      override_max_bots_plus: intOrUndef(body.override_max_bots_plus, prev.override_max_bots_plus),
      override_free_menu_item_cap: intOrUndef(body.override_free_menu_item_cap, prev.override_free_menu_item_cap),
      override_free_orders_per_month: intOrUndef(
        body.override_free_orders_per_month,
        prev.override_free_orders_per_month
      ),
      promptpay_qr_storage_path: prev.promptpay_qr_storage_path,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabaseAdmin.from('platform_subscription_settings') as any).upsert(next, {
      onConflict: 'id',
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (prev.maintenance_mode !== next.maintenance_mode) {
      invalidateMaintenanceCache();
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[PATCH /api/admin/subscription-settings]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function intOrUndef(v: unknown, prev: number | null): number | null {
  if (v === null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) {
    return Math.max(0, Math.floor(v));
  }
  if (typeof v === 'string' && v.trim() === '') return null;
  return prev;
}
