'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatOrderTimestamp } from '@/lib/format-order';
import { formatCurrencyAmount } from '@/lib/currency';
import { useShopCurrency } from '@/components/dashboard/currency-context';
import type { OrderStatusFilter } from '@/lib/owner-orders-filter';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { OrderHistoryCleanup } from '@/components/settings/order-history-cleanup';

type CleanupBotOption = { id: string; bot_username: string };

interface OrdersDashboardProps {
  orders: any[];
  totalCount: number;
  page: number;
  pageSize: number;
  selectedBotId: string | null;
  reviewCountTotal: number;
  statusFilter: OrderStatusFilter;
  cleanupBots?: CleanupBotOption[];
}

const DEFAULT_PAGE_SIZE = 20;

const statusVisual: Record<string, { label: string; className: string }> = {
  PENDING_PAYMENT: {
    label: 'Waiting payment',
    className: 'border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200',
  },
  SLIP_SUBMITTED: {
    label: 'Needs review',
    className:
      'border-zinc-400 bg-zinc-200/80 text-zinc-900 dark:border-zinc-500 dark:bg-zinc-800/90 dark:text-zinc-100',
  },
  APPROVED: {
    label: 'Approved',
    className: 'border-zinc-400 bg-zinc-100 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'border-zinc-400 bg-zinc-100 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'border-zinc-400 bg-zinc-100 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100',
  },
};

function ordersHref(botId: string | null, p: number, ps: number, filter: OrderStatusFilter) {
  const u = new URLSearchParams();
  if (botId) u.set('bot', botId);
  if (p > 1) u.set('page', String(p));
  if (ps !== DEFAULT_PAGE_SIZE) u.set('pageSize', String(ps));
  if (filter !== 'review') u.set('filter', filter);
  const q = u.toString();
  return q ? `/orders?${q}` : '/orders';
}

