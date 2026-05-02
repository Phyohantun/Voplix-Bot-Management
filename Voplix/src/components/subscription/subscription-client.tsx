'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { formatDateTimeUtc } from '@/lib/format-date-utc';

type Pending = { id: string; plan_tier: string; created_at: string } | null;

export function SubscriptionClient({
  userEmail,
  currentPlan,
  bankHtml,
  pending,
}: {
  userEmail: string;
  currentPlan: string;
  bankHtml: string;
  pending: Pending;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<'pro' | 'plus'>(currentPlan === 'free' ? 'pro' : 'plus');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tier = currentPlan.toLowerCase();
  const showPro = tier === 'free';
  const showPlus = tier === 'free' || tier === 'pro';
  const atTop = tier === 'plus';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) {
      toast.error('You already have a request in review.');
      return;
    }
    if (atTop) return;
    if (!file) {
      toast.error('Choose a payment slip file (photo or PDF).');
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
        throw new Error(j.error || 'Submit failed');
      }
      toast.success('Slip submitted. We will review it shortly.');
      setFile(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Subscription</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as <span className="font-medium text-zinc-800 dark:text-zinc-200">{userEmail}</span>. Plans: Free ·
          Pro (45,000 MMK) · Plus (65,000 MMK).{' '}
          <Link href="/pricing" className="text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400">
            Compare features
          </Link>
        </p>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">Current plan</CardTitle>
          <CardDescription className="capitalize text-zinc-600 dark:text-zinc-400">{currentPlan}</CardDescription>
        </CardHeader>
      </Card>

      {bankHtml.trim() ? (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">Payment details</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">
              Transfer in MMK (or as instructed), then upload your slip below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200 [&_a]:text-indigo-600 dark:[&_a]:text-indigo-400"
              dangerouslySetInnerHTML={{ __html: bankHtml }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardContent className="pt-6 text-sm text-amber-900 dark:text-amber-200/90">
            Payment instructions are not configured yet. Your platform admin should add bank / QR details in the admin
            console under <span className="font-medium">Subscriptions & bank</span>.
          </CardContent>
        </Card>
      )}

      {pending ? (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">Under review</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">
              Your {pending.plan_tier.toUpperCase()} payment slip is waiting for manual approval. You will keep your
              current plan until it is approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-zinc-500 dark:text-zinc-500">
            Submitted {formatDateTimeUtc(pending.created_at)}
          </CardContent>
        </Card>
      ) : null}

      {atTop ? (
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          You are on the highest plan. Thank you for using Voplix.
        </p>
      ) : !pending ? (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">Upgrade with bank transfer</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">
              Choose a plan, pay using the details above, then attach your slip. Our team activates your account after
              verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-zinc-700 dark:text-zinc-300">Plan</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {showPro ? (
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700">
                      <input
                        type="radio"
                        name="plan"
                        value="pro"
                        checked={plan === 'pro'}
                        onChange={() => setPlan('pro')}
                        className="border-zinc-400"
                      />
                      <span className="text-sm text-zinc-800 dark:text-zinc-200">Pro — 45,000 MMK / mo</span>
                    </label>
                  ) : null}
                  {showPlus ? (
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700">
                      <input
                        type="radio"
                        name="plan"
                        value="plus"
                        checked={plan === 'plus'}
                        onChange={() => setPlan('plus')}
                        className="border-zinc-400"
                      />
                      <span className="text-sm text-zinc-800 dark:text-zinc-200">Plus — 65,000 MMK / mo</span>
                    </label>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slip" className="text-zinc-700 dark:text-zinc-300">
                  Payment slip
                </Label>
                <input
                  id="slip"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-300 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-zinc-500">JPG, PNG, WebP, or PDF · max 5 MB</p>
              </div>

              <Button
                type="submit"
                disabled={submitting || !bankHtml.trim()}
                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {submitting ? 'Uploading…' : 'Submit for review'}
              </Button>
              {!bankHtml.trim() ? (
                <p className="text-center text-xs text-zinc-500">Submit stays disabled until payment details are configured.</p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
