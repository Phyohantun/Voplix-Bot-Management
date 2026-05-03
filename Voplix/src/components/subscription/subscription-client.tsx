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
  subscriptionCurrentPeriodStart,
  bankHtml,
  pending,
  pendingSlipUrl,
  planSnapshot,
  supportWhatsappUrl,
  priceProMmk,
  pricePlusMmk,
  promptpayUrl,
  lastRejection,
  multiMonthTelegramUser,
}: {
  userEmail: string;
  currentPlan: string;
  subscriptionPeriodEnd: string | null;
  subscriptionCurrentPeriodStart: string | null;
  bankHtml: string;
  pending: Pending;
  pendingSlipUrl: string | null;
  planSnapshot: PlanEnforcementSnapshot;
  supportWhatsappUrl: string;
  priceProMmk: number;
  pricePlusMmk: number;
  promptpayUrl: string | null;
  lastRejection: LastRejection;
  /** Telegram username (no @) for multi-month purchases; opens https://t.me/{user} */
  multiMonthTelegramUser: string;
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
  const tgUser = multiMonthTelegramUser.replace(/^@/, '').trim() || 'ismecy';
  const tgUrl = `https://t.me/${tgUser}`;
  const tgLabel = `@${tgUser}`;

  const planTableRows = useMemo(
    () =>
      PLAN_COMPARISON_ROWS.filter((r) => r.feature !== 'Price').concat([
        {
          feature: 'Price',
          free: `0 MMK`,
          pro: `${priceProMmk.toLocaleString()} MMK / mo`,
          plus: `${pricePlusMmk.toLocaleString()} MMK / mo`,
        },
      ]),
    [priceProMmk, pricePlusMmk]
  );

  const planCardRing = (active: boolean) =>
    cn(
      'flex flex-col rounded-xl border p-4 shadow-sm transition-shadow dark:bg-zinc-950/60',
      active
        ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500 dark:border-indigo-500 dark:bg-indigo-950/20'
        : 'border-zinc-200 bg-white dark:border-zinc-700'
    );

  const renewalExpiryLine = () => {
    if (!subscriptionPeriodEnd?.trim()) {
      return (
        <span className="text-zinc-700 dark:text-zinc-300">
          {planSnapshot.plan === 'free' ? t('— (Free plan)') : t('No fixed end date')}
        </span>
      );
    }
    const expired =
      planSnapshot.paid_period_lapsed || new Date(subscriptionPeriodEnd).getTime() <= Date.now();
    return (
      <span className="text-zinc-900 dark:text-white">
        {formatDateTimeUtc(subscriptionPeriodEnd)}
        {expired ? (
          <span className="ml-2 font-normal text-amber-700 dark:text-amber-300">({t('Expired')})</span>
        ) : null}
      </span>
    );
  };

  const showUpgradeCta = planSnapshot.plan !== 'plus' || planSnapshot.paid_period_lapsed;

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-4 border-b border-zinc-200 pb-8 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">{t('Subscription')}</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="text-zinc-500">{t('Signed in as')}</span>{' '}
            <span className="font-mono text-zinc-800 dark:text-zinc-200">{userEmail || '—'}</span>
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t('Renewal / expiry')}</p>
          {planSnapshot.plan !== 'free' && subscriptionCurrentPeriodStart?.trim() ? (
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t('Current period started')}</span>{' '}
              <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatDateTimeUtc(subscriptionCurrentPeriodStart)}
              </span>
            </p>
          ) : null}
          <p
            className={`text-sm font-medium tabular-nums text-zinc-900 dark:text-white ${
              planSnapshot.plan !== 'free' && subscriptionCurrentPeriodStart?.trim() ? 'mt-2' : 'mt-1.5'
            }`}
          >
            {planSnapshot.plan !== 'free' ? (
              <>
                <span className="mr-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{t('Access ends')}</span>
              </>
            ) : null}
            {renewalExpiryLine()}
          </p>
          {planSnapshot.plan !== 'free' && subscriptionPeriodEnd && !planSnapshot.paid_period_lapsed ? (
            <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t('Pro/Plus access ends at the time above unless you renew before then.')}
            </p>
          ) : null}
        </div>
      </header>

      <Card className="border-indigo-200/80 bg-indigo-50/40 dark:border-indigo-900/50 dark:bg-indigo-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">{t('Monthly billing')}</CardTitle>
          <CardDescription className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {t(
              'Pro and Plus prices are for one month of access. When your payment slip is approved, one month is added automatically to your renewal date at the top of this page. If you already have time left, the new month is added after that date.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <p>
            {t('Want three or more months in a single payment?')}{' '}
            {t('Message us on Telegram:')}{' '}
            <a
              href={tgUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
            >
              {tgLabel}
            </a>
            .
          </p>
        </CardContent>
      </Card>

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
          {showUpgradeCta ? (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="#upgrade"
                className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {t('Upgrade below')}
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-4" id="plans-overview">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t('Plans at a glance')}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t('Billing is manual: bank transfer each period. We verify your slip. Cards are not stored and nothing is charged automatically.')}{' '}
            {t('Each approved slip on this page extends access by one month.')}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className={planCardRing(tier === 'free')}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{t('Free')}</p>
              {tier === 'free' ? (
                <span className="shrink-0 rounded-full bg-indigo-600/15 px-2 py-0.5 text-[11px] font-medium text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-200">
                  {t('Your current plan')}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-white">0 MMK</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('No monthly fee')}</p>
            <ul className="mt-4 space-y-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              <li>{t('1 bot · up to 5 products · 50 orders per month')}</li>
              <li>{t('Manual fulfillment only; no digital stock or auto-send')}</li>
            </ul>
          </div>
          <div className={planCardRing(tier === 'pro')}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{t('Pro')}</p>
              {tier === 'pro' ? (
                <span className="shrink-0 rounded-full bg-indigo-600/15 px-2 py-0.5 text-[11px] font-medium text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-200">
                  {t('Your current plan')}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-white">
              {priceProMmk.toLocaleString()} MMK
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('per month')}</p>
            <ul className="mt-4 space-y-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              <li>{t('2 bots; unlimited products and orders')}</li>
              <li>{t('Digital auto-delivery, stock, and editable bot message templates')}</li>
            </ul>
          </div>
          <div className={planCardRing(tier === 'plus')}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{t('Plus')}</p>
              {tier === 'plus' ? (
                <span className="shrink-0 rounded-full bg-indigo-600/15 px-2 py-0.5 text-[11px] font-medium text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-200">
                  {t('Your current plan')}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-white">
              {pricePlusMmk.toLocaleString()} MMK
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('per month')}</p>
            <ul className="mt-4 space-y-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              <li>{t('5 bots; same product and order limits as Pro')}</li>
              <li>{t('Broadcast campaigns and custom post-delivery messages')}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-2" id="compare">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t('Plan comparison')}</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {t('These limits are enforced in the app. Paid prices are the MMK amounts set for this platform.')}
        </p>
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
                  {planTableRows.map((row) => (
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
              {t(
                'Renew by bank transfer before access ends (see renewal date at the top). Cards are not stored; there are no automatic charges.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <p className="font-medium text-zinc-900 dark:text-white">{t('On this tier:')}</p>
            <ul className="list-inside list-disc space-y-1">
              <li>{t('Up to 5 bots and unlimited products / orders')}</li>
              <li>{t('Broadcast to past customers')}</li>
              <li>{t('Custom reply after order confirmed')}</li>
              <li>{t('VIP support tier')}</li>
            </ul>
          </CardContent>
        </Card>
      ) : !pending ? (
        <Card className="border-zinc-200 dark:border-zinc-800" id="upgrade">
          <CardHeader>
            <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">{t('Upgrade with bank transfer')}</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">
              {t('Pick Pro or Plus, pay one month’s fee with the details on this page, then upload your slip. When we approve it, your plan and paid end date update automatically for one month.')}
              {' '}
              {t('For several months at once, use Telegram:')}{' '}
              <a
                href={tgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
              >
                {tgLabel}
              </a>
              .
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
                        <li>{t('Full reports (daily, weekly, monthly)')}</li>
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
                        <li>{t('Broadcast campaigns')}</li>
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
