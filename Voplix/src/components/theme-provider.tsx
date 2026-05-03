'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Marketing and auth: always light (no `dark` class, no dark styling).
 * After login (dashboard and app routes): theme defaults to light; user may switch to dark via header toggle.
 */
function isPublicLightOnlyPath(pathname: string | null): boolean {
  if (pathname == null) return false;
  if (pathname === '/') return true;
  if (pathname.startsWith('/login')) return true;
  if (pathname.startsWith('/signup')) return true;
  if (pathname.startsWith('/pricing')) return true;
  if (pathname.startsWith('/onboarding')) return true;
  if (pathname.startsWith('/profile-setup')) return true;
  return false;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const forcedTheme = useMemo(
    () => (isPublicLightOnlyPath(pathname) ? ('light' as const) : undefined),
    [pathname]
  );

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      forcedTheme={forcedTheme}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
