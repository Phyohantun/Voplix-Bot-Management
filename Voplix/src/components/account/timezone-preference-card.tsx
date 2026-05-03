'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TIMEZONE_OPTIONS } from '@/lib/shop-timezone';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function TimezonePreferenceCard({ initialTimezone }: { initialTimezone: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialTimezone);
  const [loading, setLoading] = useState(false);
  const dirty = value !== initialTimezone;

  useEffect(() => {
    setValue(initialTimezone);
  }, [initialTimezone]);

  const onSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_timezone: value }),
      });
      if (!response.ok) {
        const j = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Could not save timezone');
      }
      toast.success('Timezone updated');
      const supabase = createClient();
      await supabase.auth.refreshSession();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save timezone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">Report timezone</CardTitle>
        <CardDescription className="text-zinc-500">
          Used for date ranges in reports and timestamps where a single timezone is shown. Does not change Telegram
          message times.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {TIMEZONE_OPTIONS.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue(opt.value)}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                  selected
                    ? 'border-zinc-900 bg-zinc-100 dark:border-zinc-200 dark:bg-zinc-800/80'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/40'
                )}
              >
                <span className="font-medium text-zinc-900 dark:text-white">{opt.label}</span>
                <p className="mt-0.5 font-mono text-xs text-zinc-500">{opt.value}</p>
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
          {loading ? 'Saving…' : 'Save timezone'}
        </Button>
      </CardContent>
    </Card>
  );
}
