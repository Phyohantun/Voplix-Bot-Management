'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type BotOption = { id: string; bot_username: string };

export function OrderHistoryCleanup({ bots }: { bots: BotOption[] }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [botId, setBotId] = useState(bots[0]?.id ?? '');
  const [cleanupDays, setCleanupDays] = useState(90);
  const [loading, setLoading] = useState(false);

  if (bots.length === 0) {
    return null;
  }

  const runCleanup = async () => {
    if (!botId) {
      toast.error(t('Choose a shop first'));
      return;
    }
    const msg = t(
      'Hide completed and rejected orders older than {days} days for this shop? They disappear from your list; revenue from completed sales stays in your totals.'
    ).replace('{days}', cleanupDays.toString());
    if (!confirm(msg)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/orders/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id: botId, older_than_days: cleanupDays }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        deleted?: number;
        truncated?: boolean;
      };
      if (!res.ok) {
        throw new Error(j.error || t('Cleanup failed'));
      }
      toast.success(
        j.deleted === 0
          ? t('No old finished orders matched those settings — nothing was removed.')
          : t('Hidden {count} old row(s) from your order list (revenue unchanged).').replace(
              '{count}',
              (j.deleted || 0).toString()
            ) + (j.truncated ? t(' If the list is still long, run cleanup again to remove another batch.') : '')
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Cleanup failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">{t('Order history cleanup')}</CardTitle>
        <CardDescription className="text-zinc-500">
          {t('Bulk-hide old completed and rejected rows. Waiting and in-progress orders are never affected.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cleanup-bot" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {t('Shop')}
          </Label>
          <select
            id="cleanup-bot"
            value={botId}
            onChange={(e) => setBotId(e.target.value)}
            className="h-10 w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          >
            {bots.map((b) => (
              <option key={b.id} value={b.id}>
                @{b.bot_username}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cleanup-days" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {t('Older than (days)')}
          </Label>
          <Input
            id="cleanup-days"
            type="number"
            min={7}
            max={3650}
            value={cleanupDays}
            onChange={(e) => setCleanupDays(Math.max(7, parseInt(e.target.value, 10) || 90))}
            className="h-10 max-w-md border-zinc-300 dark:border-zinc-700 bg-zinc-200/80 dark:bg-zinc-800/50 text-zinc-900 dark:text-white"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-zinc-600 bg-zinc-100 text-zinc-900 hover:bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          onClick={runCleanup}
          disabled={loading || !botId}
        >
          {loading ? t('Working…') : t('Remove old orders')}
        </Button>
      </CardContent>
    </Card>
  );
}
