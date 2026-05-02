export type OrderStatusFilter = 'all' | 'review' | 'completed' | 'rejected' | 'waiting';

/** Default when omitted: show orders that need slip review first. */
export function parseOrderStatusFilter(v: string | null | undefined): OrderStatusFilter {
  if (v === 'all' || v === 'review' || v === 'completed' || v === 'rejected' || v === 'waiting') return v;
  return 'review';
}

/** Apply status filter to a Supabase orders query (already scoped to owner via bots join). */
export function applyOrderStatusFilter(query: any, filter: OrderStatusFilter) {
  if (filter === 'review') return query.eq('status', 'SLIP_SUBMITTED');
  if (filter === 'completed') return query.in('status', ['COMPLETED', 'APPROVED']);
  if (filter === 'rejected') return query.eq('status', 'REJECTED');
  if (filter === 'waiting') return query.eq('status', 'PENDING_PAYMENT');
  return query;
}
