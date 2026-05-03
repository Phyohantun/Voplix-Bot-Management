'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { PlatformSubscriptionSettingsAdmin } from '@/lib/platform-subscription-settings-load';

export function AdminSettingsClient({
  initialSettings,
  initialPromptpayUrl,
}: {
  initialSettings: PlatformSubscriptionSettingsAdmin;
  initialPromptpayUrl: string | null;
}) {
  const router = useRouter();
  const [s, setS] = useState(initialSettings);
  const [promptpayPreview, setPromptpayPreview] = useState(initialPromptpayUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setS(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    setPromptpayPreview(initialPromptpayUrl);
  }, [initialPromptpayUrl]);

  const refreshQrUrl = async () => {
    const res = await fetch('/api/admin/promptpay-qr', { cache: 'no-store' });
    const j = (await res.json().catch(() => ({}))) as { url?: string | null };
    if (res.ok) setPromptpayPreview(j.url ?? null);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/subscription-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_instructions_html: s.bank_instructions_html,
          maintenance_mode: s.maintenance_mode,
          price_pro_mmk_month: s.price_pro_mmk_month,
          price_plus_mmk_month: s.price_plus_mmk_month,
          subscription_period_days: s.subscription_period_days,
          override_max_bots_free: s.override_max_bots_free,
          override_max_bots_pro: s.override_max_bots_pro,
          override_max_bots_plus: s.override_max_bots_plus,
          override_free_menu_item_cap: s.override_free_menu_item_cap,
          override_free_orders_per_month: s.override_free_orders_per_month,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || 'Save failed');
      toast.success('Settings saved');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onUploadQr = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/admin/promptpay-qr', { method: 'POST', body: fd });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || 'Upload failed');
      toast.success('PromptPay QR updated');
      await refreshQrUrl();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeQr = async () => {
    if (!window.confirm('Remove the PromptPay QR image?')) return;
    setUploading(true);
    try {
      const res = await fetch('/api/admin/promptpay-qr', { method: 'DELETE' });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || 'Remove failed');
      toast.success('QR removed');
      setPromptpayPreview(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Remove failed');
    } finally {
      setUploading(false);
    }
  };

  const num = (v: string) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-6">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Bank instructions</h2>
        <p className="mt-1 text-sm text-zinc-500">Shown on the customer Subscription page (HTML allowed).</p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="bank-html" className="text-zinc-300">
            Customer-facing HTML
          </Label>
          <Textarea
            id="bank-html"
            value={s.bank_instructions_html}
            onChange={(e) => setS((p) => ({ ...p, bank_instructions_html: e.target.value }))}
            rows={10}
            className="border-zinc-700 bg-zinc-950 font-mono text-sm text-zinc-100"
          />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">PromptPay QR</h2>
        <p className="mt-1 text-sm text-zinc-500">Optional image shown to paying customers on the Subscription page.</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="space-y-2">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(e) => void onUploadQr(e.target.files?.[0] ?? null)}
              className="max-w-xs border-zinc-700 bg-zinc-950 text-zinc-200 file:text-zinc-300"
            />
            {promptpayPreview ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-zinc-600 text-zinc-200"
                  disabled={uploading}
                  onClick={() => void removeQr()}
                >
                  Remove QR
                </Button>
              </div>
            ) : null}
          </div>
          {promptpayPreview ? (
            <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={promptpayPreview} alt="PromptPay" className="max-h-48 w-auto object-contain" />
            </div>
          ) : (
            <p className="text-sm text-zinc-600">No QR uploaded yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Billing defaults</h2>
        <p className="mt-1 text-sm text-zinc-500">Used when approving slips and for MRR on the Overview page.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-zinc-300">Pro price (MMK / month)</Label>
            <Input
              type="number"
              min={0}
              value={s.price_pro_mmk_month}
              onChange={(e) => setS((p) => ({ ...p, price_pro_mmk_month: num(e.target.value) }))}
              className="border-zinc-700 bg-zinc-950 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">Plus price (MMK / month)</Label>
            <Input
              type="number"
              min={0}
              value={s.price_plus_mmk_month}
              onChange={(e) => setS((p) => ({ ...p, price_plus_mmk_month: num(e.target.value) }))}
              className="border-zinc-700 bg-zinc-950 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">Days per approved slip (30 = one month)</Label>
            <p className="text-xs text-zinc-500">
              Each time you approve a subscription payment, this many days are added to the user’s paid access (stacked
              from their current end date if it is still in the future).
            </p>
            <Input
              type="number"
              min={1}
              max={3650}
              value={s.subscription_period_days}
              onChange={(e) => setS((p) => ({ ...p, subscription_period_days: Math.max(1, num(e.target.value)) }))}
              className="border-zinc-700 bg-zinc-950 text-white"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Plan limits (optional overrides)</h2>
        <p className="mt-1 text-sm text-zinc-500">Leave blank to use product defaults (1 / 2 / 5 bots, 5 menu items, 50 orders/mo on Free).</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              ['override_max_bots_free', 'Max bots (Free)'],
              ['override_max_bots_pro', 'Max bots (Pro)'],
              ['override_max_bots_plus', 'Max bots (Plus)'],
              ['override_free_menu_item_cap', 'Free plan menu item cap'],
              ['override_free_orders_per_month', 'Free plan orders / month'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label className="text-zinc-300">{label}</Label>
              <Input
                type="number"
                min={0}
                placeholder="(default)"
                value={s[key] == null ? '' : String(s[key])}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  setS((p) => ({
                    ...p,
                    [key]: raw === '' ? null : Math.max(0, num(raw)),
                  }));
                }}
                className="border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-600"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Maintenance mode</h2>
            <p className="mt-1 text-sm text-zinc-500">Blocks the owner dashboard, subscription page, and most APIs (webhooks still run).</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={s.maintenance_mode}
              onChange={(e) => setS((p) => ({ ...p, maintenance_mode: e.target.checked }))}
              className="h-4 w-4 rounded border-zinc-600"
            />
            Enabled
          </label>
        </div>
      </section>

      <Button
        type="button"
        className="bg-indigo-600 hover:bg-indigo-700"
        disabled={saving}
        onClick={() => void saveSettings()}
      >
        {saving ? 'Saving…' : 'Save all settings'}
      </Button>
    </div>
  );
}
