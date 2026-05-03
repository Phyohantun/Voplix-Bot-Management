'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export function FreePlanUpgradeBanner({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60',
        className
      )}
    >
      <p className="text-sm text-zinc-800 dark:text-zinc-200">
        {t('You are on the')} <span className="font-medium">{t('Free')}</span> {t('plan. Upgrade for unlimited products, digital stock, and higher order limits.')}
      </p>
      <Link
        href="/subscription"
        className="mt-2 inline-flex text-sm font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
      >
        {t('View plans and upgrade')}
      </Link>
    </div>
  );
}
