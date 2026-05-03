import { supabaseAdmin } from '@/lib/supabase/admin';
import type { PlatformSubscriptionSettingsAdmin } from '@/lib/platform-subscription-settings-load';
import { fetchPlatformSubscriptionSettingsAdmin } from '@/lib/platform-subscription-settings-load';

export type PlanTier = 'free' | 'pro' | 'plus';

const BOTS_BY_PLAN_DEFAULT: Record<PlanTier, number> = { free: 1, pro: 2, plus: 5 };
const FREE_MENU_ITEM_CAP_DEFAULT = 5;
const FREE_ORDERS_PER_MONTH_DEFAULT = 50;

export function normalizePlanTier(v: string | null | undefined): PlanTier {
  const x = String(v || 'free').toLowerCase();
  if (x === 'pro' || x === 'plus') return x;
  return 'free';
}

export type PlatformAccountFlags = {
  account_status: string;
  plan_tier: PlanTier;
  subscription_period_end: string | null;
  can_use_broadcast: boolean;
  can_use_stock: boolean;
  can_use_orders: boolean;
};

export function effectivePlanTier(plan: PlanTier, subscriptionPeriodEnd: string | null): PlanTier {
  if (plan === 'free') return 'free';
  if (!subscriptionPeriodEnd) return plan;
  return new Date(subscriptionPeriodEnd) > new Date() ? plan : 'free';
}

export async function loadPlatformAccountFlagsAdmin(userId: string): Promise<PlatformAccountFlags> {
  const { data } = await (supabaseAdmin.from('platform_accounts') as any)
    .select('account_status, plan_tier, subscription_period_end, can_use_broadcast, can_use_stock, can_use_orders')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    return {
      account_status: 'active',
      plan_tier: 'free',
      subscription_period_end: null,
      can_use_broadcast: false,
      can_use_stock: true,
      can_use_orders: true,
    };
  }

  const endRaw = (data as { subscription_period_end?: string | null }).subscription_period_end;
  return {
    account_status: (data.account_status as string) || 'active',
    plan_tier: normalizePlanTier(data.plan_tier as string),
    subscription_period_end: typeof endRaw === 'string' && endRaw.trim() ? endRaw : null,
    can_use_broadcast: Boolean(data.can_use_broadcast),
    can_use_stock: data.can_use_stock !== false,
    can_use_orders: data.can_use_orders !== false,
  };
}

function maxBotsFromSettings(plan: PlanTier, s: PlatformSubscriptionSettingsAdmin): number {
  const o =
    plan === 'free'
      ? s.override_max_bots_free
      : plan === 'pro'
        ? s.override_max_bots_pro
        : s.override_max_bots_plus;
  if (o != null && Number.isFinite(o) && o >= 0) return Math.min(1000, Math.floor(o));
  return BOTS_BY_PLAN_DEFAULT[plan];
}

export function maxBotsForPlan(plan: PlanTier): number {
  return BOTS_BY_PLAN_DEFAULT[plan];
}

export function maxBotsForPlanWithSettings(plan: PlanTier, s: PlatformSubscriptionSettingsAdmin): number {
  return maxBotsFromSettings(plan, s);
}

export function maxActiveMenuItemsForPlan(plan: PlanTier): number | null {
  return plan === 'free' ? FREE_MENU_ITEM_CAP_DEFAULT : null;
}

export function maxActiveMenuItemsForPlanWithSettings(plan: PlanTier, s: PlatformSubscriptionSettingsAdmin): number | null {
  if (plan !== 'free') return null;
  if (s.override_free_menu_item_cap != null && Number.isFinite(s.override_free_menu_item_cap)) {
    return Math.min(1_000_000, Math.max(0, Math.floor(s.override_free_menu_item_cap)));
  }
  return FREE_MENU_ITEM_CAP_DEFAULT;
}

export function maxOrdersPerMonthForPlan(plan: PlanTier): number | null {
  return plan === 'free' ? FREE_ORDERS_PER_MONTH_DEFAULT : null;
}

export function maxOrdersPerMonthForPlanWithSettings(plan: PlanTier, s: PlatformSubscriptionSettingsAdmin): number | null {
  if (plan !== 'free') return null;
  if (s.override_free_orders_per_month != null && Number.isFinite(s.override_free_orders_per_month)) {
    return Math.min(1_000_000, Math.max(0, Math.floor(s.override_free_orders_per_month)));
  }
  return FREE_ORDERS_PER_MONTH_DEFAULT;
}

export function planAllowsAutomatedDelivery(plan: PlanTier): boolean {
  return plan !== 'free';
}

