'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Trash, Package } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatCurrencyAmount } from '@/lib/currency';
import { useShopCurrency } from '@/components/dashboard/currency-context';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export type StockLine = {
  id: string;
  content_text: string;
  is_sold: boolean;
  sold_at: string | null;
  created_at: string;
};

export type DigitalMenuWithStock = {
  id: string;
  name: string;
  price: number;
  stock_items: StockLine[] | null;
};

function normalizeStockItems(raw: DigitalMenuWithStock['stock_items']): StockLine[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function stockHealth(unsold: number) {
  if (unsold <= 0) {
    return {
      label: 'Out of stock',
      className: 'border-red-400/80 bg-red-50 text-red-950 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-100',
    };
  }
  if (unsold <= 5) {
    return {
      label: 'Low stock ⚠️',
      className:
        'border-orange-400/80 bg-orange-50 text-orange-950 dark:border-orange-700/60 dark:bg-orange-950/35 dark:text-orange-50',
    };
  }
  if (unsold <= 20) {
    return {
      label: 'Running low',
      className:
        'border-amber-400/80 bg-amber-50 text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-50',
    };
  }
  return {
    label: 'In stock ✅',
    className:
      'border-emerald-500/60 bg-emerald-50 text-emerald-950 dark:border-emerald-700/50 dark:bg-emerald-950/30 dark:text-emerald-100',
  };
}

export function StockManager({
  botId,
  initialItems,
  canManageStock = true,
}: {
  botId: string;
  initialItems: DigitalMenuWithStock[];
  canManageStock?: boolean;
}) {
  const currency = useShopCurrency();
  const { t } = useLanguage();
  const [items, setItems] = useState<DigitalMenuWithStock[]>(() =>
    initialItems.map((row) => ({
      ...row,
      stock_items: normalizeStockItems(row.stock_items),
    }))
  );
  const [activeId, setActiveId] = useState<string | null>(() => initialItems[0]?.id ?? null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [stockTab, setStockTab] = useState<'unsold' | 'sold'>('unsold');

  useEffect(() => {
    const next = initialItems.map((row) => ({
      ...row,
      stock_items: normalizeStockItems(row.stock_items),
    }));
    setItems(next);
  }, [initialItems, botId]);

  useEffect(() => {
    if (items.length === 0) {
      setActiveId(null);
      return;
    }
    setActiveId((prev) => (prev && items.some((i) => i.id === prev) ? prev : items[0].id));
  }, [items]);

  const activeRow = useMemo(() => items.find((r) => r.id === activeId) ?? null, [items, activeId]);

  const setDraft = (menuItemId: string, value: string) => {
    setDrafts((d) => ({ ...d, [menuItemId]: value }));
  };

  const addLine = async (menuItemId: string) => {
    if (!canManageStock) {
      toast.error(t('Stock management requires Pro or Plus.'));
      return;
    }
    const text = (drafts[menuItemId] ?? '').trim();
    if (!text) {
      toast.error(t('Enter the text for this stock line'));
      return;
    }

    setLoadingId(menuItemId);
    try {
      const res = await fetch('/api/stock-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_item_id: menuItemId, content_text: text }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || t('Failed'));
      }

      const json = (await res.json()) as { stockItem?: StockLine; stockItems?: StockLine[] };
      const added = json.stockItem ?? json.stockItems?.[0];
      if (!added) throw new Error(t('Invalid response'));

      setItems((prev) =>
        prev.map((row) =>
          row.id === menuItemId
            ? { ...row, stock_items: [...normalizeStockItems(row.stock_items), added] }
            : row
        )
      );
      setDrafts((d) => ({ ...d, [menuItemId]: '' }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Could not add stock line'));
    } finally {
      setLoadingId(null);
    }
  };

  const removeLine = async (menuItemId: string, stockId: string) => {
    if (!canManageStock) {
      toast.error(t('Stock management requires Pro or Plus.'));
      return;
    }
    if (!confirm(t('Remove this unsold stock line?'))) return;

    setLoadingId(stockId);
    try {
      const res = await fetch(`/api/stock-items/${stockId}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || t('Failed'));
      }

      setItems((prev) =>
        prev.map((row) =>
          row.id === menuItemId
            ? {
                ...row,
                stock_items: normalizeStockItems(row.stock_items).filter((s) => s.id !== stockId),
              }
            : row
        )
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Could not remove line'));
    } finally {
      setLoadingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-200 dark:bg-zinc-800">
            <Package className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{t('No digital products yet')}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('Add a digital product under Menu, then come back here to add codes or keys one line at a time.')}
            </p>
          </div>
          <Link
            href={`/menu?bot=${botId}`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {t('Go to Menu')}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const lines = activeRow ? normalizeStockItems(activeRow.stock_items) : [];
  const available = lines.filter((l) => !l.is_sold);
  const sold = lines.filter((l) => l.is_sold).sort((a, b) => (b.sold_at || '').localeCompare(a.sold_at || ''));
  const health = stockHealth(available.length);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          {items.length} {items.length === 1 ? t('digital product') : t('digital products')} — {t('tap a product on your phone or pick from the list on desktop.')}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/orders?bot=${botId}`}
            className="text-xs font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
          >
            {t('View orders')}
          </Link>
          <Link
            href={`/menu?bot=${botId}`}
            className="text-xs font-medium text-zinc-600 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {t('Back to menu')}
          </Link>
        </div>
      </div>

      {/* Mobile product cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:hidden">
        {items.map((row) => {
          const n = normalizeStockItems(row.stock_items).filter((l) => !l.is_sold).length;
          const h = stockHealth(n);
          const selected = row.id === activeId;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => setActiveId(row.id)}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                selected
                  ? 'border-indigo-500 bg-indigo-50/80 dark:border-indigo-500/60 dark:bg-indigo-950/30'
                  : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
              )}
            >
              <p className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-white">{row.name}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-500">
                  {row.price > 0 ? formatCurrencyAmount(row.price, currency) : t('Free')}
                </span>
                <span className={cn('rounded-md border px-2 py-0.5 text-[11px] font-medium', h.className)}>
                  {t(h.label)}
                </span>
              </div>
              <p className="mt-1 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">{n} {t('unsold')}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:rounded-xl lg:border lg:border-zinc-200 lg:bg-zinc-50 lg:dark:border-zinc-800 lg:dark:bg-zinc-950/40 lg:max-h-[min(72vh,560px)]">
          <p className="border-b border-zinc-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
            {t('Products')}
          </p>
          <div className="overflow-y-auto p-2">
            <ul className="flex flex-col gap-1.5">
              {items.map((row) => {
                const n = normalizeStockItems(row.stock_items).filter((l) => !l.is_sold).length;
                const h = stockHealth(n);
                const selected = row.id === activeId;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(row.id)}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                        selected
                          ? 'border-indigo-500 bg-indigo-50/90 dark:border-indigo-500/50 dark:bg-indigo-950/30'
                          : 'border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600'
                      )}
                    >
                      <span className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-white">{row.name}</span>
                      <span className="mt-1 flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                        <span>{row.price > 0 ? formatCurrencyAmount(row.price, currency) : t('Free')}</span>
                        <span className="tabular-nums text-zinc-700 dark:text-zinc-300">{n} {t('unsold')}</span>
                      </span>
                      <span className={cn('mt-2 inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium', h.className)}>
                        {t(h.label)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {activeRow ? (
          <section className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 lg:p-6">
            <div className="mb-4 flex flex-col gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{activeRow.name}</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {activeRow.price > 0 ? formatCurrencyAmount(activeRow.price, currency) : t('Free')}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="rounded-xl border-2 border-zinc-300 bg-zinc-50 px-5 py-3 text-center tabular-nums dark:border-zinc-700 dark:bg-zinc-950/50">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{t('Unsold units')}</p>
                  <p
                    className={cn(
                      'text-3xl font-bold leading-none',
                      available.length <= 0
                        ? 'text-red-600 dark:text-red-400'
                        : available.length <= 5
                          ? 'text-orange-600 dark:text-orange-400'
                          : available.length <= 20
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {available.length}
                  </p>
                </div>
                <span className={cn('self-center rounded-lg border px-2.5 py-1 text-xs font-medium', health.className)}>
                  {t(health.label)}
                </span>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setStockTab('unsold')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  stockTab === 'unsold'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                )}
              >
                {t('Unsold')} ({available.length})
              </button>
              <button
                type="button"
                onClick={() => setStockTab('sold')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  stockTab === 'sold'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                )}
              >
                {t('Sold')} ({sold.length})
              </button>
            </div>

            {stockTab === 'unsold' ? (
              <>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-500">{t('Add one unit')}</label>
                  <Textarea
                    value={drafts[activeRow.id] ?? ''}
                    onChange={(e) => setDraft(activeRow.id, e.target.value)}
                    placeholder={t('Paste one code, key, or delivery text per line added…')}
                    rows={3}
                    className="min-h-0 resize-y border-zinc-300 bg-zinc-50 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    disabled={!canManageStock || loadingId === activeRow.id}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="border border-zinc-600 bg-zinc-100 text-zinc-900 hover:bg-white dark:border-zinc-500 dark:bg-zinc-800 dark:text-white"
                    disabled={!canManageStock || loadingId === activeRow.id}
                    onClick={() => addLine(activeRow.id)}
                  >
                    {t('Add line')}
                  </Button>
                </div>

                <div className="mt-4">
                  {available.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('No unsold lines. Add stock using the box above.')}</p>
                  ) : (
                    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                      {available.map((line) => (
                        <li
                          key={line.id}
                          className="flex items-start gap-2 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200"
                        >
                          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words leading-relaxed">
                            {line.content_text}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="h-7 w-7 shrink-0 border-zinc-300 text-zinc-500 hover:border-red-900/50 hover:bg-red-950/20 hover:text-red-300 dark:border-zinc-700"
                            disabled={!canManageStock || loadingId === line.id}
                            onClick={() => removeLine(activeRow.id, line.id)}
                            aria-label={t('Remove line')}
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">
                  {t('Delivery text that was already assigned (newest first). Useful if a customer disputes delivery.')}
                </p>
                {sold.length === 0 ? (
                  <p className="text-sm text-zinc-600">{t('Nothing sold yet.')}</p>
                ) : (
                  <ul className="max-h-[min(50vh,420px)] space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
                    {sold.map((line) => (
                      <li
                        key={line.id}
                        className="rounded-md border border-zinc-100 bg-zinc-50 px-2 py-2 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-200"
                      >
                        <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
                          {line.sold_at ? new Date(line.sold_at).toLocaleString() : t('Sold')}
                        </p>
                        <p className="whitespace-pre-wrap break-words font-mono leading-relaxed">{line.content_text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        ) : null}
      </div>

    </div>
  );
}
