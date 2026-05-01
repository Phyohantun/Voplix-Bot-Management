'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ClockCounterClockwise, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatOrderTimestamp } from '@/lib/format-order';
import { formatCurrencyAmount } from '@/lib/currency';
import { useShopCurrency } from '@/components/dashboard/currency-context';
import { cn } from '@/lib/utils';

interface OrdersDashboardProps {
  orders: any[];
  totalCount: number;
  page: number;
  pageSize: number;
  selectedBotId: string | null;
}

const DEFAULT_PAGE_SIZE = 50;

/** Muted, neutral status chips (no bright / neon fills). */
const statusBadgeClass: Record<string, string> = {
  PENDING_PAYMENT: 'border-zinc-400 bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200',
  SLIP_SUBMITTED: 'border-zinc-400 bg-zinc-200 dark:border-zinc-500 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200',
  APPROVED: 'border-zinc-400 bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
  COMPLETED: 'border-zinc-400 bg-zinc-200/90 dark:border-zinc-600 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300',
  REJECTED:
    'border-red-300 bg-red-50 dark:border-red-900/40 dark:bg-zinc-900 text-red-800 dark:text-red-200/90',
};

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: 'Pending Payment',
  SLIP_SUBMITTED: 'Slip Submitted',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

function ordersHref(botId: string | null, p: number, ps: number) {
  const u = new URLSearchParams();
  if (botId) u.set('bot', botId);
  if (p > 1) u.set('page', String(p));
  if (ps !== DEFAULT_PAGE_SIZE) u.set('pageSize', String(ps));
  const q = u.toString();
  return q ? `/orders?${q}` : '/orders';
}

