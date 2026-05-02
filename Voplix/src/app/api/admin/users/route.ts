import { NextResponse } from 'next/server';
import { listAllUsersWithPlatformAccounts } from '@/lib/admin-users-list';

export async function GET() {
  try {
    const users = await listAllUsersWithPlatformAccounts();
    return NextResponse.json({ users });
  } catch (e) {
    console.error('[GET /api/admin/users]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list users' },
      { status: 500 }
    );
  }
}
