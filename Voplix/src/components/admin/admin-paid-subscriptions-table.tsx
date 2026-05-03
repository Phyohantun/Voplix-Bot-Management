'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AdminUserRow } from '@/lib/admin-users-list';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDateTimeUtc } from '@/lib/format-date-utc';

function isActivePaid(row: AdminUserRow): boolean {
  if (row.plan_tier !== 'pro' && row.plan_tier !== 'plus') return false;
  if (!row.subscription_period_end) return true;
  return new Date(row.subscription_period_end) > new Date();
}

export function AdminPaidSubscriptionsTable({ initialRows }: { initialRows: AdminUserRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const paidRows = useMemo(() => rows.filter((r) => r.plan_tier === 'pro' || r.plan_tier === 'plus'), [rows]);

  const patchUser = async (userId: string, body: Record<string, unknown>, okMsg: string) => {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; account?: Record<string, unknown> };
      if (!res.ok) throw new Error(j.error || 'Request failed');
      const a = j.account;
      if (a) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === userId
              ? {
                  ...r,
                  plan_tier: String(a.plan_tier),
                  subscription_period_end:
                    typeof a.subscription_period_end === 'string' && a.subscription_period_end.trim()
                      ? a.subscription_period_end
                      : null,
                  can_use_broadcast: Boolean(a.can_use_broadcast),
                }
              : r
          )
        );
      }
      toast.success(okMsg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusyId(null);
    }
  };

  const extend30 = (userId: string) => {
    void patchUser(userId, { extend_subscription_days: 30 }, 'Extended by 30 days');
  };

  const cancelPaid = (userId: string) => {
    if (!window.confirm('Downgrade this account to Free and clear the billing period?')) return;
    void patchUser(userId, { cancel_paid_subscription: true }, 'Subscription cancelled');
  };

  if (paidRows.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 text-center text-sm text-zinc-500">
        No Pro or Plus accounts yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-2">Customer</th>
            <th className="px-3 py-2">Plan</th>
            <th className="px-3 py-2">Period end</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2"> </th>
          </tr>
        </thead>
        <tbody>
          {paidRows.map((r) => (
            <tr key={r.id} className="border-b border-zinc-800/80 align-top">
              <td className="px-3 py-3 text-zinc-300">
                <div className="font-medium text-white">{r.email || '—'}</div>
                <div className="mt-0.5 font-mono text-[11px] text-zinc-500">{r.id}</div>
              </td>
              <td className="px-3 py-3 capitalize text-zinc-300">{r.plan_tier}</td>
              <td className="px-3 py-3 text-xs text-zinc-400">
                {r.subscription_period_end ? formatDateTimeUtc(r.subscription_period_end) : '— (no expiry)'}
              </td>
              <td className="px-3 py-3 text-xs">
                {isActivePaid(r) ? (
                  <span className="text-emerald-400">Active</span>
                ) : (
                  <span className="text-amber-300">Lapsed (Free limits)</span>
                )}
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-zinc-600 text-zinc-200"
                    disabled={busyId === r.id}
                    onClick={() => extend30(r.id)}
                  >
                    +30 days
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-red-900/60 text-red-300 hover:bg-red-950/40"
                    disabled={busyId === r.id}
                    onClick={() => cancelPaid(r.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
