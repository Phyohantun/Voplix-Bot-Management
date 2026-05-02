'use client';

import { useEffect, useState } from 'react';
import type { AdminUserRow } from '@/lib/admin-users-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatDateTimeUtc } from '@/lib/format-date-utc';

function RowEditor({
  row,
  onSaved,
  onDeleted,
}: {
  row: AdminUserRow;
  onSaved: (next: AdminUserRow) => void;
  onDeleted: (userId: string) => void;
}) {
  const [status, setStatus] = useState(row.account_status);
  const [plan, setPlan] = useState(row.plan_tier);
  const [broadcast, setBroadcast] = useState(row.can_use_broadcast);
  const [stock, setStock] = useState(row.can_use_stock);
  const [orders, setOrders] = useState(row.can_use_orders);
  const [notes, setNotes] = useState(row.admin_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setStatus(row.account_status);
    setPlan(row.plan_tier);
    setBroadcast(row.can_use_broadcast);
    setStock(row.can_use_stock);
    setOrders(row.can_use_orders);
    setNotes(row.admin_notes ?? '');
  }, [row]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_status: status,
          plan_tier: plan,
          can_use_broadcast: broadcast,
          can_use_stock: stock,
          can_use_orders: orders,
          admin_notes: notes.trim() || null,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; account?: Record<string, unknown> };
      if (!res.ok) {
        throw new Error(j.error || 'Save failed');
      }
      toast.success('Saved');
      const a = j.account;
      if (a) {
        onSaved({
          ...row,
          account_status: String(a.account_status),
          plan_tier: String(a.plan_tier),
          can_use_broadcast: Boolean(a.can_use_broadcast),
          can_use_stock: Boolean(a.can_use_stock),
          can_use_orders: Boolean(a.can_use_orders),
          admin_notes: (a.admin_notes as string | null) ?? null,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async () => {
    const label = row.email || row.id;
    if (!window.confirm(`Permanently delete user ${label}? This removes their Supabase auth account and related data.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${row.id}`, { method: 'DELETE' });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(j.error || 'Delete failed');
      }
      toast.success('User deleted');
      onDeleted(row.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <tr className="border-b border-zinc-800 align-top">
      <td className="px-3 py-3 text-sm text-zinc-300">
        <div className="font-medium text-white">{row.email || '—'}</div>
        <div className="mt-1 font-mono text-[11px] text-zinc-500">{row.id}</div>
      </td>
      <td className="px-3 py-3 text-xs text-zinc-400">{formatDateTimeUtc(row.created_at)}</td>
      <td className="px-3 py-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white"
        >
          <option value="pending">pending</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
        </select>
      </td>
      <td className="px-3 py-3">
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white"
        >
          <option value="free">free</option>
          <option value="pro">pro</option>
          <option value="plus">plus</option>
        </select>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1 text-xs text-zinc-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} />
            Broadcast
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={stock} onChange={(e) => setStock(e.target.checked)} />
            Stock
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={orders} onChange={(e) => setOrders(e.target.checked)} />
            Orders
          </label>
        </div>
      </td>
      <td className="px-3 py-3">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal note"
          className="border-zinc-700 bg-zinc-900 text-sm text-white placeholder:text-zinc-600"
        />
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={saving || deleting}
            onClick={save}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-red-800 text-red-400 hover:bg-red-950/50"
            disabled={saving || deleting}
            onClick={removeUser}
          >
            {deleting ? 'Deleting…' : 'Delete user'}
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function AdminUsersTable({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const [rows, setRows] = useState(initialUsers);

  useEffect(() => {
    setRows(initialUsers);
  }, [initialUsers]);

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full min-w-[960px] border-collapse text-left">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2">Signed up</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Plan</th>
            <th className="px-3 py-2">Features</th>
            <th className="px-3 py-2">Notes</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <RowEditor
              key={row.id}
              row={row}
              onSaved={(next) => setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)))}
              onDeleted={(id) => setRows((prev) => prev.filter((r) => r.id !== id))}
            />
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-zinc-500">No users found.</p>
      ) : null}
    </div>
  );
}
