'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CaretRight,
  ChatCircle,
  CheckCircle,
  Clock,
  CurrencyDollar,
  ShoppingCart,
  SpinnerGap,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatOrderTimestamp } from '@/lib/format-order';
import { formatCurrencyAmount, formatCurrencyVerbose, type ShopCurrency } from '@/lib/currency';
import type { PendingOrderRow, DashboardTrend, GettingStartedState } from '@/lib/dashboard-data';
import { AnimatedMetric } from '@/components/dashboard/animated-metric';
import { RevenueSparkline } from '@/components/dashboard/revenue-sparkline';
import { AutoRefresh } from '@/components/dashboard/auto-refresh';
import { cn } from '@/lib/utils';

export type DashboardViewModel = {
  totalBots: number;
  pendingCount: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: PendingOrderRow[];
  trends: {
    bots: DashboardTrend;
    pending: DashboardTrend;
    orders: DashboardTrend;
    revenue: DashboardTrend;
  };
  revenueSparkline: number[];
  gettingStarted: GettingStartedState;
  allComplete: boolean;
};

function TrendLine({ t }: { t: DashboardTrend }) {
  const arrow = t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '';
  const color =
    t.direction === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : t.direction === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-zinc-500';
  if (t.label === '—') {
    return <p className="text-xs text-zinc-500">{t.hint || '—'}</p>;
  }
  return (
    <p className={cn('text-xs font-medium tabular-nums', color)}>
      {arrow} {t.label} <span className="font-normal text-zinc-500">{t.hint}</span>
    </p>
  );
}

function relTime(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  return `${Math.floor(h / 24)} day${Math.floor(h / 24) === 1 ? '' : 's'} ago`;
}