export function planAllowsStockManagement(plan: PlanTier, canUseStock: boolean): boolean {
  return plan !== 'free' && canUseStock;
}

export function planAllowsBroadcast(plan: PlanTier, canUseBroadcast: boolean): boolean {
  return plan === 'plus' && canUseBroadcast;
}

export async function countActiveBotsForUser(userId: string): Promise<number> {
  const { count, error } = await (supabaseAdmin.from('bots') as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error) throw error;
  return count ?? 0;
}

export async function countActiveMenuItemsForUser(userId: string): Promise<number> {
  const { data: bots, error: bErr } = await (supabaseAdmin.from('bots') as any)
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (bErr) throw bErr;
  const ids = ((bots as { id: string }[]) ?? []).map((b) => b.id);
  if (ids.length === 0) return 0;

  const { count, error } = await (supabaseAdmin.from('menu_items') as any)
    .select('*', { count: 'exact', head: true })
    .in('bot_id', ids)
    .eq('is_active', true);
  if (error) throw error;
  return count ?? 0;
}

function startOfUtcMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString();
}

export async function countOrdersThisUtcMonthForUser(userId: string): Promise<number> {
  const { data: bots, error: bErr } = await (supabaseAdmin.from('bots') as any)
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (bErr) throw bErr;
  const ids = ((bots as { id: string }[]) ?? []).map((b) => b.id);
  if (ids.length === 0) return 0;

  const start = startOfUtcMonthIso();
  const { count, error } = await (supabaseAdmin.from('orders') as any)
    .select('*', { count: 'exact', head: true })
    .in('bot_id', ids)
    .gte('created_at', start);
  if (error) throw error;
  return count ?? 0;
}

export type PlanEnforcementSnapshot = {
  /** Effective tier for limits (paid plan lapses to Free when `subscription_period_end` is in the past). */
  plan: PlanTier;
  stored_plan_tier: PlanTier;
  subscription_period_end: string | null;
  paid_period_lapsed: boolean;
  account_status: string;
  maxBots: number;
  activeBots: number;
  canAddBot: boolean;
  maxMenuItems: number | null;
  activeMenuItems: number;
  canAddMenuItem: boolean;
  maxOrdersPerMonth: number | null;
  ordersThisMonth: number;
  canAcceptMoreOrdersThisMonth: boolean;
  canUseBroadcast: boolean;
  canUseStockManagement: boolean;
  canCreateDigitalProduct: boolean;
};

export async function getPlanEnforcementSnapshot(userId: string): Promise<PlanEnforcementSnapshot> {
  const [flags, settings, activeBots, activeMenuItems, ordersThisMonth] = await Promise.all([
    loadPlatformAccountFlagsAdmin(userId),
    fetchPlatformSubscriptionSettingsAdmin(),
    countActiveBotsForUser(userId),
    countActiveMenuItemsForUser(userId),
    countOrdersThisUtcMonthForUser(userId),
  ]);

  const stored = flags.plan_tier;
  const plan = effectivePlanTier(stored, flags.subscription_period_end);
  const suspended = flags.account_status === 'suspended';
  const maxBots = maxBotsForPlanWithSettings(plan, settings);
  const maxMenu = maxActiveMenuItemsForPlanWithSettings(plan, settings);
  const maxOrd = maxOrdersPerMonthForPlanWithSettings(plan, settings);

  return {
    plan,
    stored_plan_tier: stored,
    subscription_period_end: flags.subscription_period_end,
    paid_period_lapsed: stored !== 'free' && plan === 'free',
    account_status: flags.account_status,
    maxBots,
    activeBots,
    canAddBot: !suspended && activeBots < maxBots,
    maxMenuItems: maxMenu,
    activeMenuItems,
    canAddMenuItem: !suspended && (maxMenu == null || activeMenuItems < maxMenu),
    maxOrdersPerMonth: maxOrd,
    ordersThisMonth,
    canAcceptMoreOrdersThisMonth: !suspended && flags.can_use_orders && (maxOrd == null || ordersThisMonth < maxOrd),
    canUseBroadcast: !suspended && planAllowsBroadcast(plan, flags.can_use_broadcast),
    canUseStockManagement: !suspended && planAllowsStockManagement(plan, flags.can_use_stock),
    canCreateDigitalProduct: !suspended && planAllowsAutomatedDelivery(plan),
  };
}

