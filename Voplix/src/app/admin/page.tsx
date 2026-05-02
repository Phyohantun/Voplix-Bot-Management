import Link from 'next/link';
import { listAllUsersWithPlatformAccounts } from '@/lib/admin-users-list';
import { AdminUsersTable } from '@/components/admin/admin-users-table';
import { AdminHeader } from '@/components/admin/admin-header';

export default async function AdminHomePage() {
  let loadError: string | null = null;
  let users: Awaited<ReturnType<typeof listAllUsersWithPlatformAccounts>> = [];

  try {
    users = await listAllUsersWithPlatformAccounts();
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Failed to load users';
  }

  return (
    <>
      <AdminHeader
        title="Platform admin"
        nav={[
          { href: '/admin', label: 'Customers' },
          { href: '/admin/subscriptions', label: 'Subscriptions & bank' },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <p className="mb-6 max-w-3xl text-sm text-zinc-400">
          Customers can use the app after signup. Use <span className="text-zinc-200">suspended</span> to block dashboard
          access, <span className="text-zinc-200">pending</span> as an optional label, and feature toggles where wired.
          Subscription slips and bank text:{' '}
          <Link href="/admin/subscriptions" className="text-zinc-200 underline-offset-2 hover:underline">
            Subscriptions & bank
          </Link>
          .
        </p>
        {loadError ? (
          <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">{loadError}</p>
        ) : (
          <AdminUsersTable initialUsers={users} />
        )}
      </div>
    </>
  );
}
