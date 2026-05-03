'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useDashboardActivityOptional } from '@/components/dashboard/dashboard-activity-context';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const POLL_MS = 25_000;

export function DashboardActivityPoller() {
  const router = useRouter();
  const { t } = useLanguage();
  const ctx = useDashboardActivityOptional();
  const prevPending = useRef<number | null>(null);
  const prevUnread = useRef<number | null>(null);
  const lastAnnToastId = useRef<string | null>(null);

  useEffect(() => {
    if (!ctx) return;

    const tick = async () => {
      try {
        const res = await fetch('/api/dashboard/notifications', { cache: 'no-store' });
        const j = (await res.json().catch(() => ({}))) as {
          pendingSlipOrders?: number;
          unreadAnnouncements?: number;
          newestUnreadTitle?: string | null;
          newestUnreadId?: string | null;
          error?: string;
        };
        if (!res.ok) return;

        const p = j.pendingSlipOrders ?? 0;
        const u = j.unreadAnnouncements ?? 0;

        if (prevPending.current !== null && p > prevPending.current) {
          const d = p - prevPending.current;
          toast.message(`Orders awaiting review: ${p}`, {
            description: d === 1 ? '1 new slip to check.' : `${d} new slips to check.`,
          });
          router.refresh();
        } else if (prevPending.current !== null && p < prevPending.current) {
          router.refresh();
        }

        if (prevUnread.current !== null && u > prevUnread.current && j.newestUnreadTitle) {
          const id = j.newestUnreadId ?? '';
          if (id && lastAnnToastId.current !== id) {
            lastAnnToastId.current = id;
            toast.info(j.newestUnreadTitle, {
              description: t('Open the bell menu to read the full message.'),
            });
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('Voplix — Announcement', { body: j.newestUnreadTitle });
              } catch {
                /* ignore */
              }
            }
          }
          router.refresh();
        }

        prevPending.current = p;
        prevUnread.current = u;
        ctx.setFromPoll({ pendingSlipOrders: p, unreadAnnouncements: u });
      } catch {
        /* ignore transient network errors */
      }
    };

    const id = window.setInterval(() => void tick(), POLL_MS);
    void tick();
    return () => window.clearInterval(id);
  }, [ctx, router, t]);

  return null;
}
