import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { PLATFORM_ADMIN_COOKIE } from '@/lib/admin-constants';
import { readMaintenanceModeOn } from '@/lib/maintenance-cache';

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value, c);
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/webhook')) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  const isAdminUi = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');
  if (isAdminUi || isAdminApi) {
    if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
      return NextResponse.next({
        request: { headers: request.headers },
      });
    }
    if (pathname === '/api/admin/login' || pathname.startsWith('/api/admin/login')) {
      return NextResponse.next({
        request: { headers: request.headers },
      });
    }

    const secret = process.env.PLATFORM_ADMIN_JWT_SECRET;
    if (!secret || secret.length < 32) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Platform admin is not configured' }, { status: 503 });
      }
      return new NextResponse('Platform admin is not configured (set PLATFORM_ADMIN_JWT_SECRET)', {
        status: 503,
      });
    }

    const token = request.cookies.get(PLATFORM_ADMIN_COOKIE)?.value;
    if (!token) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      if (payload.role !== 'platform_admin') {
        throw new Error('invalid role');
      }
    } catch {
      if (isAdminApi) {
        const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        res.cookies.delete(PLATFORM_ADMIN_COOKIE);
        return res;
      }
      const res = NextResponse.redirect(new URL('/admin/login', request.url));
      res.cookies.delete(PLATFORM_ADMIN_COOKIE);
      return res;
    }

    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  const maintenanceOn = await readMaintenanceModeOn();
  if (maintenanceOn) {
    const exempt =
      pathname === '/maintenance' ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/api/admin') ||
      pathname.startsWith('/api/webhook') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/_next') ||
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname.startsWith('/login/') ||
      pathname.startsWith('/signup/');

    if (!exempt) {
      if (
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/subscription') ||
        pathname.startsWith('/onboarding')
      ) {
        return NextResponse.redirect(new URL('/maintenance', request.url));
      }
      if (pathname.startsWith('/api/')) {
        const apiExempt =
          pathname.startsWith('/api/webhook/') ||
          pathname.startsWith('/api/admin/') ||
          pathname.startsWith('/api/auth/') ||
          pathname.startsWith('/api/debug/');
        if (!apiExempt) {
          return NextResponse.json({ error: 'Maintenance mode — try again shortly.' }, { status: 503 });
        }
      }
    }
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if ((pathname === '/login' || pathname === '/signup') && user) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/subscription',
    '/onboarding/:path*',
    '/maintenance',
    '/login',
    '/signup',
    '/api/:path*',
  ],
};
