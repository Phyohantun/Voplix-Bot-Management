import { listAllUsersWithPlatformAccounts } from '@/lib/admin-users-list';
import { AdminUsersTable } from '@/components/admin/admin-users-table';
import { AdminHeader } from '@/components/admin/admin-header';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  let loadError: string | null = null;
  let users: Awaited<ReturnType<typeof listAllUsersWithPlatformAccounts>> = [];

  try {
    users = await listAllUsersWithPlatformAccounts();
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Failed to load users';
  }

  return (
    <>
      <AdminHeader title="Users" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <p className="mb-6 max-w-3xl text-sm text-zinc-400">
          Search by email or display name. Suspend to block dashboard access, or delete to remove the Supabase account
          entirely.
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
