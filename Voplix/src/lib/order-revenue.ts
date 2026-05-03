/** Revenue counted for dashboards: stored snapshot, else live menu price. */
export function revenueAmountFromOrderRow(row: {
  revenue_amount?: number | string | null;
  menu_items?: { price?: number | string | null } | null;
}): number {
  const ra = row.revenue_amount;
  if (ra != null && ra !== '') {
    const n = Number(ra);
    if (Number.isFinite(n)) return roundMoney(n);
  }
  const p = row.menu_items?.price;
  if (p != null && p !== '') {
    const n = Number(p);
    if (Number.isFinite(n)) return roundMoney(n);
  }
  return 0;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export const ORDER_STATUSES_WITH_REVENUE = ['COMPLETED', 'APPROVED'] as const;

export function orderCountsTowardRevenue(status: string): boolean {
  return status === 'COMPLETED' || status === 'APPROVED';
}