export function OrdersDashboard({
  orders: initialOrders,
  totalCount,
  page,
  pageSize,
  selectedBotId,
}: OrdersDashboardProps) {
  const router = useRouter();
  const currency = useShopCurrency();
  const [orders, setOrders] = useState(initialOrders);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [cleanupDays, setCleanupDays] = useState(90);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    setOrders(initialOrders);
    setSelected(new Set());
  }, [initialOrders, page, pageSize, selectedBotId]);

  const pendingOrders = useMemo(
    () => orders.filter((o: any) => o.status === 'SLIP_SUBMITTED'),
    [orders]
  );

  const pageIds = useMemo(() => orders.map((o: any) => o.id as string), [orders]);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, totalCount);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    if (allOnPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const openHistoryTool = () => {
    if (!selectedBotId) {
      toast.message('Choose a bot in the header first', {
        description: 'Cleanup runs for one shop at a time.',
      });
      return;
    }
    setHistoryOpen(true);
  };

  const handleApprove = async (order: any) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/orders/${order.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual_delivery_data: null }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve order');
      }

      setOrders(orders.map((o: any) => (o.id === order.id ? { ...o, status: 'COMPLETED' } : o)));
      toast.success('Order confirmed');
      router.refresh();
    } catch {
      toast.error('Failed to approve order');
    }

    setLoading(false);
  };

  const handleReject = async (order: any) => {
    setLoading(true);
    const reason = (rejectReasons[order.id] || '').trim();

    try {
      const response = await fetch(`/api/orders/${order.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject order');
      }

      setOrders(orders.map((o: any) => (o.id === order.id ? { ...o, status: 'REJECTED' } : o)));
      toast.success('Order rejected');
      router.refresh();
    } catch {
      toast.error('Failed to reject order');
    }

    setLoading(false);
  };

  const deleteOne = async (order: any) => {
    if (!confirm(`Permanently delete order #${order.id.slice(0, 8)} from history? This cannot be undone.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Delete failed');
      }
      setOrders(orders.filter((o: any) => o.id !== order.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
      toast.success('Order removed from history');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; deleted?: number };
      if (!res.ok) {
        throw new Error(j.error || 'Bulk delete failed');
      }
      toast.success(`Deleted ${j.deleted ?? selected.size} order(s)`);
      setSelected(new Set());
      setBulkDeleteOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk delete failed');
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async () => {
    if (!selectedBotId) {
      toast.error('Select a bot in the header first');
      return;
    }
    const msg = `Remove completed and rejected orders older than ${cleanupDays} days for this shop? This cannot be undone.`;
    if (!confirm(msg)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/orders/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id: selectedBotId, older_than_days: cleanupDays }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        deleted?: number;
        truncated?: boolean;
      };
      if (!res.ok) {
        throw new Error(j.error || 'Cleanup failed');
      }
      toast.success(
        j.deleted === 0
          ? 'No old finished orders matched those settings — nothing was removed.'
          : `Removed ${j.deleted} old order(s) from your list.` +
              (j.truncated
                ? ' If the list is still long, open this tool again to remove another batch.'
                : '')
      );
      setHistoryOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cleanup failed');
    } finally {
      setLoading(false);
    }
  };

  const slipLinkClass =
    'text-sm text-zinc-700 dark:text-zinc-300 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-950 dark:hover:text-zinc-900 dark:text-white hover:decoration-zinc-400';

  const actionsBlock = (order: any, compact: boolean) => (
    <div
      className={cn(
        'flex flex-col gap-2.5',
        compact ? 'mt-4 w-full' : 'min-w-[11rem] max-w-[14rem]'
      )}
    >
      {order.status === 'SLIP_SUBMITTED' ? (
        <>
          <Button
            type="button"
            onClick={() => handleApprove(order)}
            disabled={loading}
            className={cn(
              'w-full justify-center border border-zinc-600 bg-zinc-100 text-zinc-900 hover:bg-white',
              compact ? 'h-10' : 'h-9 text-sm'
            )}
          >
            Confirm
          </Button>
          <Button
            type="button"
            onClick={() => handleReject(order)}
            disabled={loading}
            variant="outline"
            className={cn(
              'w-full justify-center border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-200 dark:bg-zinc-800',
              compact ? 'h-10' : 'h-9 text-sm'
            )}
          >
            Reject
          </Button>
          <Input
            placeholder="Reject reason (optional)"
            value={rejectReasons[order.id] || ''}
            onChange={(e) =>
              setRejectReasons((prev) => ({ ...prev, [order.id]: e.target.value }))
            }
            className={cn(
              'border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800/80 text-zinc-900 dark:text-white placeholder:text-zinc-500',
              compact ? 'h-10' : 'h-9 text-sm'
            )}
          />
        </>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={() => deleteOne(order)}
        className={cn(
          'w-full justify-center border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-red-900/50 hover:bg-red-950/20 hover:text-red-200',
          compact ? 'h-10' : 'h-9 text-sm'
        )}
      >
        Delete from list
      </Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <span className="text-zinc-700 dark:text-zinc-300">{pendingOrders.length} pending verification</span>
          {totalCount > 0 ? (
            <span className="text-zinc-500">
              {' '}
              · Rows {showingFrom}–{showingTo} of {totalCount}
            </span>
          ) : null}
        </p>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
            <span className="mr-1 text-zinc-500">Rows per page</span>
            {[25, 50, 100].map((n) => (
              <Link
                key={n}
                href={ordersHref(selectedBotId, 1, n)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  pageSize === n
                    ? 'bg-zinc-700 text-zinc-900 dark:text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-200 dark:bg-zinc-800 hover:text-zinc-800 dark:text-zinc-200'
                )}
              >
                {n}
              </Link>
            ))}
          </div>
          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              {page <= 1 ? (
                <span className="inline-flex h-8 cursor-not-allowed items-center rounded-md border border-zinc-200 dark:border-zinc-800 px-3 text-sm text-zinc-600">
                  <CaretLeft className="mr-1 h-4 w-4 opacity-60" aria-hidden />
                  Newer
                </span>
              ) : (
                <Link
                  href={ordersHref(selectedBotId, page - 1, pageSize)}
                  className="inline-flex h-8 items-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-200 dark:bg-zinc-800"
                >
                  <CaretLeft className="mr-1 h-4 w-4" aria-hidden />
                  Newer
                </Link>
              )}
              <span className="px-1 text-sm tabular-nums text-zinc-500">
                Page {page} / {totalPages}
              </span>
              {page >= totalPages ? (
                <span className="inline-flex h-8 cursor-not-allowed items-center rounded-md border border-zinc-200 dark:border-zinc-800 px-3 text-sm text-zinc-600">
                  Older
                  <CaretRight className="ml-1 h-4 w-4 opacity-60" aria-hidden />
                </span>
              ) : (
                <Link
                  href={ordersHref(selectedBotId, page + 1, pageSize)}
                  className="inline-flex h-8 items-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-200 dark:bg-zinc-800"
                >
                  Older
                  <CaretRight className="ml-1 h-4 w-4" aria-hidden />
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {selected.size > 0 ? (
        <div
          className="flex flex-col gap-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/90 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium text-zinc-900 dark:text-white">{selected.size}</span> selected — removes rows from this list only;
            customers are not notified.
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-600 text-zinc-700 dark:text-zinc-300"
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </Button>
            <Button
              type="button"
              size="sm"
              className="border border-red-900/50 bg-red-950/30 text-red-200 hover:bg-red-950/50"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={loading}
            >
              Delete selected…
            </Button>
          </div>
        </div>
      ) : null}

      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-4">
          <div>
            <CardTitle className="text-base font-semibold text-zinc-900 dark:text-white">Orders</CardTitle>
            <CardDescription className="mt-1 text-zinc-500">
              Confirm payments, reject if needed, or delete rows. Open history to clear many old finished orders at once.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openHistoryTool}
            className="shrink-0 gap-2 border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-200 dark:bg-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-900 dark:text-white"
            title={
              selectedBotId
                ? 'Remove many old finished orders at once'
                : 'Choose a bot in the header first'
            }
          >
            <ClockCounterClockwise className="h-4 w-4 text-zinc-600 dark:text-zinc-400" weight="regular" aria-hidden />
            History
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {orders.length === 0 ? (
            <p className="text-sm text-zinc-500">No orders on this page.</p>
          ) : (
            <>
              <div className="space-y-4 md:hidden">
                {orders.map((order: any) => (
                  <div
                    key={order.id}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950/40 p-4 text-sm text-zinc-800 dark:text-zinc-200"
                  >
                    <div className="flex gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(order.id)}
                        onChange={() => toggleOne(order.id)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-600"
                        aria-label={`Select order ${order.id.slice(0, 8)}`}
                      />
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-white">#{order.id.slice(0, 8)}</p>
                            <p className="mt-0.5 text-xs tabular-nums text-zinc-500">
                              {formatOrderTimestamp(order.created_at)}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn('shrink-0 border', statusBadgeClass[order.status] ?? statusBadgeClass.PENDING_PAYMENT)}
                          >
                            {statusLabels[order.status]}
                          </Badge>
                        </div>
                        <dl className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                          <div>
                            <dt className="text-zinc-500">Customer</dt>
                            <dd className="text-zinc-700 dark:text-zinc-300">{order.telegram_username || order.telegram_user_id}</dd>
                          </div>
                          <div>
                            <dt className="text-zinc-500">Product</dt>
                            <dd className="break-words text-zinc-700 dark:text-zinc-300">{order.menu_items?.name || '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-zinc-500">Price</dt>
                            <dd className="tabular-nums text-zinc-700 dark:text-zinc-300">
                              {formatCurrencyAmount(Number(order.menu_items?.price || 0), currency)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-zinc-500">Slip</dt>
                            <dd>
                              {order.slip_image_url ? (
                                <button type="button" className={slipLinkClass} onClick={() => setSelectedOrder(order)}>
                                  View slip
                                </button>
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </dd>
                          </div>
                        </dl>
                        {actionsBlock(order, true)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full min-w-[900px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-950/50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                        <th className="w-10 px-3 py-3">
                          <input
                            type="checkbox"
                            checked={allOnPageSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected;
                            }}
                            onChange={toggleAllOnPage}
                            className="h-4 w-4 rounded border-zinc-600"
                            aria-label="Select all orders on this page"
                          />
                        </th>
                        <th className="px-3 py-3 whitespace-nowrap">Order</th>
                        <th className="min-w-[7rem] px-3 py-3">Customer</th>
                        <th className="min-w-[8rem] max-w-[14rem] px-3 py-3">Product</th>
                        <th className="px-3 py-3 whitespace-nowrap">Price</th>
                        <th className="min-w-[10rem] px-3 py-3 whitespace-nowrap">Time</th>
                        <th className="px-3 py-3">Slip</th>
                        <th className="min-w-[7.5rem] px-3 py-3">Status</th>
                        <th className="w-[15rem] px-3 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                      {orders.map((order: any) => (
                        <tr key={order.id} className="align-top text-zinc-800 dark:text-zinc-200">
                          <td className="px-3 py-4">
                            <input
                              type="checkbox"
                              checked={selected.has(order.id)}
                              onChange={() => toggleOne(order.id)}
                              className="h-4 w-4 rounded border-zinc-600"
                              aria-label={`Select order ${order.id.slice(0, 8)}`}
                            />
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap font-medium text-zinc-900 dark:text-white">
                            #{order.id.slice(0, 8)}
                          </td>
                          <td className="px-3 py-4 text-zinc-700 dark:text-zinc-300 break-words">
                            {order.telegram_username || order.telegram_user_id}
                          </td>
                          <td className="max-w-[14rem] px-3 py-4 break-words text-zinc-700 dark:text-zinc-300">
                            {order.menu_items?.name || '—'}
                          </td>
                          <td className="px-3 py-4 tabular-nums whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                            {formatCurrencyAmount(Number(order.menu_items?.price || 0), currency)}
                          </td>
                          <td className="px-3 py-4 tabular-nums text-xs text-zinc-500 whitespace-nowrap">
                            {formatOrderTimestamp(order.created_at)}
                          </td>
                          <td className="px-3 py-4">
                            {order.slip_image_url ? (
                              <button type="button" className={slipLinkClass} onClick={() => setSelectedOrder(order)}>
                                View
                              </button>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="px-3 py-4">
                            <Badge
                              variant="outline"
                              className={cn(
                                'border font-normal',
                                statusBadgeClass[order.status] ?? statusBadgeClass.PENDING_PAYMENT
                              )}
                            >
                              {statusLabels[order.status]}
                            </Badge>
                          </td>
                          <td className="px-3 py-4">{actionsBlock(order, false)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-white">Payment slip</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Order #{selectedOrder?.id?.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {selectedOrder.slip_image_url && (
                <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950">
                  <img
                    src={`/api/orders/${selectedOrder.id}/slip`}
                    alt="Payment slip"
                    className="max-h-80 w-full object-contain"
                  />
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedOrder(null)}
                  className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-white">Delete selected orders?</DialogTitle>
            <DialogDescription className="text-zinc-500">
              This permanently removes <strong className="text-zinc-700 dark:text-zinc-300">{selected.size}</strong> row(s) from your list.
              Customers are not messaged on Telegram.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              className="border border-red-900/50 bg-red-950/40 text-red-100 hover:bg-red-950/60"
              onClick={deleteSelected}
              disabled={loading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-white">Order history</DialogTitle>
            <DialogDescription className="text-zinc-500 leading-relaxed">
              Remove many <strong className="text-zinc-600 dark:text-zinc-400">completed</strong> and{' '}
              <strong className="text-zinc-600 dark:text-zinc-400">rejected</strong> orders at once so the list stays short. Waiting and
              in-progress orders are never removed. Only affects this dashboard — not your bot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label htmlFor="hist-days" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Older than (days)
              </label>
              <Input
                id="hist-days"
                type="number"
                min={7}
                max={3650}
                value={cleanupDays}
                onChange={(e) => setCleanupDays(Math.max(7, parseInt(e.target.value, 10) || 90))}
                className="h-10 border-zinc-300 dark:border-zinc-700 bg-zinc-200/80 dark:bg-zinc-800/50 text-zinc-900 dark:text-white"
              />
            </div>
            <p className="text-xs leading-relaxed text-zinc-600">
              Use the pager above the table to browse newer or older pages before cleaning up.
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button variant="outline" className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300" onClick={() => setHistoryOpen(false)}>
              Close
            </Button>
            <Button
              className="border border-zinc-600 bg-zinc-100 text-zinc-900 hover:bg-white"
              onClick={runCleanup}
              disabled={loading}
            >
              Remove old orders
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
