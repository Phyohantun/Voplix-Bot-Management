'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatDateTimeUtc } from '@/lib/format-date-utc';

export type SubscriptionRequestRow = {
  id: string;
  user_id: string;
  requester_email: string;
  plan_tier: string;
  slip_storage_path: string;
  status: string;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export function AdminSubscriptionsClient({
  initialBankHtml,
  initialRequests,
  loadWarnings = [],
}: {
  initialBankHtml: string;
  initialRequests: SubscriptionRequestRow[];
  loadWarnings?: string[];
}) {
  const router = useRouter();
  const [bankHtml, setBankHtml] = useState(initialBankHtml);
  const [rows, setRows] = useState<SubscriptionRequestRow[]>(initialRequests);
  const [savingBank, setSavingBank] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setBankHtml(initialBankHtml);
  }, [initialBankHtml]);

  useEffect(() => {
    setRows(initialRequests);
  }, [initialRequests]);

  const refreshList = async (opts?: { silent?: boolean }) => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/subscription-requests', { cache: 'no-store' });
      const j = (await res.json().catch(() => ({}))) as { requests?: SubscriptionRequestRow[]; error?: string };
      if (!res.ok) {
        throw new Error(j.error || 'Refresh failed');
      }
      setRows(j.requests ?? []);
      if (!opts?.silent) {
        toast.success('List updated');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const saveBank = async () => {
    setSavingBank(true);
    try {
      const res = await fetch('/api/admin/subscription-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank_instructions_html: bankHtml }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(j.error || 'Save failed');
      }
      toast.success('Bank instructions saved');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingBank(false);
    }
  };

  const viewSlip = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/subscription-requests/${id}/view`);
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !j.url) {
        throw new Error(j.error || 'Could not open slip');
      }
      window.open(j.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open slip');
    }
  };

  const approve = async (id: string) => {
    if (!window.confirm('Approve this slip and activate the selected plan for this customer?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/subscription-requests/${id}/approve`, { method: 'POST' });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(j.error || 'Approve failed');
      }
      toast.success('Approved — plan updated');
      await refreshList({ silent: true });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    if (!window.confirm('Reject this slip? The customer keeps their current plan.')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/subscription-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: rejectNote[id]?.trim() || null }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(j.error || 'Reject failed');
      }
      toast.success('Rejected');
      await refreshList({ silent: true });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setBusyId(null);
    }
  };

  const pending = rows.filter((r) => r.status === 'pending');
  const history = rows.filter((r) => r.status !== 'pending');

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6">
      {loadWarnings.length > 0 ? (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-4 text-sm text-amber-200">
          <p className="font-medium text-amber-100">Some data could not load</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-amber-200/90">
            {loadWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-200/70">
            Run migrations <code className="rounded bg-black/30 px-1">011_platform_subscription_slips.sql</code> and{' '}
            <code className="rounded bg-black/30 px-1">012_platform_subscription_slips_bucket.sql</code> if tables or
            bucket are missing.
          </p>
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Bank &amp; payment instructions</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Shown to logged-in customers on the Subscription page. HTML supported (e.g. &lt;b&gt;, &lt;br&gt;, links).
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="bank-html" className="text-zinc-300">
            Customer-facing HTML
          </Label>
          <Textarea
            id="bank-html"
            value={bankHtml}
            onChange={(e) => setBankHtml(e.target.value)}
            rows={10}
            className="border-zinc-700 bg-zinc-950 font-mono text-sm text-zinc-100"
          />
        </div>
        <Button
          type="button"
          className="mt-4 bg-zinc-100 text-zinc-900 hover:bg-white"
          disabled={savingBank}
          onClick={saveBank}
        >
          {savingBank ? 'Saving…' : 'Save instructions'}
        </Button>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Pending slips</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Approve to set plan to Pro or Plus (Plus unlocks broadcast). Reject to decline without changing plan.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-zinc-600 text-zinc-200"
            disabled={refreshing}
            onClick={() => void refreshList()}
          >
            {refreshing ? 'Refreshing…' : 'Refresh list'}
          </Button>
        </div>

        {pending.length === 0 ? (
          <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 text-center text-sm text-zinc-500">
            No pending subscription payments.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Submitted</th>
                  <th className="px-3 py-2">Slip</th>
                  <th className="px-3 py-2">Reject note</th>
                  <th className="px-3 py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-800/80 align-top">
                    <td className="px-3 py-3 text-zinc-300">
                      <div className="font-medium text-white">{r.requester_email || '—'}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-zinc-500">{r.user_id}</div>
                    </td>
                    <td className="px-3 py-3 capitalize text-zinc-300">{r.plan_tier}</td>
                    <td className="px-3 py-3 text-xs text-zinc-500">{formatDateTimeUtc(r.created_at)}</td>
                    <td className="px-3 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-zinc-600 text-zinc-200"
                        onClick={() => viewSlip(r.id)}
                      >
                        View slip
                      </Button>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        value={rejectNote[r.id] ?? ''}
                        onChange={(e) => setRejectNote((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Optional (shown on reject)"
                        className="w-full min-w-[140px] rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-white placeholder:text-zinc-600"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-700 text-white hover:bg-emerald-600"
                          disabled={busyId === r.id}
                          onClick={() => approve(r.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-red-900/60 text-red-300 hover:bg-red-950/40"
                          disabled={busyId === r.id}
                          onClick={() => reject(r.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {history.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Recent decisions</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 30).map((r) => (
                  <tr key={r.id} className="border-b border-zinc-800/80">
                    <td className="px-3 py-2 text-zinc-300">{r.requester_email}</td>
                    <td className="px-3 py-2 capitalize text-zinc-400">{r.plan_tier}</td>
                    <td className="px-3 py-2 capitalize text-zinc-400">{r.status}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      {r.reviewed_at ? formatDateTimeUtc(r.reviewed_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
