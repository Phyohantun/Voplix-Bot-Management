'use client';

import Link from 'next/link';
import { useDashboardActivityOptional } from '@/components/dashboard/dashboard-activity-context';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export function DashboardAlertStrip() {
  const ctx = useDashboardActivityOptional();
  const { t } = useLanguage();
  if (!ctx) return null;

  const { pendingSlipOrders, unreadAnnouncements } = ctx;
  if (pendingSlipOrders <= 0 && unreadAnnouncements <= 0) return null;

  return (
    <div className="border-b border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 lg:max-w-none">
        {pendingSlipOrders > 0 ? (
          <span>
            <span className="font-semibold tabular-nums">{pendingSlipOrders}</span>{' '}
            {pendingSlipOrders === 1 ? t('order awaiting slip review') : t('orders awaiting slip review')}
            {' — '}
            <Link href="/orders" className="font-medium underline-offset-2 hover:underline">
              {t('Open Orders')}
            </Link>
          </span>
        ) : null}
        {unreadAnnouncements > 0 ? (
          <span>
            {t('Unread announcements:')}{' '}
            <span className="font-semibold tabular-nums">{unreadAnnouncements}</span>
            {' — '}
            <span className="text-amber-900/90 dark:text-amber-200/90">{t('Use the bell icon in the header.')}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
