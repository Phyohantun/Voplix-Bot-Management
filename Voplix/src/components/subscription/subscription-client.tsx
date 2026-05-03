'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { formatDateTimeUtc } from '@/lib/format-date-utc';
import { PLAN_COMPARISON_ROWS } from '@/lib/plan-comparison-data';
import type { PlanEnforcementSnapshot } from '@/lib/plan-limits';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

type Pending = { id: string; plan_tier: string; created_at: string } | null;

type LastRejection = { plan_tier: string; admin_notes: string | null; reviewed_at: string | null } | null;

export function SubscriptionClient({
  userEmail,
  currentPlan,
  subscriptionPeriodEnd,
  bankHtml,
  pending,
  pendingSlipUrl,
  planSnapshot,
  supportWhatsappUrl,
  priceProMmk,
  pricePlusMmk,
  promptpayUrl,
  lastRejection,
}: {
  userEmail: string;
  currentPlan: string;
  subscriptionPeriodEnd: string | null;
  bankHtml: string;
  pending: Pending;
  pendingSlipUrl: string | null;
  planSnapshot: PlanEnforcementSnapshot;
  supportWhatsappUrl: string;
  priceProMmk: number;
  pricePlusMmk: number;
  promptpayUrl: string | null;
  lastRejection: LastRejection;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [plan, setPlan] = useState<'pro' | 'plus'>(currentPlan === 'free' ? 'pro' : 'plus');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tier = currentPlan.toLowerCase();
  const showPro = tier === 'free';
  const showPlus = tier === 'free' || tier === 'pro';
  const atTop = tier === 'plus';

  const ordersCap = planSnapshot.maxOrdersPerMonth;
  const ordersUsed = planSnapshot.ordersThisMonth;
  const ordersPct = ordersCap == null ? 0 : Math.min(100, Math.round((ordersUsed / ordersCap) * 100));
  const barWarm = ordersCap != null && ordersPct >= 80;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) {
      toast.error(t('You already have a request in review.'));
      return;
    }
    if (atTop) return;
    if (!file) {
      toast.error(t('Choose a payment slip file (photo or PDF).'));
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set('plan_tier', plan);
      fd.set('slip', file);
      const res = await fetch('/api/subscription/request', { method: 'POST', body: fd });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(j.error || t('Submit failed'));
      }
      toast.success(t('Slip submitted. We will review it shortly.'));
      setFile(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('Submit failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const planLabel = useMemo(() => currentPlan.toUpperCase(), [currentPlan]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">{t('Subscription')}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t('Signed in as')} <span className="font-medium text-zinc-800 dark:text-zinc-200">{userEmail}</span>.{' '}
            {t(`Plans: Free · Pro (${priceProMmk.toLocaleString()} MMK) · Plus (${pricePlusMmk.toLocaleString()} MMK).`)}{' '}
            <Link href="/pricing" className="text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400">
              {t('Full marketing page')}
            </Link>
          </p>
        </div>
      </header>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">{t('Current plan')}</CardTitle>
          <CardDescription className="text-zinc-600 dark:text-zinc-400">
            <span className="text-lg font-semibold tracking-wide text-zinc-900 dark:text-white">{planLabel}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {planSnapshot.paid_period_lapsed ? (
            <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
              {t(
                'Your paid period has ended. You are on Free limits until you renew. Submit a new slip below or contact support.'
              )}
            </div>
          ) : null}
          {ordersCap != null ? (
            <div>
              <div className="mb-1 flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span>{t('Orders this month')}</span>
                <span className="tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
                  {ordersUsed} / {ordersCap}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={cn('h-full rounded-full transition-all', barWarm ? 'bg-amber-500' : 'bg-indigo-600')}
                  style={{ width: `${ordersPct}%` }}
                />
              </div>
              {barWarm ? (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/90">
                  {t("You are close to this month's order cap on the Free plan.")}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('Orders: unlimited on your current plan.')}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{t('Paid access until:')}</span>{' '}
              {subscriptionPeriodEnd
                ? formatDateTimeUtc(subscriptionPeriodEnd)
                : tier === 'free'
                  ? t('— (upgrade to start a paid period)')
                  : t('No fixed end date')}
            </p>
            {!atTop ? (
              <Link
                href="#upgrade"
                className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {t('Upgrade below')}
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-2" id="compare">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t('Plan comparison')}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('Same limits as our public pricing — no need to leave this page.')}</p>
        <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-950/50">
                    <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">{t('Feature')}</th>
                    <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">{t('Free')}</th>
                    <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">{t('Pro')}</th>
                    <th className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">{t('Plus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {PLAN_COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature} className="text-zinc-800 dark:text-zinc-200">
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{t(row.feature)}</td>
                      <td className="px-3 py-2 tabular-nums">{row.free}</td>
                      <td className="px-3 py-2 tabular-nums">{row.pro}</td>
                      <td className="px-3 py-2 tabular-nums">{row.plus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {lastRejection?.reviewed_at ? (
        <Card className="border-red-200 bg-red-50/40 dark:border-red-900/50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-red-900 dark:text-red-200">
              {t('Latest payment request was not approved')}
            </CardTitle>
            <CardDescription className="text-sm text-red-800/90 dark:text-red-200/80">
              {t('Plan requested:')}{' '}
              <span className="font-medium uppercase">{lastRejection.plan_tier}</span>
              {lastRejection.reviewed_at ? (
                <>
                  {' '}
                  · {formatDateTimeUtc(lastRejection.reviewed_at)}
                </>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-red-950 dark:text-red-100/90">
            {lastRejection.admin_notes?.trim() ? (
              <p>
                <span className="font-medium">{t('Reason:')}</span> {lastRejection.admin_notes.trim()}
              </p>
            ) : (
              <p>{t('No reason was provided. You can submit a new slip after correcting the payment.')}</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {bankHtml.trim() ? (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">{t('Payment details')}</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">
              {t('Transfer in MMK (or as instructed), then upload your slip below.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200 [&_a]:text-indigo-600 dark:[&_a]:text-indigo-400"
              dangerouslySetInnerHTML={{ __html: bankHtml }}
            />
            {promptpayUrl ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('PromptPay QR')}</p>
                <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={promptpayUrl} alt={t('PromptPay QR')} className="max-h-56 w-full bg-zinc-100 object-contain dark:bg-zinc-900" />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardContent className="pt-6 text-sm text-amber-900 dark:text-amber-200/90">
            {t('Payment instructions are not configured yet. Your platform admin should add bank / QR details in the admin console under')} <span className="font-medium">{t('Settings')}</span>.
          </CardContent>
        </Card>
      )}

      {pending ? (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">{t('Under review')}</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">
              {t('Your')} {pending.plan_tier.toUpperCase()} {t('payment slip is waiting for manual approval. You will keep your current plan until it is approved.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-xs text-zinc-500 dark:text-zinc-500">{t('Submitted')} {formatDateTimeUtc(pending.created_at)}</p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{t('Typical review time:')}</span> {t('usually within 24 hours on business days.')}
            </p>
            {supportWhatsappUrl ? (
              <a
                href={supportWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-md border border-emerald-600 bg-transparent px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
              >
                {t('Contact support (WhatsApp)')}
              </a>
            ) : null}
            {pendingSlipUrl ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t('Your submitted slip')}</p>
                <a
                  href={pendingSlipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-sm font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
                >
                  {t('Open slip in new tab')}
                </a>
                {pendingSlipUrl.match(/\.(jpg|jpeg|png|webp)(\?|$)/i) ? (
                  <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pendingSlipUrl} alt={t('Submitted slip')} className="max-h-64 w-full object-contain bg-zinc-100 dark:bg-zinc-900" />
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {atTop ? (
        <Card className="border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/40 dark:bg-indigo-950/25">
          <CardHeader>
            <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">{t('You are on Plus')}</CardTitle>
            <CardDescription className="text-zinc-700 dark:text-zinc-300">
              {t('Thank you for using Voplix. Your subscription renews manually after each bank transfer cycle — there is no automatic card charge in this release.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <p className="font-medium text-zinc-900 dark:text-white">{t('Included with Plus')}</p>
            <ul className="list-inside list-disc space-y-1">
              <li>{t('Up to 5 bots and unlimited products / orders')}</li>
              <li>{t('Broadcast to past customers')}</li>
              <li>{t('Advanced analytics & sales vs last month')}</li>
              <li>{t('VIP support tier')}</li>
            </ul>
          </CardContent>
        </Card>
      ) : !pending ? (
        <Card className="border-zinc-200 dark:border-zinc-800" id="upgrade">
          <CardHeader>
            <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">{t('Upgrade with bank transfer')}</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">
              {t('Choose a plan, pay using the details above, then attach your slip. Our team activates your account after verification.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-zinc-700 dark:text-zinc-300">{t('Plan')}</Label>
                <div className="flex flex-col gap-3">
                  {showPro ? (
                    <label
                      className={cn(
                        'flex cursor-pointer flex-col gap-1 rounded-lg border px-3 py-3 dark:border-zinc-700',
                        plan === 'pro' ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/30' : 'border-zinc-200 dark:border-zinc-700'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="plan"
                          value="pro"
                          checked={plan === 'pro'}
                          onChange={() => setPlan('pro')}
                          className="border-zinc-400"
                        />
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {t(`Pro — ${priceProMmk.toLocaleString()} MMK / month`)}
                        </span>
                      </div>
                      <ul className="ml-6 list-inside list-disc text-xs text-zinc-600 dark:text-zinc-400">
                        <li>{t('2 bots, unlimited orders')}</li>
                        <li>{t('Auto delivery & stock management')}</li>
                        <li>{t('Full reports & exports')}</li>
                      </ul>
                    </label>
                  ) : null}
                  {showPlus ? (
                    <label
                      className={cn(
                        'flex cursor-pointer flex-col gap-1 rounded-lg border px-3 py-3 dark:border-zinc-700',
                        plan === 'plus' ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/30' : 'border-zinc-200 dark:border-zinc-700'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="plan"
                          value="plus"
                          checked={plan === 'plus'}
                          onChange={() => setPlan('plus')}
                          className="border-zinc-400"
                        />
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {t(`Plus — ${pricePlusMmk.toLocaleString()} MMK / month`)}
                        </span>
                      </div>
                      <ul className="ml-6 list-inside list-disc text-xs text-zinc-600 dark:text-zinc-400">
                        <li>{t('Everything in Pro')}</li>
                        <li>{t('5 bots')}</li>
                        <li>{t('Broadcast & advanced analytics')}</li>
                      </ul>
                    </label>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slip" className="text-zinc-700 dark:text-zinc-300">
                  {t('Payment slip')}
                </Label>
                <input
                  id="slip"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-300 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-zinc-500">{t('JPG, PNG, WebP, or PDF · max 5 MB')}</p>
              </div>

              <Button
                type="submit"
                disabled={submitting || !bankHtml.trim()}
                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {submitting ? t('Uploading…') : t('Submit for review')}
              </Button>
              {!bankHtml.trim() ? (
                <p className="text-center text-xs text-zinc-500">{t('Submit stays disabled until payment details are configured.')}</p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
