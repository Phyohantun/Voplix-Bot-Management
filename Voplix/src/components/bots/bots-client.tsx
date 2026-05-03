'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { BotShopCard } from '@/components/bots/bot-shop-card';
import { PageHeader } from '@/components/dashboard/page-header';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface BotsClientProps {
  bots: any[];
  planSnapshot: any;
  statsMap: Record<string, any>;
  currency: any;
}

export function BotsClient({ bots, planSnapshot, statsMap, currency }: BotsClientProps) {
  const { t } = useLanguage();

  const addButtonClass =
    'w-full rounded-xl bg-zinc-100 px-4 py-2.5 font-medium text-zinc-900 hover:bg-white sm:w-auto dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700';

  const addBotButton = planSnapshot.canAddBot ? (
    <Link href="/onboarding">
      <Button className={addButtonClass}>
        <Plus className="mr-2 h-4 w-4" weight="bold" />
        {t('Add bot')}
      </Button>
    </Link>
  ) : (
    <Button className={addButtonClass} disabled title={t('Bot limit reached for your plan')}>
      <Plus className="mr-2 h-4 w-4" weight="bold" />
      {t('Add bot')}
    </Button>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">{t('Bots')}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('Telegram shops linked to your account.')}</p>
        </div>
        {addBotButton}
      </div>

      {!planSnapshot.canAddBot ? (
        <div
          className={`flex flex-col gap-3 rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700 dark:bg-zinc-800/80`}
        >
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {t('Your plan limit is reached:')} {planSnapshot.activeBots}/{planSnapshot.maxBots} {t('bots.')} {t('Upgrade to Plus plan.')}
          </p>
          <Link
            href="/subscription"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            {t('Upgrade plan')}
          </Link>
        </div>
      ) : null}

      {bots.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="aspect-video w-full bg-gradient-to-br from-indigo-500/15 via-zinc-100 to-zinc-300/30 dark:from-indigo-500/10 dark:via-zinc-900 dark:to-zinc-800/40">
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('See your shop in Telegram')}</p>
              <p className="max-w-md text-xs text-zinc-500 dark:text-zinc-500">
                {t('Short demo clip can be added here later (GIF / video). Connect a bot to receive /start, menu, orders, and slips in chat.')}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center px-6 py-12">
            <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-white">{t('No bots yet')}</h3>
            <p className="mb-6 max-w-sm text-center text-sm text-zinc-500 dark:text-zinc-400">
              {t('Connect a Telegram bot to sell through chat and manage orders here.')}
            </p>
            {planSnapshot.canAddBot ? (
              <Link href="/onboarding">
                <Button className={addButtonClass}>
                  <Plus className="mr-2 h-4 w-4" weight="bold" />
                  {t('Connect a bot')}
                </Button>
              </Link>
            ) : (
              <Button className={addButtonClass} disabled>
                <Plus className="mr-2 h-4 w-4" weight="bold" />
                {t('Bot limit reached')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot) => (
            <BotShopCard key={bot.id} bot={bot} stats={statsMap[bot.id] ?? { orderCount: 0, revenueCompleted: 0, lastOrderAt: null }} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}