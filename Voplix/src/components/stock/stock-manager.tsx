'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatCurrencyAmount } from '@/lib/currency';
import { useShopCurrency } from '@/components/dashboard/currency-context';
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

export function StockManager({
  botId,
  initialItems,
}: {
  botId: string;
  initialItems: DigitalMenuWithStock[];
}) {
  const currency = useShopCurrency();
  const [items, setItems] = useState<DigitalMenuWithStock[]>(() =>
    initialItems.map((row) => ({
      ...row,
      stock_items: normalizeStockItems(row.stock_items),
    }))
  );
  const [activeId, setActiveId] = useState<string | null>(() => initialItems[0]?.id ?? null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [soldOpen, setSoldOpen] = useState(false);

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
    const text = (drafts[menuItemId] ?? '').trim();
    if (!text) {
      toast.error('Enter the text for this stock line');
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
        throw new Error(j.error || 'Failed');
      }

      const { stockItem } = (await res.json()) as { stockItem: StockLine };
      setItems((prev) =>
        prev.map((row) =>
          row.id === menuItemId
            ? { ...row, stock_items: [...normalizeStockItems(row.stock_items), stockItem] }
            : row
        )
      );
      setDrafts((d) => ({ ...d, [menuItemId]: '' }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add stock line');
    } finally {
      setLoadingId(null);
    }
  };

  const removeLine = async (menuItemId: string, stockId: string) => {
    if (!confirm('Remove this unsold stock line?')) return;

    setLoadingId(stockId);
    try {
      const res = await fetch(`/api/stock-items/${stockId}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Failed');
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
      toast.error(e instanceof Error ? e.message : 'Could not remove line');
    } finally {
      setLoadingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardContent className="py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          No digital products for this bot. Add a digital product under Menu, then return here.
        </CardContent>
      </Card>
    );
  }

  const lines = activeRow ? normalizeStockItems(activeRow.stock_items) : [];
  const available = lines.filter((l) => !l.is_sold);
  const sold = lines.filter((l) => l.is_sold);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          {items.length} digital product{items.length === 1 ? '' : 's'} — pick one to add or edit stock.
        </p>
        <Link
          href={`/menu?bot=${botId}`}
          className="text-xs font-medium text-zinc-600 dark:text-zinc-400 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-800 dark:text-zinc-200"
        >
          Back to menu
        </Link>
      </div>

      {/* Mobile: compact product picker */}
      <div className="lg:hidden">
        <label htmlFor="stock-product-select" className="mb-1.5 block text-xs font-medium text-zinc-500">
          Product
        </label>
        <Select value={activeId ?? undefined} onValueChange={(v) => setActiveId(v)}>
          <SelectTrigger
            id="stock-product-select"
            className="h-10 w-full border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          >
            <SelectValue placeholder="Choose product" />
          </SelectTrigger>
          <SelectContent className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 max-h-[min(50vh,280px)]">
            {items.map((row) => {
              const n = normalizeStockItems(row.stock_items).filter((l) => !l.is_sold).length;
              return (
                <SelectItem key={row.id} value={row.id} className="text-zinc-800 dark:text-zinc-200">
                  {row.name.length > 42 ? `${row.name.slice(0, 42)}…` : row.name} ({n} in stock)
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Desktop: slim scrollable list — rectangles, not huge cards */}
        <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border lg:border-zinc-200 dark:border-zinc-800 lg:rounded-lg lg:bg-zinc-100 dark:bg-zinc-950/40 lg:max-h-[min(70vh,520px)]">
          <p className="border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Products
          </p>
          <div className="overflow-y-auto p-1.5">
            <ul className="flex flex-col gap-1">
              {items.map((row) => {
                const n = normalizeStockItems(row.stock_items).filter((l) => !l.is_sold).length;
                const selected = row.id === activeId;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(row.id)}
                      className={cn(
                        'w-full rounded-md border px-2.5 py-2 text-left transition-colors',
                        selected
                          ? 'border-zinc-500 bg-zinc-200 dark:bg-zinc-800/80 text-zinc-900 dark:text-white'
                          : 'border-zinc-200 bg-transparent text-zinc-700 hover:border-zinc-400 hover:bg-zinc-200 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900'
                      )}
                    >
                      <span className="line-clamp-2 text-sm font-medium leading-snug">{row.name}</span>
                      <span className="mt-1 flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                        <span className="tabular-nums">
                          {row.price > 0 ? formatCurrencyAmount(row.price, currency) : 'Free'}
                        </span>
                        <span className="tabular-nums text-zinc-600 dark:text-zinc-400">{n} in stock</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Single editor panel — one screen height friendly */}
        {activeRow ? (
          <section className="min-w-0 flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/40 p-4">
            <div className="mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white leading-snug">{activeRow.name}</h2>
              <p className="mt-1 text-xs text-zinc-500">
                <span className="tabular-nums">
                  {activeRow.price > 0 ? formatCurrencyAmount(activeRow.price, currency) : 'Free'}
                </span>
                <span className="text-zinc-600"> · </span>
                <span className="tabular-nums">{available.length} unsold line{available.length === 1 ? '' : 's'}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500">One unit of stock (code or message)</label>
              <Textarea
                value={drafts[activeRow.id] ?? ''}
                onChange={(e) => setDraft(activeRow.id, e.target.value)}
                placeholder="Paste one code, key, or delivery text per line added…"
                rows={3}
                className="min-h-0 resize-y bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-600"
                disabled={loadingId === activeRow.id}
              />
              <Button
                type="button"
                size="sm"
                className="border border-zinc-600 bg-zinc-100 text-zinc-900 hover:bg-white"
                disabled={loadingId === activeRow.id}
                onClick={() => addLine(activeRow.id)}
              >
                Add line
              </Button>
            </div>

            <div className="mt-4">
              {available.length === 0 && sold.length === 0 ? (
                <p className="text-xs text-zinc-600">No lines yet. Add one above.</p>
              ) : available.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Unsold ({available.length})
                  </p>
                  <ul className="divide-y divide-zinc-200 dark:divide-zinc-800/80 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950/30">
                    {available.map((line) => (
                      <li
                        key={line.id}
                        className="flex items-start gap-2 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words leading-relaxed">
                          {line.content_text}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="h-7 w-7 shrink-0 border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:border-red-900/50 hover:bg-red-950/20 hover:text-red-300"
                          disabled={loadingId === line.id}
                          onClick={() => removeLine(activeRow.id, line.id)}
                          aria-label="Remove line"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {sold.length > 0 ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setSoldOpen((v) => !v)}
                    className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 hover:text-zinc-600 dark:text-zinc-400"
                  >
                    Recently sold ({sold.length}){soldOpen ? ' · hide' : ' · show'}
                  </button>
                  {soldOpen ? (
                    <ul className="mt-1.5 space-y-1 border-l border-zinc-200 dark:border-zinc-800 pl-2">
                      {sold.slice(-8).map((line) => (
                        <li key={line.id} className="text-xs text-zinc-600 line-clamp-2">
                          {line.content_text}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
