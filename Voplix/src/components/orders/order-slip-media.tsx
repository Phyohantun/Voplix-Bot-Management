'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

type Phase = 'loading' | 'ok' | 'error';

export function OrderSlipMedia({
  orderId,
  className,
  imgClassName,
}: {
  orderId: string;
  className?: string;
  imgClassName?: string;
}) {
  const { t } = useLanguage();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [phase, setPhase] = useState<Phase>('loading');

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/slip`, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setPhase('error');
          return;
        }
        const ct = (res.headers.get('Content-Type') || '').toLowerCase();
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setBlobUrl(url);
        setShowPdf(ct.includes('pdf'));
        setPhase('ok');
      } catch {
        if (!cancelled) setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [orderId]);

  const directUrl = `/api/orders/${orderId}/slip`;

  if (phase === 'loading') {
    return (
      <div className={className}>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('Loading slip…')}</p>
      </div>
    );
  }

  if (phase === 'error' || !blobUrl) {
    return (
      <div className={className}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('Could not load slip.')}</p>
        <a
          href={directUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
        >
          {t('Open slip in new tab')}
        </a>
      </div>
    );
  }

  if (showPdf) {
    return (
      <div className={className}>
        <iframe
          title={t('Payment slip')}
          src={blobUrl}
          className={cn('h-[min(70vh,520px)] w-full max-w-full rounded-md border border-zinc-200 dark:border-zinc-700')}
        />
        <a
          href={directUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
        >
          {t('Open slip in new tab')}
        </a>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={blobUrl}
        alt={t('Payment slip')}
        className={cn('mx-auto max-h-[min(70vh,420px)] w-full max-w-md object-contain', imgClassName)}
      />
    </div>
  );
}
