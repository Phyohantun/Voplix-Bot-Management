import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PLATFORM_ADMIN_COOKIE } from '@/lib/admin-constants';

export async function POST() {
  const jar = await cookies();
  jar.delete(PLATFORM_ADMIN_COOKIE);
  return NextResponse.json({ success: true });
}