const FILTER_TABS: { id: OrderStatusFilter; label: string; badge?: 'review' }[] = [
  { id: 'review', label: 'Needs review', badge: 'review' },
  { id: 'all', label: 'All' },
  { id: 'waiting', label: 'Waiting payment' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
];

/** Supabase embed is usually an object; some clients/configs return a one-element array. */
function embeddedMenuItem(order: { menu_items?: unknown }): {
  name?: string;
  price?: number;
  type?: string;
  delivery_content?: string | null;
} | undefined {
  const raw = order.menu_items;
  if (raw == null) return undefined;
  if (Array.isArray(raw)) {
    const first = raw[0];
    return first && typeof first === 'object' ? (first as { name?: string; price?: number; type?: string; delivery_content?: string | null }) : undefined;
  }
  if (typeof raw === 'object') {
    return raw as { name?: string; price?: number; type?: string; delivery_content?: string | null };
  }
  return undefined;
}

export function OrdersDashboard({
  orders: initialOrders,
  totalCount,
  page,
  pageSize,
  selectedBotId,
  reviewCountTotal,
  statusFilter,
  cleanupBots = [],
}: OrdersDashboardProps) {
  const router = useRouter();
  const currency = useShopCurrency();
  const { t } = useLanguage();
  const [orders, setOrders] = useState(initialOrders);
  const [appendOrders, setAppendOrders] = useState<any[]>([]);
  const [nextFetchPage, setNextFetchPage] = useState(page + 1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreClient, setHasMoreClient] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [manualDeliveryNotes, setManualDeliveryNotes] = useState<Record<string, string>>({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);

  const isDeepPage = page > 1;
  const combinedOrders = useMemo(() => [...orders, ...appendOrders], [orders, appendOrders]);

  useEffect(() => {
    setOrders(initialOrders);
    setAppendOrders([]);
    setNextFetchPage(page + 1);
    setHasMoreClient(true);
    setSelected(new Set());
    setExpandedId(null);
    setManualDeliveryNotes({});
  }, [initialOrders, page, pageSize, selectedBotId, statusFilter]);

  const manualOutboundText = (order: any) =>
    manualDeliveryNotes[order.id] !== undefined
      ? manualDeliveryNotes[order.id]
      : (embeddedMenuItem(order)?.delivery_content ?? '');

  const setManualOutboundText = (orderId: string, value: string) => {
    setManualDeliveryNotes((prev) => {
      const next = { ...prev };
      if (value === '') {
        delete next[orderId];
      } else {
        next[orderId] = value;
      }
      return next;
    });
  };

  const pendingOnPage = useMemo(
    () => combinedOrders.filter((o: any) => o.status === 'SLIP_SUBMITTED'),
    [combinedOrders]
  );

  const pageIds = useMemo(() => combinedOrders.map((o: any) => o.id as string), [combinedOrders]);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, totalCount);

  const selectedSlipIds = useMemo(
    () =>
      [...selected].filter((id) => {
        const o = combinedOrders.find((x: any) => x.id === id);
        return o?.status === 'SLIP_SUBMITTED';
      }),
    [selected, combinedOrders]
  );

  const loadMore = useCallback(async () => {
    if (typeof window !== 'undefined' && !window.matchMedia('(max-width: 767px)').matches) return;
    if (loadingMore || isDeepPage || !hasMoreClient) return;
    const loaded = orders.length + appendOrders.length;
    if (loaded >= totalCount) {
      setHasMoreClient(false);
      return;
    }
    setLoadingMore(true);
    try {
      const u = new URLSearchParams();
      u.set('page', String(nextFetchPage));
      u.set('pageSize', String(pageSize));
      u.set('filter', statusFilter);
      if (selectedBotId) u.set('bot', selectedBotId);
      const res = await fetch(`/api/orders/feed?${u.toString()}`);
      const j = (await res.json().catch(() => ({}))) as { orders?: any[]; error?: string };
      if (!res.ok) {
        throw new Error(j.error || t('Failed to load'));
      }
      const chunk = j.orders || [];
      if (chunk.length === 0) {
        setHasMoreClient(false);
      } else {
        setAppendOrders((prev) => {
          const seen = new Set(
            [...orders, ...prev].map((x: any) => x.id)
          );
          const next = chunk.filter((row: any) => !seen.has(row.id));
          return [...prev, ...next];
        });
        setNextFetchPage((p) => p + 1);
        if (chunk.length < pageSize) setHasMoreClient(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Could not load more'));
    } finally {
      setLoadingMore(false);
    }
  }, [
    appendOrders.length,
    hasMoreClient,
    isDeepPage,
    loadingMore,
    nextFetchPage,
    orders,
    pageSize,
    selectedBotId,
    statusFilter,
    totalCount,
    t
  ]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || isDeepPage) return;
    const mq = window.matchMedia('(max-width: 767px)');
    if (!mq.matches) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: '120px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isDeepPage, loadMore, combinedOrders.length]);

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

  const handleApprove = async (order: any) => {
    const isManual = embeddedMenuItem(order)?.type === 'MANUAL_DELIVERY';
    const outbound = manualOutboundText(order).trim();
    if (isManual && !outbound) {
      toast.error(
        t('Write what the customer should receive (account number, link, instructions) in the box above, or save default text on this product in Menu.')
      );
      return;
    }

    setLoading(true);
    try {
      const body = isManual ? { manual_message: outbound } : { manual_delivery_data: null };
      const response = await fetch(`/api/orders/${order.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const j = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || t('Failed to approve order'));
      }
      setOrders((prev) => prev.map((o: any) => (o.id === order.id ? { ...o, status: 'COMPLETED' } : o)));
      setAppendOrders((prev) => prev.map((o: any) => (o.id === order.id ? { ...o, status: 'COMPLETED' } : o)));
      setManualDeliveryNotes((prev) => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
      toast.success(t('Order confirmed'));
      router.refresh();
    } catch {
      toast.error(t('Failed to approve order'));
    } finally {
      setLoading(false);
    }
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
      if (!response.ok) throw new Error(t('Failed to reject order'));
      setOrders((prev) => prev.map((o: any) => (o.id === order.id ? { ...o, status: 'REJECTED' } : o)));
      setAppendOrders((prev) => prev.map((o: any) => (o.id === order.id ? { ...o, status: 'REJECTED' } : o)));
      toast.success(t('Order rejected'));
      router.refresh();
    } catch {
      toast.error(t('Failed to reject order'));
    } finally {
      setLoading(false);
    }
  };

  const deleteOne = async (order: any) => {
    if (!confirm(t('Permanently delete this order from history? This cannot be undone.'))) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || t('Delete failed'));
      }
      setOrders((prev) => prev.filter((o: any) => o.id !== order.id));
      setAppendOrders((prev) => prev.filter((o: any) => o.id !== order.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
      toast.success(t('Order removed from history'));
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Delete failed'));
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
      if (!res.ok) throw new Error(j.error || t('Bulk delete failed'));
      toast.success(`${t('Deleted')} ${j.deleted ?? selected.size} ${t('order(s)')}`);
      setSelected(new Set());
      setBulkDeleteOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Bulk delete failed'));
    } finally {
      setLoading(false);
    }
  };

  const bulkApproveSelected = async () => {
    if (selectedSlipIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orders/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedSlipIds }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        approved?: number;
        failures?: string[];
      };
      if (!res.ok) throw new Error(j.error || t('Bulk approve failed'));
      toast.success(`${t('Approved')} ${j.approved ?? 0} ${t('order(s)')}`);
      if (j.failures?.length) {
        toast.message(t('Some orders were skipped'), { description: j.failures.slice(0, 5).join('\n') });
      }
      setBulkApproveOpen(false);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Bulk approve failed'));
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const cfg = statusVisual[status] ?? statusVisual.PENDING_PAYMENT;
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
          cfg.className
        )}
      >
        {t(cfg.label)}
      </span>
    );
  };

  const slipThumb = (order: any, size: 'sm' | 'md') => {
    if (!order.slip_image_url) {
      return <span className="text-xs text-zinc-500">—</span>;
    }
    const h = size === 'sm' ? 'h-11 w-11' : 'h-28 w-28';
    return (
      <button
        type="button"
        onClick={() => setExpandedId((id) => (id === order.id ? null : order.id))}
        className={cn(
          'relative shrink-0 overflow-hidden rounded-md border border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900',
          h
        )}
        aria-label="Toggle slip preview"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/orders/${order.id}/slip`}
          alt=""
          className="h-full w-full object-cover"
        />
      </button>
    );
  };

  /** Full-width card: manual delivery text (second Telegram message after approve). Not shown in the narrow Actions column. */
  const manualOutboundEditorCard = (order: any) => {
    if (order.status !== 'SLIP_SUBMITTED' || embeddedMenuItem(order)?.type !== 'MANUAL_DELIVERY') return null;
    return (
      <Card className="border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <CardHeader className="space-y-1 pb-2 pt-4">
          <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-white">
            {t('Message to send the customer')}
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            {t('After you approve, the bot sends a short confirmation, then this text — bank details, login info, or how they receive the product. If you saved text on the product in Menu, it appears here; you can edit it before approving.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Textarea
            value={manualOutboundText(order)}
            onChange={(e) => setManualOutboundText(order.id, e.target.value)}
            rows={5}
            className="min-h-[120px] resize-y border-zinc-300 bg-zinc-50 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </CardContent>
      </Card>
    );
  };

  const expandedPanel = (order: any) => (
    <div className="space-y-4 border-t border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        {order.slip_image_url ? (
          <div className="shrink-0 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/orders/${order.id}/slip`}
              alt="Payment slip"
              className="max-h-[min(70vh,420px)] w-full max-w-md object-contain"
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t('Order')} <span className="font-mono text-zinc-800 dark:text-zinc-200">#{order.id.slice(0, 8)}</span>
            {embeddedMenuItem(order)?.type === 'MANUAL_DELIVERY' ? (
              <span className="ml-2 rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {t('You send the product')}
              </span>
            ) : null}
          </p>
          {order.status === 'SLIP_SUBMITTED' ? (
            <div className="flex max-w-sm flex-col gap-2">
              <Button
                type="button"
                onClick={() => handleApprove(order)}
                disabled={loading}
                className="border border-zinc-600 bg-zinc-100 text-zinc-900 hover:bg-white dark:border-zinc-500 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
              >
                {t('Approve & complete')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleReject(order)}
                disabled={loading}
                className="border-zinc-600 dark:border-zinc-600"
              >
                {t('Reject')}
              </Button>
              <Input
                placeholder={t('Reject reason (optional)')}
                value={rejectReasons[order.id] || ''}
                onChange={(e) =>
                  setRejectReasons((prev) => ({ ...prev, [order.id]: e.target.value }))
                }
                className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
            </div>
          ) : (
            <p className="text-sm text-zinc-500">{t('This order is not awaiting slip approval.')}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        {FILTER_TABS.map((tab) => {
          const active = statusFilter === tab.id;
            const badge =
            tab.badge === 'review' && reviewCountTotal > 0 ? (
              <span className="ml-1 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
                {reviewCountTotal}
              </span>
            ) : null;
          return (
            <Link
              key={tab.id}
              href={ordersHref(selectedBotId, 1, pageSize, tab.id)}
              className={cn(
                'inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800'
              )}
            >
              {t(tab.label)}
              {badge}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <span className="text-zinc-700 dark:text-zinc-300">{pendingOnPage.length} {t('on this page need review')}</span>
          {totalCount > 0 ? (
            <span className="text-zinc-500">
              {' '}
              · {t('Rows')} {showingFrom}–{showingTo} {t('of')} {totalCount}
            </span>
          ) : null}
        </p>
        <div className="hidden flex-col gap-3 md:flex md:items-end">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
            <span className="mr-1 text-zinc-500">{t('Rows per page')}</span>
            {[20, 50, 100].map((n) => (
              <Link
                key={n}
                href={ordersHref(selectedBotId, 1, n, statusFilter)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  pageSize === n
                    ? 'bg-zinc-700 text-white dark:bg-zinc-600 dark:text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                )}
              >
                {n}
              </Link>
            ))}
          </div>
          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              {page <= 1 ? (
                <span className="inline-flex h-8 cursor-not-allowed items-center rounded-md border border-zinc-200 px-3 text-sm text-zinc-600 dark:border-zinc-800">
                  <CaretLeft className="mr-1 h-4 w-4 opacity-60" aria-hidden />
                  {t('Newer')}
                </span>
              ) : (
                <Link
                  href={ordersHref(selectedBotId, page - 1, pageSize, statusFilter)}
                  className="inline-flex h-8 items-center rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <CaretLeft className="mr-1 h-4 w-4" aria-hidden />
                  {t('Newer')}
                </Link>
              )}
              <span className="px-1 text-sm tabular-nums text-zinc-500">
                {t('Page')} {page} / {totalPages}
              </span>
              {page >= totalPages ? (
                <span className="inline-flex h-8 cursor-not-allowed items-center rounded-md border border-zinc-200 px-3 text-sm text-zinc-600 dark:border-zinc-800">
                  {t('Older')}
                  <CaretRight className="ml-1 h-4 w-4 opacity-60" aria-hidden />
                </span>
              ) : (
                <Link
                  href={ordersHref(selectedBotId, page + 1, pageSize, statusFilter)}
                  className="inline-flex h-8 items-center rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {t('Older')}
                  <CaretRight className="ml-1 h-4 w-4" aria-hidden />
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {selected.size > 0 ? (
        <div
          className="flex flex-col gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium text-zinc-900 dark:text-white">{selected.size}</span> {t('selected — removes rows from this list only; customers are not notified.')}
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {selectedSlipIds.length > 0 ? (
              <Button
                type="button"
                size="sm"
                className="border border-zinc-400 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                onClick={() => setBulkApproveOpen(true)}
                disabled={loading}
              >
                {t('Approve selected slips…')}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-600 text-zinc-700 dark:text-zinc-300"
              onClick={() => setSelected(new Set())}
            >
              {t('Clear selection')}
            </Button>
            <Button
              type="button"
              size="sm"
              className="border border-red-900/50 bg-red-950/30 text-red-200 hover:bg-red-950/50"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={loading}
            >
              {t('Delete selected…')}
            </Button>
          </div>
        </div>
      ) : null}

      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-zinc-900 dark:text-white">{t('Orders')}</CardTitle>
          <CardDescription className="mt-1 text-zinc-500">
            {t('Review slips first, then approve or reject. Use tabs to focus on what needs attention.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {combinedOrders.length === 0 ? (
            <p className="text-sm text-zinc-500">{t('No orders match this filter.')}</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {combinedOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40"
                  >
                    <div className="flex gap-3 p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(order.id)}
                        onChange={() => toggleOne(order.id)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-600"
                        aria-label={`Select order ${order.id.slice(0, 8)}`}
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-zinc-900 dark:text-white">
                              {order.telegram_username || order.telegram_user_id}
                            </p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {embeddedMenuItem(order)?.name || '—'}
                            </p>
                          </div>
                          {slipThumb(order, 'sm')}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span className="tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
                            {formatCurrencyAmount(Number(embeddedMenuItem(order)?.price || 0), currency)}
                          </span>
                          <span>·</span>
                          <span className="tabular-nums">{formatOrderTimestamp(order.created_at)}</span>
                        </div>
                        <div>{statusBadge(order.status)}</div>
                        {manualOutboundEditorCard(order)}
                        {order.status === 'SLIP_SUBMITTED' ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="border border-zinc-500 bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                                disabled={loading}
                                onClick={() => handleApprove(order)}
                              >
                                {t('Approve')}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={loading}
                                onClick={() => handleReject(order)}
                              >
                                {t('Reject')}
                              </Button>
                            </div>
                            <Input
                              placeholder={t('Reject reason (optional)')}
                              value={rejectReasons[order.id] || ''}
                              onChange={(e) =>
                                setRejectReasons((prev) => ({ ...prev, [order.id]: e.target.value }))
                              }
                              className="h-9 text-sm"
                            />
                          </div>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-zinc-500 hover:text-red-400"
                          disabled={loading}
                          onClick={() => deleteOne(order)}
                        >
                          {t('Delete from list')}
                        </Button>
                      </div>
                    </div>
                    {expandedId === order.id ? expandedPanel(order) : null}
                  </div>
                ))}
                {!isDeepPage && hasMoreClient && orders.length + appendOrders.length < totalCount ? (
                  <div ref={loadMoreRef} className="flex justify-center py-4">
                    {loadingMore ? (
                      <span className="text-sm text-zinc-500">{t('Loading…')}</span>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={() => void loadMore()}>
                        {t('Load more')}
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full min-w-[860px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-100/90 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
                        <th className="w-10 px-2 py-3">
                          <input
                            type="checkbox"
                            checked={allOnPageSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected;
                            }}
                            onChange={toggleAllOnPage}
                            className="h-4 w-4 rounded border-zinc-600"
                            aria-label="Select all on this page"
                          />
                        </th>
                        <th className="min-w-[10rem] px-2 py-3">{t('Customer / product')}</th>
                        <th className="px-2 py-3 whitespace-nowrap">{t('Price')}</th>
                        <th className="min-w-[9rem] px-2 py-3 whitespace-nowrap">{t('Time')}</th>
                        <th className="px-2 py-3">{t('Slip')}</th>
                        <th className="min-w-[8rem] px-2 py-3">{t('Status')}</th>
                        <th className="min-w-[9rem] px-2 py-3">{t('Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                      {combinedOrders.map((order: any) => {
                        const manualDeliveryCard = manualOutboundEditorCard(order);
                        return (
                        <Fragment key={order.id}>
                          <tr className="align-middle text-zinc-800 dark:text-zinc-200">
                            <td className="px-2 py-3">
                              <input
                                type="checkbox"
                                checked={selected.has(order.id)}
                                onChange={() => toggleOne(order.id)}
                                className="h-4 w-4 rounded border-zinc-600"
                                aria-label={`Select order ${order.id.slice(0, 8)}`}
                              />
                            </td>
                            <td className="max-w-[16rem] px-2 py-3">
                              <p className="font-medium text-zinc-900 dark:text-white">
                                {order.telegram_username || order.telegram_user_id}
                              </p>
                              <p className="break-words text-zinc-600 dark:text-zinc-400">{embeddedMenuItem(order)?.name || '—'}</p>
                            </td>
                            <td className="px-2 py-3 tabular-nums whitespace-nowrap">
                              {formatCurrencyAmount(Number(embeddedMenuItem(order)?.price || 0), currency)}
                            </td>
                            <td className="px-2 py-3 tabular-nums text-xs text-zinc-500 whitespace-nowrap">
                              {formatOrderTimestamp(order.created_at)}
                            </td>
                            <td className="px-2 py-3">{slipThumb(order, 'sm')}</td>
                            <td className="px-2 py-3">{statusBadge(order.status)}</td>
                            <td className="px-2 py-3">
                              {order.status === 'SLIP_SUBMITTED' ? (
                                <div className="flex flex-col gap-1.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 border border-zinc-500 bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                                    disabled={loading}
                                    onClick={() => handleApprove(order)}
                                  >
                                    {t('Approve')}
                                  </Button>
                                  <Button type="button" size="sm" variant="outline" className="h-8" disabled={loading} onClick={() => handleReject(order)}>
                                    {t('Reject')}
                                  </Button>
                                  <Input
                                    placeholder={t('Reject reason')}
                                    value={rejectReasons[order.id] || ''}
                                    onChange={(e) =>
                                      setRejectReasons((p) => ({ ...p, [order.id]: e.target.value }))
                                    }
                                    className="h-8 text-xs"
                                  />
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-500">—</span>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-1 h-7 px-0 text-xs text-zinc-500 hover:text-red-400"
                                disabled={loading}
                                onClick={() => deleteOne(order)}
                              >
                                {t('Delete')}
                              </Button>
                            </td>
                          </tr>
                          {manualDeliveryCard ? (
                            <tr className="bg-zinc-50/60 dark:bg-zinc-950/25">
                              <td colSpan={7} className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
                                {manualDeliveryCard}
                              </td>
                            </tr>
                          ) : null}
                          {expandedId === order.id ? (
                            <tr className="bg-zinc-50/80 dark:bg-zinc-950/30">
                              <td colSpan={7} className="p-0">
                                {expandedPanel(order)}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-white">{t('Delete selected orders?')}</DialogTitle>
            <DialogDescription className="text-zinc-500">
              {t('This permanently removes')} <strong className="text-zinc-700 dark:text-zinc-300">{selected.size}</strong>{' '}
              {t('row(s). Customers are not messaged on Telegram.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button
              className="border border-red-900/50 bg-red-950/40 text-red-100 hover:bg-red-950/60"
              onClick={deleteSelected}
              disabled={loading}
            >
              {t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkApproveOpen} onOpenChange={setBulkApproveOpen}>
        <DialogContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-white">{t('Approve multiple orders?')}</DialogTitle>
            <DialogDescription className="text-zinc-500">
              {t('You are about to approve')} <strong className="text-zinc-800 dark:text-zinc-200">{selectedSlipIds.length}</strong>{' '}
              {t('order(s) that have a slip submitted. Each one is completed and the customer is notified. This cannot be undone.')}
              <span className="mt-2 block text-xs text-zinc-600 dark:text-zinc-400">
                {t('Manual (non-digital) products are skipped in bulk — open each one and approve so you can type what to send the buyer.')}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setBulkApproveOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button
              className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              onClick={bulkApproveSelected}
              disabled={loading || selectedSlipIds.length === 0}
            >
              {t('Approve')} {selectedSlipIds.length} {t('order(s)')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cleanupBots.length > 0 ? (
        <section className="space-y-3 pt-2">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t('Order archive')}</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {t('Remove old completed and rejected rows from your database. Customers are not notified.')}
            </p>
          </div>
          <OrderHistoryCleanup bots={cleanupBots} />
        </section>
      ) : null}
    </div>
  );
}