export async function checkCanInsertNewBot(userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const [flags, settings] = await Promise.all([
    loadPlatformAccountFlagsAdmin(userId),
    fetchPlatformSubscriptionSettingsAdmin(),
  ]);
  if (flags.account_status === 'suspended') {
    return { ok: false, message: 'Your account is suspended.' };
  }
  const plan = effectivePlanTier(flags.plan_tier, flags.subscription_period_end);
  const max = maxBotsForPlanWithSettings(plan, settings);
  const n = await countActiveBotsForUser(userId);
  if (n >= max) {
    return {
      ok: false,
      message: `Your plan allows up to ${max} active bot(s). Upgrade on Subscription or remove a bot to add another.`,
    };
  }
  return { ok: true };
}

export async function checkCanCreateMenuItem(
  userId: string,
  itemType: 'DIGITAL_DELIVERY' | 'MANUAL_DELIVERY'
): Promise<{ ok: true } | { ok: false; message: string }> {
  const [flags, settings] = await Promise.all([
    loadPlatformAccountFlagsAdmin(userId),
    fetchPlatformSubscriptionSettingsAdmin(),
  ]);
  if (flags.account_status === 'suspended') {
    return { ok: false, message: 'Your account is suspended.' };
  }
  const plan = effectivePlanTier(flags.plan_tier, flags.subscription_period_end);
  if (itemType === 'DIGITAL_DELIVERY' && !planAllowsAutomatedDelivery(plan)) {
    return {
      ok: false,
      message: 'Auto delivery (digital) products require Pro or Plus. Use manual delivery on Free, or upgrade.',
    };
  }
  const cap = maxActiveMenuItemsForPlanWithSettings(plan, settings);
  if (cap != null) {
    const c = await countActiveMenuItemsForUser(userId);
    if (c >= cap) {
      return {
        ok: false,
        message: `Free plan includes up to ${cap} products across all bots. Upgrade to add more.`,
      };
    }
  }
  return { ok: true };
}

export async function checkBroadcastAllowed(userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const flags = await loadPlatformAccountFlagsAdmin(userId);
  if (flags.account_status === 'suspended') {
    return { ok: false, message: 'Your account cannot use this feature.' };
  }
  const plan = effectivePlanTier(flags.plan_tier, flags.subscription_period_end);
  if (plan !== 'plus') {
    return {
      ok: false,
      message: 'Broadcast is available on the Plus plan only. Upgrade on Subscription.',
    };
  }
  if (!flags.can_use_broadcast) {
    return { ok: false, message: 'Broadcast is disabled for your account.' };
  }
  return { ok: true };
}

export async function checkStockItemAllowed(userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const flags = await loadPlatformAccountFlagsAdmin(userId);
  if (flags.account_status === 'suspended') {
    return { ok: false, message: 'Your account is suspended.' };
  }
  const plan = effectivePlanTier(flags.plan_tier, flags.subscription_period_end);
  if (!planAllowsStockManagement(plan, flags.can_use_stock)) {
    return {
      ok: false,
      message: 'Stock management requires Pro or Plus. Upgrade on Subscription.',
    };
  }
  return { ok: true };
}

export type OrderCreationCheck = { ok: true } | { ok: false; code: 'suspended' | 'orders_disabled' | 'monthly_cap' | 'digital_blocked'; message: string };

export async function checkOrderCreationAllowed(
  ownerUserId: string,
  menuItemType: string
): Promise<OrderCreationCheck> {
  const [flags, settings] = await Promise.all([
    loadPlatformAccountFlagsAdmin(ownerUserId),
    fetchPlatformSubscriptionSettingsAdmin(),
  ]);
  if (flags.account_status === 'suspended') {
    return { ok: false, code: 'suspended', message: 'Shop is unavailable.' };
  }
  if (!flags.can_use_orders) {
    return { ok: false, code: 'orders_disabled', message: 'Orders are disabled for this shop.' };
  }
  const plan = effectivePlanTier(flags.plan_tier, flags.subscription_period_end);
  const maxOrd = maxOrdersPerMonthForPlanWithSettings(plan, settings);
  if (maxOrd != null) {
    const n = await countOrdersThisUtcMonthForUser(ownerUserId);
    if (n >= maxOrd) {
      return {
        ok: false,
        code: 'monthly_cap',
        message: 'This shop has reached its monthly order limit. Try again next month or contact the seller.',
      };
    }
  }
  if (menuItemType === 'DIGITAL_DELIVERY') {
    if (!planAllowsAutomatedDelivery(plan)) {
      return {
        ok: false,
        code: 'digital_blocked',
        message: 'This product is not available on the seller’s current plan.',
      };
    }
    if (!planAllowsStockManagement(plan, flags.can_use_stock)) {
      return {
        ok: false,
        code: 'digital_blocked',
        message: 'This digital product is temporarily unavailable.',
      };
    }
  }
  return { ok: true };
}
