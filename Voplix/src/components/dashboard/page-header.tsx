'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Show a link to /dashboard above the title (e.g. Menu when user landed without context). */
  dashboardBack?: boolean;
}

export function PageHeader({ title, description, children, dashboardBack }: PageHeaderProps) {
  const { t } = useLanguage();
  return (
    <header className="mb-4 flex flex-col gap-3">
      {dashboardBack ? (
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-600 outline-none ring-offset-2 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {t('Back to dashboard')}
        </Link>
      ) : null}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">{t(title)}</h1>
          {description && (
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {typeof description === 'string' ? t(description) : description}
            </div>
          )}
        </div>
        {children}
      </div>
    </header>
  );
}