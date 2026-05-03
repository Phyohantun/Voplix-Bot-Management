export type OrderStatusFilter = 'all' | 'review' | 'completed' | 'rejected' | 'waiting';

/** Default when omitted: show orders that need slip review first. */
export function parseOrderStatusFilter(v: string | null | undefined): OrderStatusFilter {
  if (v === 'all' || v === 'review' || v === 'completed' || v === 'rejected' || v === 'waiting') return v;
  return 'review';
}

/** Apply status filter to a Supabase orders query (already scoped to owner via bots join). */
export function applyOrderStatusFilter(query: any, filter: OrderStatusFilter) {
  let q = query;
  if (filter === 'review') q = q.eq('status', 'SLIP_SUBMITTED');
  else if (filter === 'completed') q = q.in('status', ['COMPLETED', 'APPROVED']);
  else if (filter === 'rejected') q = q.eq('status', 'REJECTED');
  else if (filter === 'waiting') q = q.eq('status', 'PENDING_PAYMENT');
  return q.is('deleted_at', null);
}
