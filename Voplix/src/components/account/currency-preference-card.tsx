'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CURRENCY_OPTIONS,
  formatCurrencyAmount,
  type ShopCurrency,
} from '@/lib/currency';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface CurrencyPreferenceCardProps {
  initialCurrency: ShopCurrency;
}

export function CurrencyPreferenceCard({ initialCurrency }: CurrencyPreferenceCardProps) {
  const router = useRouter();
  const [value, setValue] = useState<ShopCurrency>(initialCurrency);
  const [loading, setLoading] = useState(false);
  const dirty = value !== initialCurrency;

  useEffect(() => {
    setValue(initialCurrency);
  }, [initialCurrency]);

  const onSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_currency: value }),
      });
      if (!response.ok) {
        const j = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Could not save currency');
      }
      toast.success('Currency updated');
      const supabase = createClient();
      await supabase.auth.refreshSession();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save currency');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">
          Shop currency
        </CardTitle>
        <CardDescription className="text-zinc-500">
          How prices are shown in your dashboard, menu, orders, and your Telegram shop. Enter product
          prices in this same unit — we do not convert between currencies.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-1">
          {CURRENCY_OPTIONS.map((opt) => {
            const selected = value === opt.value;
            const example = formatCurrencyAmount(1250, opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue(opt.value)}
                className={cn(
                  'flex w-full flex-col rounded-lg border px-4 py-3 text-left transition-colors',
                  selected
                    ? 'border-zinc-900 bg-zinc-100 dark:border-zinc-200 dark:bg-zinc-800/80'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-zinc-600'
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-zinc-900 dark:text-white">{opt.label}</span>
                  <span className="shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-xs text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {opt.value}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">{opt.description}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Example: <span className="font-medium text-zinc-700 dark:text-zinc-300">{example}</span>
                </p>
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          onClick={onSave}
          disabled={loading || !dirty}
          className="w-full bg-zinc-900 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {loading ? 'Saving…' : 'Save currency'}
        </Button>
      </CardContent>
    </Card>
  );
}
