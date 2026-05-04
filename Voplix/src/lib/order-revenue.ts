/** PostgREST may return `menu_items` as an object or a one-element array for the same FK embed. */
function menuPriceFromOrderRowEmbed(menu_items: unknown): number | null {
  if (menu_items == null) return null;
  const first = Array.isArray(menu_items) ? menu_items[0] : menu_items;
  if (!first || typeof first !== 'object') return null;
  const p = (first as { price?: number | string | null }).price;
  if (p == null || p === '') return null;
  const n = Number(p);
  return Number.isFinite(n) ? roundMoney(n) : null;
}

/** Revenue counted for dashboards: stored snapshot, else live menu price from embed. */
export function revenueAmountFromOrderRow(row: {
  revenue_amount?: number | string | null;
  menu_items?: unknown;
}): number {
  const ra = row.revenue_amount;
  if (ra != null && ra !== '') {
    const n = Number(ra);
    if (Number.isFinite(n)) return roundMoney(n);
  }
  const fromMenu = menuPriceFromOrderRowEmbed(row.menu_items);
  if (fromMenu != null) return fromMenu;
  return 0;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export const ORDER_STATUSES_WITH_REVENUE = ['COMPLETED', 'APPROVED'] as const;

export function orderCountsTowardRevenue(status: string): boolean {
  return status === 'COMPLETED' || status === 'APPROVED';
}
