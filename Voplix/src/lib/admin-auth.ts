import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { PLATFORM_ADMIN_COOKIE } from '@/lib/admin-constants';
const COOKIE_MAX_AGE_SEC = 60 * 60 * 8; // 8 hours

function jwtSecretKey(): Uint8Array {
  const s = process.env.PLATFORM_ADMIN_JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('PLATFORM_ADMIN_JWT_SECRET must be set to a random string of at least 32 characters');
  }
  return new TextEncoder().encode(s);
}

export async function signPlatformAdminToken(): Promise<string> {
  return new SignJWT({ role: 'platform_admin', v: 1 })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_SEC}s`)
    .sign(jwtSecretKey());
}

export async function verifyPlatformAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, jwtSecretKey());
    return payload.role === 'platform_admin';
  } catch {
    return false;
  }
}

export async function getPlatformAdminFromCookies(): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(PLATFORM_ADMIN_COOKIE)?.value;
  if (!raw) return false;
  return verifyPlatformAdminToken(raw);
}

export function getPlatformAdminEmail(): string {
  const e = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if (!e) {
    throw new Error('PLATFORM_ADMIN_EMAIL is not set');
  }
  return e;
}

/** Strip CRLF and outer quotes from a .env value. */
export function normalizePasswordHashFromEnv(raw: string): string {
  let h = raw.trim().replace(/\r/g, '');
  if ((h.startsWith('"') && h.endsWith('"')) || (h.startsWith("'") && h.endsWith("'"))) {
    h = h.slice(1, -1).trim();
  }
  return h;
}

/**
 * Reads bcrypt hash from PLATFORM_ADMIN_PASSWORD_HASH.
 * Prefer prefix `b64:` + base64(hash) so `.env` never needs `$` (many loaders mangle `$2b$...`).
 */
export function resolvePasswordHashFromEnv(): string | null {
  const raw = process.env.PLATFORM_ADMIN_PASSWORD_HASH;
  if (!raw?.trim()) return null;
  const v = normalizePasswordHashFromEnv(raw);
  if (v.startsWith('b64:')) {
    try {
      return Buffer.from(v.slice(4), 'base64').toString('utf8').trim();
    } catch {
      return null;
    }
  }
  return v;
}

export async function verifyPlatformAdminPassword(plain: string): Promise<boolean> {
  const hash = resolvePasswordHashFromEnv();
  if (!hash) {
    throw new Error('PLATFORM_ADMIN_PASSWORD_HASH is not set (bcrypt hash of your admin password)');
  }
  if (!hash.startsWith('$2')) {
    console.warn(
      '[admin-auth] After loading PLATFORM_ADMIN_PASSWORD_HASH, value does not look like bcrypt ($2a$/$2b$). Use b64: form from scripts/hash-platform-admin-password.mjs output.'
    );
  }
  return bcrypt.compare(plain, hash);
}

export function adminCookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE_SEC,
  };
}
