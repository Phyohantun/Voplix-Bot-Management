import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import {
  getPlatformAdminEmail,
  verifyPlatformAdminPassword,
  signPlatformAdminToken,
  adminCookieOptions,
} from '@/lib/admin-auth';
import { PLATFORM_ADMIN_COOKIE } from '@/lib/admin-constants';
import { isAdminLoginRateLimited } from '@/lib/admin-login-rate-limit';

export async function POST(request: Request) {
  const h = await headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';

  if (isAdminLoginRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  if (!process.env.PLATFORM_ADMIN_EMAIL?.trim()) {
    return NextResponse.json(
      { error: 'Server missing PLATFORM_ADMIN_EMAIL (add to .env.local or host env)' },
      { status: 503 }
    );
  }
  if (!process.env.PLATFORM_ADMIN_PASSWORD_HASH?.trim()) {
    return NextResponse.json(
      {
        error:
          'Server missing PLATFORM_ADMIN_PASSWORD_HASH (use b64:... line from scripts/hash-platform-admin-password.mjs to avoid $ mangling in .env)',
      },
      { status: 503 }
    );
  }

  const expectedEmail = getPlatformAdminEmail();

  if (email !== expectedEmail) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[admin/login] 401: email mismatch. Form (normalized):',
        JSON.stringify(email),
        '— .env PLATFORM_ADMIN_EMAIL (normalized):',
        JSON.stringify(expectedEmail)
      );
    }
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const ok = await verifyPlatformAdminPassword(password);
  if (!ok) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[admin/login] 401: password mismatch. Use the same plain password you passed to hash-platform-admin-password.mjs. If the hash in .env is wrong, re-generate and paste the full line inside double quotes (bcrypt uses $).'
      );
    }
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  let token: string;
  try {
    token = await signPlatformAdminToken();
  } catch {
    return NextResponse.json({ error: 'Admin session signing failed (check PLATFORM_ADMIN_JWT_SECRET)' }, { status: 503 });
  }

  const jar = await cookies();
  jar.set(PLATFORM_ADMIN_COOKIE, token, adminCookieOptions());

  return NextResponse.json({ success: true });
}
