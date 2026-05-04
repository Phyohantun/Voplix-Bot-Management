'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { ArrowLeft, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatOrderTimestamp } from '@/lib/format-order';
import { formatCurrencyAmount } from '@/lib/currency';
import { useShopCurrency } from '@/components/dashboard/currency-context';
import type { OrderStatusFilter } from '@/lib/owner-orders-filter';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { OrderHistoryCleanup } from '@/components/settings/order-history-cleanup';
import { telegramHtmlToPlain } from '@/lib/bot-telegram-copy';
import { OrderSlipMedia } from '@/components/orders/order-slip-media';
import { orderCountsTowardRevenue, revenueAmountFromOrderRow, roundMoney } from '@/lib/order-revenue';
import { orderAllowsOwnerListRemoval } from '@/lib/order-list-removal';

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

function menuPlainTemplate(order: { menu_items?: unknown }): string {
  const item = embeddedMenuItem(order);
  const savedRaw = item?.delivery_content;
  if (typeof savedRaw !== 'string' || !savedRaw.trim()) return '';
  return telegramHtmlToPlain(savedRaw).trim() || savedRaw.trim();
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
  const [slipDialogOrderId, setSlipDialogOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [manualDeliveryNotes, setManualDeliveryNotes] = useState<Record<string, string>>({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [revenueDialogOrder, setRevenueDialogOrder] = useState<any | null>(null);
  const [revenueDraft, setRevenueDraft] = useState('');
  const [revenueSaving, setRevenueSaving] = useState(false);

  const isDeepPage = page > 1;
  const combinedOrders = useMemo(() => [...orders, ...appendOrders], [orders, appendOrders]);

  useEffect(() => {
    setOrders(initialOrders);
    setAppendOrders([]);
    setNextFetchPage(page + 1);
    setHasMoreClient(true);
    setSelected(new Set());
    const keepIds = new Set(initialOrders.map((o: any) => o.id as string));
    setManualDeliveryNotes((prev) => {
      const next: Record<string, string> = {};
      for (const [id, text] of Object.entries(prev)) {
        if (keepIds.has(id)) next[id] = text;
      }
      return next;
    });
  }, [initialOrders, page, pageSize, selectedBotId, statusFilter]);

  /** Per-order draft only — never auto-filled from Menu or from other orders. */
  const manualMessageDraft = (order: any) =>
    embeddedMenuItem(order)?.type === 'MANUAL_DELIVERY' ? (manualDeliveryNotes[order.id] ?? '') : '';

  const manualApproveBlocked = (order: any) =>
    order.status === 'SLIP_SUBMITTED' &&
    embeddedMenuItem(order)?.type === 'MANUAL_DELIVERY' &&
    !manualMessageDraft(order).trim();

  const setManualOutboundText = (orderId: string, value: string) => {
    setManualDeliveryNotes((prev) => ({ ...prev, [orderId]: value }));
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

  /** Soft-delete from list is not allowed while payment or slip review is in progress. */
  const selectedDeletableIds = useMemo(
    () =>
      [...selected].filter((id) => {
        const o = combinedOrders.find((x: any) => x.id === id);
        return o && orderAllowsOwnerListRemoval(o.status);
      }),
    [selected, combinedOrders]
  );
  const selectedNonDeletableCount = selected.size - selectedDeletableIds.length;

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
    const outbound = manualMessageDraft(order).trim();
    if (isManual && !outbound) {
      toast.error(t('Enter the customer delivery message above. It is required before you can approve this order.'));
      return;
    }

    setLoading(true);
    try {
      const body = isManual ? { manual_message: outbound } : {};
      const response = await fetch(`/api/orders/${order.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const j = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || t('Failed to approve order'));
      }
      const snap = roundMoney(Number(embeddedMenuItem(order)?.price ?? 0));
      setOrders((prev) =>
        prev.map((o: any) =>
          o.id === order.id
            ? { ...o, status: 'COMPLETED', revenue_amount: snap, revenue_manually_edited: false }
            : o
        )
      );
      setAppendOrders((prev) =>
        prev.map((o: any) =>
          o.id === order.id
            ? { ...o, status: 'COMPLETED', revenue_amount: snap, revenue_manually_edited: false }
            : o
        )
      );
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

  const openRevenueEdit = (order: any) => {
    setRevenueDialogOrder(order);
    setRevenueDraft(String(revenueAmountFromOrderRow(order)));
  };

  const saveRevenueEdit = async () => {
    if (!revenueDialogOrder) return;
    const n = Number(revenueDraft);
    if (!Number.isFinite(n) || n < 0) {
      toast.error(t('Enter a valid amount'));
      return;
    }
    setRevenueSaving(true);
    try {
      const res = await fetch(`/api/orders/${revenueDialogOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revenue_amount: roundMoney(n) }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; revenue_amount?: number };
      if (!res.ok) throw new Error(j.error || t('Could not save'));
      const nextAmt = j.revenue_amount ?? roundMoney(n);
      setOrders((prev) =>
        prev.map((o: any) =>
          o.id === revenueDialogOrder.id
            ? { ...o, revenue_amount: nextAmt, revenue_manually_edited: true }
            : o
        )
      );
      setAppendOrders((prev) =>
        prev.map((o: any) =>
          o.id === revenueDialogOrder.id
            ? { ...o, revenue_amount: nextAmt, revenue_manually_edited: true }
            : o
        )
      );
      toast.success(t('Revenue updated'));
      setRevenueDialogOrder(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Could not save'));
    } finally {
      setRevenueSaving(false);
    }
  };

  const deleteOne = async (order: any) => {
    if (!orderAllowsOwnerListRemoval(order.status)) {
      toast.error(
        t(
          'This order is still in progress. Use Reject for slips, or wait until payment is done — you cannot hide it from the list yet.'
        )
      );
      return;
    }
    if (
      !confirm(
        t(
          'Remove this order from your history? It will disappear from this list. Completed sales still count toward your revenue totals.'
        )
      )
    ) {
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
    if (selectedDeletableIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedDeletableIds }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        deleted?: number;
        skipped_pending?: number;
      };
      if (!res.ok) throw new Error(j.error || t('Bulk delete failed'));
      const skipped = j.skipped_pending ?? 0;
      toast.success(
        `${t('Deleted')} ${j.deleted ?? selectedDeletableIds.length} ${t('order(s)')}` +
          (skipped > 0 ? ` (${skipped} ${t('in progress — not removed')})` : '')
      );
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

  const renderSlipButton = (order: any) => {
    if (!order.slip_image_url) {
      return <span className="text-xs text-zinc-500">—</span>;
    }
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 whitespace-nowrap text-xs"
        onClick={() => setSlipDialogOrderId(order.id)}
      >
        {t('View slip')}
      </Button>
    );
  };

  /** Manual products: one short block under the order — same row on desktop, no second table row. */
  const renderManualInline = (order: any) => {
    if (order.status !== 'SLIP_SUBMITTED' || embeddedMenuItem(order)?.type !== 'MANUAL_DELIVERY') {
      return null;
    }
    const templateHint = menuPlainTemplate(order);
    return (
      <div className="mt-3 max-w-md space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
          {t('Message to buyer (sent after Approve)')}
        </p>
        {templateHint ? (
          <details className="rounded-md border border-zinc-200 bg-zinc-50/80 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
            <summary className="cursor-pointer select-none px-2 py-1.5 text-[11px] font-medium">
              {t('Product template in Menu (copy if useful)')}
            </summary>
            <div className="border-t border-zinc-200 px-2 py-2 text-[11px] leading-relaxed whitespace-pre-wrap dark:border-zinc-700">
              {templateHint}
            </div>
          </details>
        ) : null}
        <Textarea
          aria-label={t('Message to buyer (sent after Approve)')}
          rows={4}
          value={manualMessageDraft(order)}
          onChange={(e) => setManualOutboundText(order.id, e.target.value)}
          placeholder={t('Bank details, links, or instructions for the buyer…')}
          className="min-h-[96px] resize-y border-zinc-300 bg-white text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
        {manualApproveBlocked(order) ? (
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            {t('Add a short message above to enable Approve.')}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-600 outline-none ring-offset-2 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        {t('Back to dashboard')}
      </Link>

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
            <span className="font-medium text-zinc-900 dark:text-white">{selected.size}</span>{' '}
            {t(
              'selected — hidden from this list only; revenue from completed sales is unchanged. Customers are not notified.'
            )}
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
              disabled={loading || selectedDeletableIds.length === 0}
              title={
                selectedDeletableIds.length === 0 && selected.size > 0
                  ? t(
                      'Selected orders are still in progress (payment or slip). Use Reject or wait — they cannot be hidden from the list yet.'
                    )
                  : undefined
              }
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
            {t(
              'Tap View slip to check the payment proof, add your message to the buyer if the product needs it, then Approve. Use tabs for orders that need review.'
            )}
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
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-zinc-900 dark:text-white">
                              {order.telegram_username || order.telegram_user_id}
                            </p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {embeddedMenuItem(order)?.name || '—'}
                            </p>
                          </div>
                          <div className="shrink-0 self-start">{renderSlipButton(order)}</div>
                        </div>
                        {renderManualInline(order)}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span className="tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
                            {formatCurrencyAmount(Number(embeddedMenuItem(order)?.price || 0), currency)}
                          </span>
                          {orderCountsTowardRevenue(order.status) ? (
                            <>
                              <span>·</span>
                              <span className="tabular-nums text-zinc-700 dark:text-zinc-300">
                                {t('Revenue')}: {formatCurrencyAmount(revenueAmountFromOrderRow(order), currency)}
                              </span>
                              <button
                                type="button"
                                className="text-[11px] font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
                                onClick={() => openRevenueEdit(order)}
                              >
                                {t('Edit')}
                              </button>
                            </>
                          ) : null}
                          <span>·</span>
                          <span className="tabular-nums">{formatOrderTimestamp(order.created_at)}</span>
                        </div>
                        <div>{statusBadge(order.status)}</div>
                        {order.status === 'SLIP_SUBMITTED' ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="border border-zinc-500 bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                                disabled={loading || manualApproveBlocked(order)}
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
                        {orderAllowsOwnerListRemoval(order.status) ? (
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
                        ) : null}
                      </div>
                    </div>
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
                  <table className="w-full min-w-[940px] border-collapse text-sm">
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
                        <th className="min-w-[7rem] px-2 py-3 whitespace-nowrap">{t('Revenue')}</th>
                        <th className="min-w-[9rem] px-2 py-3 whitespace-nowrap">{t('Time')}</th>
                        <th className="px-2 py-3">{t('Slip')}</th>
                        <th className="min-w-[8rem] px-2 py-3">{t('Status')}</th>
                        <th className="min-w-[9rem] px-2 py-3">{t('Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                      {combinedOrders.map((order: any) => (
                          <tr key={order.id} className="align-middle text-zinc-800 dark:text-zinc-200">
                            <td className="px-2 py-3">
                              <input
                                type="checkbox"
                                checked={selected.has(order.id)}
                                onChange={() => toggleOne(order.id)}
                                className="h-4 w-4 rounded border-zinc-600"
                                aria-label={`Select order ${order.id.slice(0, 8)}`}
                              />
                            </td>
                            <td className="max-w-[18rem] px-2 py-3 align-top">
                              <p className="font-medium text-zinc-900 dark:text-white">
                                {order.telegram_username || order.telegram_user_id}
                              </p>
                              <p className="break-words text-zinc-600 dark:text-zinc-400">{embeddedMenuItem(order)?.name || '—'}</p>
                              {renderManualInline(order)}
                            </td>
                            <td className="px-2 py-3 tabular-nums whitespace-nowrap">
                              {formatCurrencyAmount(Number(embeddedMenuItem(order)?.price || 0), currency)}
                            </td>
                            <td className="px-2 py-3 align-top text-xs whitespace-nowrap">
                              {orderCountsTowardRevenue(order.status) ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
                                    {formatCurrencyAmount(revenueAmountFromOrderRow(order), currency)}
                                  </span>
                                  {order.revenue_manually_edited ? (
                                    <span className="text-[10px] text-zinc-500">{t('Edited manually')}</span>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="w-fit text-left text-[11px] font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
                                    onClick={() => openRevenueEdit(order)}
                                  >
                                    {t('Edit revenue')}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-zinc-500">—</span>
                              )}
                            </td>
                            <td className="px-2 py-3 tabular-nums text-xs text-zinc-500 whitespace-nowrap">
                              {formatOrderTimestamp(order.created_at)}
                            </td>
                            <td className="px-2 py-3 align-top">{renderSlipButton(order)}</td>
                            <td className="px-2 py-3">{statusBadge(order.status)}</td>
                            <td className="px-2 py-3">
                              {order.status === 'SLIP_SUBMITTED' ? (
                                <div className="flex flex-col gap-1.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 border border-zinc-500 bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                                    disabled={loading || manualApproveBlocked(order)}
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
                              {orderAllowsOwnerListRemoval(order.status) ? (
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
                              ) : null}
                            </td>
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

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-white">{t('Delete selected orders?')}</DialogTitle>
            <DialogDescription className="space-y-2 text-zinc-500">
              <p>
                {t('Hides')}{' '}
                <strong className="text-zinc-700 dark:text-zinc-300">{selectedDeletableIds.length}</strong>{' '}
                {t(
                  'order row(s) from this list. Revenue from completed sales stays in your totals. Customers are not messaged on Telegram.'
                )}
              </p>
              {selectedNonDeletableCount > 0 ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {selectedNonDeletableCount}{' '}
                  {t(
                    'selected order(s) are still waiting for payment or slip review and will stay on the list. Use Reject for slips.'
                  )}
                </p>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button
              className="border border-red-900/50 bg-red-950/40 text-red-100 hover:bg-red-950/60"
              onClick={deleteSelected}
              disabled={loading || selectedDeletableIds.length === 0}
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

      <Dialog
        open={slipDialogOrderId != null}
        onOpenChange={(open) => {
          if (!open) setSlipDialogOrderId(null);
        }}
      >
        <DialogContent className="max-w-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-white">{t('Payment slip')}</DialogTitle>
            <DialogDescription className="text-zinc-500">
              {t('Order')}{' '}
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                #{slipDialogOrderId?.slice(0, 8) ?? '—'}
              </span>
            </DialogDescription>
          </DialogHeader>
          {slipDialogOrderId ? (
            <div className="max-h-[min(70vh,520px)] overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              <OrderSlipMedia orderId={slipDialogOrderId} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!revenueDialogOrder}
        onOpenChange={(o) => {
          if (!o) {
            setRevenueDialogOrder(null);
            setRevenueDraft('');
          }
        }}
      >
        <DialogContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-white">{t('Edit recorded revenue')}</DialogTitle>
            <DialogDescription className="text-zinc-500">
              {t(
                'This amount is used in your dashboard totals and shop stats. The product price column is unchanged.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="revenue-edit" className="text-zinc-700 dark:text-zinc-300">
              {t('Amount')}
            </Label>
            <Input
              id="revenue-edit"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={revenueDraft}
              onChange={(e) => setRevenueDraft(e.target.value)}
              className="border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setRevenueDialogOrder(null)} disabled={revenueSaving}>
              {t('Cancel')}
            </Button>
            <Button onClick={() => void saveRevenueEdit()} disabled={revenueSaving}>
              {revenueSaving ? t('Saving…') : t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cleanupBots.length > 0 ? (
        <section className="space-y-3 pt-2">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t('Order archive')}</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {t(
                'Hide old completed and rejected rows from your list. Revenue from completed sales stays in totals. Customers are not notified.'
              )}
            </p>
          </div>
          <OrderHistoryCleanup bots={cleanupBots} />
        </section>
      ) : null}
    </div>
  );
}
