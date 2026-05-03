'use client';

import * as React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  const { t } = useLanguage();
  return (
    <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between mb-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">{t(title)}</h1>
        {description && (
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {typeof description === 'string' ? t(description) : description}
          </div>
        )}
      </div>
      {children}
    </header>
  );
}