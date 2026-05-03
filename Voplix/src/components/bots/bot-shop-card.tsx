'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChatCircle, CheckCircle, LinkSimple, ChartLine, Copy } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DeleteBotButton } from '@/components/bots/delete-bot-button';
import { ReconnectWebhookButton } from '@/components/bots/reconnect-webhook-button';
import { formatCurrencyVerbose, type ShopCurrency } from '@/lib/currency';
import type { BotCardStats } from '@/lib/bots-page-stats';

function relOrder(iso: string | null, t: (key: string) => string) {
  if (!iso) return t('No orders yet');
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t('Last order just now');
  if (m < 60) return t('Last order {m}m ago').replace('{m}', m.toString());
  const h = Math.floor(m / 60);
  if (h < 48) return t('Last order {h}h ago').replace('{h}', h.toString());
  const d = Math.floor(h / 24);
  return t('Last order {d}d ago').replace('{d}', d.toString());
}

export function BotShopCard({
  bot,
  stats,
  currency,
}: {
  bot: { id: string; bot_username: string; created_at: string; is_active: boolean; webhook_set: boolean };
  stats: BotCardStats;
  currency: ShopCurrency;
}) {
  const [copied, setCopied] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const { t } = useLanguage();
  const link = `https://t.me/${bot.bot_username}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success(t('Link copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('Could not copy'));
    }
  };

  const healthy = bot.webhook_set;

  return (
    <>
      <Card
        className={cn(
          'group flex flex-col rounded-xl border bg-zinc-50 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:bg-zinc-900/50',
          healthy ? 'border-zinc-200 dark:border-zinc-800' : 'border-red-400/70 dark:border-red-500/50'
        )}
      >
        <div
          className={cn(
            'rounded-t-xl px-4 py-2 text-center text-xs font-semibold',
            healthy
              ? 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200'
              : 'animate-pulse-orange bg-red-500/15 text-red-800 dark:bg-red-950/40 dark:text-red-200'
          )}
        >
          {healthy ? t('Webhook connected — receiving messages') : t('Webhook needs setup — tap Reconnect')}
        </div>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-zinc-200/70 dark:border-zinc-700/80 dark:bg-zinc-800/60">
                <ChatCircle className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate text-base font-medium text-zinc-900 dark:text-white">
                  @{bot.bot_username}
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  {t('Added ')}{new Date(bot.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'shrink-0 border font-normal',
                bot.is_active
                  ? 'border-zinc-600 bg-zinc-200/60 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200'
                  : 'border-zinc-300 dark:border-zinc-700 text-zinc-500'
              )}
            >
              {bot.is_active ? t('Active') : t('Inactive')}
            </Badge>
          </div>
          <div className="mt-3 grid gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <p>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{stats.orderCount.toLocaleString('en-US')}</span>
              {t(' orders total')}
            </p>
            <p>
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                {formatCurrencyVerbose(Math.round(stats.revenueCompleted), currency)}
              </span>
              {t(' earned (completed)')}
            </p>
            <p className="text-zinc-500">{relOrder(stats.lastOrderAt, t)}</p>
          </div>
        </CardHeader>
        <CardContent className="mt-auto flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copyLink} className="border-indigo-300 text-indigo-800 hover:bg-indigo-50 dark:border-indigo-600/50 dark:text-indigo-200 dark:hover:bg-indigo-950/40">
              {copied ? <CheckCircle className="mr-1.5 h-4 w-4 text-emerald-500" weight="fill" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? t('Copied!') : t('Share bot link')}
            </Button>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <LinkSimple className="mr-1.5 h-4 w-4" />
              {t('Open t.me')}
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatsOpen(true)}
              className="border-zinc-300 dark:border-zinc-600"
            >
              <ChartLine className="mr-1.5 h-4 w-4" />
              {t('View stats')}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/menu?bot=${bot.id}`} className="contents">
              <Button variant="outline" className="h-9 border-zinc-300 text-xs font-medium dark:border-zinc-700">
                {t('Menu')}
              </Button>
            </Link>
            <Link href={`/orders?bot=${bot.id}`} className="contents">
              <Button variant="outline" className="h-9 border-zinc-300 text-xs font-medium dark:border-zinc-700">
                {t('Orders')}
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <ReconnectWebhookButton botId={bot.id} />
          </div>
          <div className="flex justify-end border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <DeleteBotButton botId={bot.id} botUsername={bot.bot_username} />
          </div>
        </CardContent>
      </Card>

      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="max-w-md border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-white">@{bot.bot_username}</DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400">{t('Shop performance snapshot')}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm text-zinc-800 dark:text-zinc-200">
            <li className="flex justify-between gap-4">
              <span className="text-zinc-500">{t('Total orders')}</span>
              <span className="font-semibold tabular-nums">{stats.orderCount.toLocaleString('en-US')}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-zinc-500">{t('Revenue (completed)')}</span>
              <span className="font-semibold tabular-nums">{formatCurrencyVerbose(Math.round(stats.revenueCompleted), currency)}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-zinc-500">{t('Last order')}</span>
              <span className="text-right font-medium">{stats.lastOrderAt ? new Date(stats.lastOrderAt).toLocaleString() : '—'}</span>
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