export function DashboardView({
  currency,
  selectedBotId,
  loadedAtIso,
  initial,
}: {
  currency: ShopCurrency;
  selectedBotId: string | null;
  loadedAtIso: string;
  initial: DashboardViewModel;
}) {
  const router = useRouter();
  const [model, setModel] = useState(initial);
  const [slipOrderId, setSlipOrderId] = useState<string | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const lastUpdatedLabel = useMemo(() => relTime(loadedAtIso), [loadedAtIso, tick]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const approveOne = async (orderId: string) => {
    setApproveId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual_delivery_data: null }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Approve failed');
      }
      toast.success('Order approved');
      setModel((m) => ({
        ...m,
        pendingOrders: m.pendingOrders.filter((o) => o.id !== orderId),
        pendingCount: Math.max(0, m.pendingCount - 1),
        totalOrders: m.totalOrders,
        totalRevenue: m.totalRevenue,
      }));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setApproveId(null);
    }
  };

  const approveAll = async () => {
    setBulkLoading(true);
    try {
      const res = await fetch('/api/orders/bulk-approve-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id: selectedBotId }),
      });
      const j = (await res.json()) as { approved?: number; attempted?: number; failures?: string[] };
      if (!res.ok) throw new Error((j as { error?: string }).error || 'Bulk approve failed');
      toast.success(`Approved ${j.approved ?? 0} of ${j.attempted ?? 0}`);
      if (j.failures?.length) toast.message('Some orders failed', { description: j.failures.slice(0, 3).join('\n') });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk approve failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const ordersHref = `/orders${selectedBotId ? `?bot=${selectedBotId}` : ''}`;
  const menuHref = `/menu${selectedBotId ? `?bot=${selectedBotId}` : ''}`;

  if (initial.totalBots === 0) {
    return (
      <div className="space-y-8">
        <AutoRefresh intervalMs={30000} />
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-lg font-medium text-zinc-900 dark:text-white">Connect your first bot</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Add a Telegram shop to see sales, slips, and quick actions here.
          </p>
          <Link
            href="/onboarding"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Connect your first bot
          </Link>
        </div>
      </div>
    );
  }

  const gs = model.gettingStarted;

  return (
    <div className="space-y-8">
      <AutoRefresh intervalMs={30000} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">A quick view of your bot activity and sales performance.</p>
        </div>
        <p className="text-xs text-zinc-500 tabular-nums">Last updated {lastUpdatedLabel}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          className={cn(
            'rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900'
          )}
        >
          <div className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Total Bots</span>
            <ChatCircle className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">
            <AnimatedMetric value={model.totalBots} formatter={(n) => String(n)} />
          </div>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Active bots</p>
          <div className="mt-2">
            <TrendLine t={model.trends.bots} />
          </div>
        </Card>

        <Link href={ordersHref} className="block">
          <Card className="h-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-row items-center justify-between pb-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Pending Approvals</span>
              <Clock className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">
              <AnimatedMetric value={model.pendingCount} formatter={(n) => String(n)} />
            </div>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Awaiting slip verification</p>
            <div className="mt-2">
              <TrendLine t={model.trends.pending} />
            </div>
          </Card>
        </Link>

        <Card
          className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Total Orders</span>
            <ShoppingCart className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">
            <AnimatedMetric value={model.totalOrders} formatter={(n) => n.toLocaleString('en-US')} />
          </div>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">All time orders</p>
          <div className="mt-2">
            <TrendLine t={model.trends.orders} />
          </div>
        </Card>

        <Card
          className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Revenue</span>
            <CurrencyDollar className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">
            <AnimatedMetric
              value={Math.round(model.totalRevenue)}
              formatter={(n) => formatCurrencyVerbose(n, currency)}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Completed paid orders ({currency})</p>
          <div className="mt-2">
            <TrendLine t={model.trends.revenue} />
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <RevenueSparkline values={model.revenueSparkline} className="h-9 w-[120px] text-zinc-500 dark:text-zinc-400" />
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">7d</span>
          </div>
        </Card>
      </div>

      <div className={cn('grid gap-6', model.allComplete ? 'lg:grid-cols-1' : 'lg:grid-cols-2')}>
        {!model.allComplete ? (
          <Card className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-zinc-900 dark:text-white">Getting Started</CardTitle>
              <CardDescription className="text-zinc-600 dark:text-zinc-400">Steps to set up your bot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-0">
              {[
                { ok: gs.hasBot, label: 'Connect your Telegram bot' },
                { ok: gs.hasProduct, label: 'Create menu items for your products' },
                { ok: gs.hasStock, label: 'Add stock for digital products' },
                { ok: gs.hasOrder, label: 'Start receiving orders!' },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      row.ok
                        ? 'border-emerald-600/80 bg-emerald-500/15 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                    )}
                  >
                    {row.ok ? <CheckCircle className="h-4 w-4" weight="fill" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      'text-sm',
                      row.ok ? 'text-emerald-800 line-through dark:text-emerald-200/90' : 'text-zinc-700 dark:text-zinc-300'
                    )}
                  >
                    {row.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card
          className={cn(
            'rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900',
            model.allComplete && 'lg:max-w-2xl'
          )}
        >
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-zinc-900 dark:text-white">Quick Actions</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">Most-used actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-0">
            <Link
              href="/bots"
              className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm text-zinc-900 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white dark:hover:border-indigo-500/40"
            >
              <span className="flex items-center gap-3">
                <ChatCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Connect bot
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
            </Link>
            <Link
              href={menuHref}
              className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm text-zinc-900 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-white dark:hover:border-indigo-500/40"
            >
              <span className="flex items-center gap-3">
                <ShoppingCart className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Manage menu
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
            </Link>
            <Link
              href={ordersHref}
              className="group flex items-center justify-between rounded-xl border border-indigo-200/80 bg-indigo-50/80 px-4 py-3.5 text-sm font-medium text-zinc-900 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-indigo-500/30 dark:bg-indigo-950/30 dark:text-white"
            >
              <span className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="inline-flex items-center gap-2">
                  Review pending orders
                  {model.pendingCount > 0 ? (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-zinc-900">
                      {model.pendingCount}
                    </span>
                  ) : null}
                </span>
              </span>
              <CaretRight className="h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <CardHeader className="flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-zinc-900 dark:text-white">Pending Orders</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">
              Latest orders waiting for payment verification.
            </CardDescription>
          </div>
          {model.pendingOrders.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={bulkLoading}
                onClick={() => approveAll()}
                className="bg-amber-500 font-semibold text-zinc-900 hover:bg-amber-400"
              >
                {bulkLoading ? <SpinnerGap className="h-4 w-4 animate-spin" /> : null}
                Approve all
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {model.pendingOrders.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No pending orders.</p>
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {model.pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">#{order.id.slice(0, 8)}</span>
                      <span className="text-xs text-zinc-500 tabular-nums">{formatOrderTimestamp(order.created_at)}</span>
                    </div>
                    <p className="mt-2 text-zinc-800 dark:text-zinc-200">{order.menu_items?.name || '-'}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{order.telegram_username || '-'}</p>
                    <p className="mt-1 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      {formatCurrencyAmount(Number(order.menu_items?.price || 0), currency)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {order.slip_image_url ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => setSlipOrderId(order.id)}>
                          Slip
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-500"
                        disabled={approveId === order.id}
                        onClick={() => approveOne(order.id)}
                      >
                        {approveId === order.id ? <SpinnerGap className="h-4 w-4 animate-spin" /> : 'Approve'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="text-zinc-600 dark:text-zinc-400">
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="py-2 text-left font-medium">Order</th>
                      <th className="py-2 text-left font-medium">Customer</th>
                      <th className="py-2 text-left font-medium">Product</th>
                      <th className="py-2 text-left font-medium">Price</th>
                      <th className="py-2 text-left font-medium">Time</th>
                      <th className="py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.pendingOrders.map((order) => (
                      <tr key={order.id} className="border-b border-zinc-200/80 text-zinc-800 dark:border-zinc-800/70 dark:text-zinc-200">
                        <td className="py-2 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                        <td className="py-2">{order.telegram_username || '-'}</td>
                        <td className="py-2">{order.menu_items?.name || '-'}</td>
                        <td className="py-2 tabular-nums">
                          {formatCurrencyAmount(Number(order.menu_items?.price || 0), currency)}
                        </td>
                        <td className="py-2 tabular-nums text-zinc-600 dark:text-zinc-400">
                          {formatOrderTimestamp(order.created_at)}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-2">
                            {order.slip_image_url ? (
                              <Button type="button" variant="outline" size="sm" onClick={() => setSlipOrderId(order.id)}>
                                Slip
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              className="bg-emerald-600 text-white hover:bg-emerald-500"
                              disabled={approveId === order.id}
                              onClick={() => approveOne(order.id)}
                            >
                              {approveId === order.id ? <SpinnerGap className="h-4 w-4 animate-spin" /> : 'Approve'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!slipOrderId} onOpenChange={(o) => !o && setSlipOrderId(null)}>
        <DialogContent className="max-w-lg border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle>Payment slip</DialogTitle>
          </DialogHeader>
          {slipOrderId ? (
            <div className="relative max-h-[70vh] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/orders/${slipOrderId}/slip`}
                alt="Customer payment slip"
                className="mx-auto max-h-[65vh] w-auto max-w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
