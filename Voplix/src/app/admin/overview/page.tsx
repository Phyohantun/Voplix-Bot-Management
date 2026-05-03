import Link from 'next/link';
import { AdminHeader } from '@/components/admin/admin-header';
import { loadAdminOverviewStats } from '@/lib/admin-overview-stats';
import { formatDateTimeUtc } from '@/lib/format-date-utc';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  let stats: Awaited<ReturnType<typeof loadAdminOverviewStats>> | null = null;
  let err: string | null = null;
  try {
    stats = await loadAdminOverviewStats();
  } catch (e) {
    err = e instanceof Error ? e.message : 'Failed to load overview';
  }

  return (
    <>
      <AdminHeader title="Overview" />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <p className="max-w-2xl text-sm text-zinc-400">
          Morning check: pending slips live on{' '}
          <Link href="/admin/subscriptions" className="text-zinc-200 underline-offset-2 hover:underline">
            Subscriptions
          </Link>
          . MRR uses active paid seats × prices from{' '}
          <Link href="/admin/settings" className="text-zinc-200 underline-offset-2 hover:underline">
            Settings
          </Link>
          .
        </p>

        {err ? (
          <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">{err}</p>
        ) : stats ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Total users', String(stats.totalUsers)],
                ['Active bots', String(stats.activeBots)],
                ['Pending slips', String(stats.pendingSlips)],
                ['MRR (MMK)', stats.mrrMmk.toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              Paying seats: {stats.payingProCount} Pro @ settings price, {stats.payingPlusCount} Plus. Lapsed (past
              period end) are excluded from MRR.
            </p>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Recent signups</h2>
              <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2">Signed up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentSignups.map((u) => (
                      <tr key={u.id} className="border-b border-zinc-800/80">
                        <td className="px-3 py-2 text-zinc-200">{u.email || '—'}</td>
                        <td className="px-3 py-2 text-zinc-400">{u.display_name || '—'}</td>
                        <td className="px-3 py-2 capitalize text-zinc-400">{u.plan_tier}</td>
                        <td className="px-3 py-2 text-xs text-zinc-500">{formatDateTimeUtc(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {stats.recentSignups.length === 0 ? (
                  <p className="p-6 text-center text-sm text-zinc-500">No users yet.</p>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}
