import { supabaseAdmin } from '@/lib/supabase/admin';

export type PlanTier = 'free' | 'pro' | 'plus';

const BOTS_BY_PLAN: Record<PlanTier, number> = { free: 1, pro: 2, plus: 5 };
const FREE_MENU_ITEM_CAP = 5;
const FREE_ORDERS_PER_MONTH = 50;

export function normalizePlanTier(v: string | null | undefined): PlanTier {
  const x = String(v || 'free').toLowerCase();
  if (x === 'pro' || x === 'plus') return x;
  return 'free';
}

export type PlatformAccountFlags = {
  account_status: string;
  plan_tier: PlanTier;
  can_use_broadcast: boolean;
  can_use_stock: boolean;
  can_use_orders: boolean;
};

export async function loadPlatformAccountFlagsAdmin(userId: string): Promise<PlatformAccountFlags> {
  const { data } = await (supabaseAdmin.from('platform_accounts') as any)
    .select('account_status, plan_tier, can_use_broadcast, can_use_stock, can_use_orders')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    return {
      account_status: 'active',
      plan_tier: 'free',
      can_use_broadcast: false,
      can_use_stock: true,
      can_use_orders: true,
    };
  }

  return {
    account_status: (data.account_status as string) || 'active',
    plan_tier: normalizePlanTier(data.plan_tier as string),
    can_use_broadcast: Boolean(data.can_use_broadcast),
    can_use_stock: data.can_use_stock !== false,
    can_use_orders: data.can_use_orders !== false,
  };
}

export function maxBotsForPlan(plan: PlanTier): number {
  return BOTS_BY_PLAN[plan];
}

export function maxActiveMenuItemsForPlan(plan: PlanTier): number | null {
  return plan === 'free' ? FREE_MENU_ITEM_CAP : null;
}

export function maxOrdersPerMonthForPlan(plan: PlanTier): number | null {
  return plan === 'free' ? FREE_ORDERS_PER_MONTH : null;
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
  plan: PlanTier;
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
  const [flags, activeBots, activeMenuItems, ordersThisMonth] = await Promise.all([
    loadPlatformAccountFlagsAdmin(userId),
    countActiveBotsForUser(userId),
    countActiveMenuItemsForUser(userId),
    countOrdersThisUtcMonthForUser(userId),
  ]);

  const plan = flags.plan_tier;
  const suspended = flags.account_status === 'suspended';
  const maxBots = maxBotsForPlan(plan);
  const maxMenu = maxActiveMenuItemsForPlan(plan);
  const maxOrd = maxOrdersPerMonthForPlan(plan);

  return {
    plan,
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
  const flags = await loadPlatformAccountFlagsAdmin(userId);
  if (flags.account_status === 'suspended') {
    return { ok: false, message: 'Your account is suspended.' };
  }
  const max = maxBotsForPlan(flags.plan_tier);
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
  const flags = await loadPlatformAccountFlagsAdmin(userId);
  if (flags.account_status === 'suspended') {
    return { ok: false, message: 'Your account is suspended.' };
  }
  if (itemType === 'DIGITAL_DELIVERY' && !planAllowsAutomatedDelivery(flags.plan_tier)) {
    return {
      ok: false,
      message: 'Auto delivery (digital) products require Pro or Plus. Use manual delivery on Free, or upgrade.',
    };
  }
  const cap = maxActiveMenuItemsForPlan(flags.plan_tier);
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
  if (flags.plan_tier !== 'plus') {
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
  if (!planAllowsStockManagement(flags.plan_tier, flags.can_use_stock)) {
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
  const flags = await loadPlatformAccountFlagsAdmin(ownerUserId);
  if (flags.account_status === 'suspended') {
    return { ok: false, code: 'suspended', message: 'Shop is unavailable.' };
  }
  if (!flags.can_use_orders) {
    return { ok: false, code: 'orders_disabled', message: 'Orders are disabled for this shop.' };
  }
  const maxOrd = maxOrdersPerMonthForPlan(flags.plan_tier);
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
    if (!planAllowsAutomatedDelivery(flags.plan_tier)) {
      return {
        ok: false,
        code: 'digital_blocked',
        message: 'This product is not available on the seller’s current plan.',
      };
    }
    if (!planAllowsStockManagement(flags.plan_tier, flags.can_use_stock)) {
      return {
        ok: false,
        code: 'digital_blocked',
        message: 'This digital product is temporarily unavailable.',
      };
    }
  }
  return { ok: true };
}
