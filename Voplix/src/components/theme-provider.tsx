'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Owner app (dashboard) only: theme toggle and persisted light/dark preference apply here.
 * Marketing (/), /pricing, /login, /signup, /onboarding, admin, account gates, etc. are forced light.
 */
const DASHBOARD_THEME_PREFIXES = [
  '/dashboard',
  '/bots',
  '/menu',
  '/stock',
  '/orders',
  '/broadcast',
  '/subscription',
  '/settings',
  '/profile',
] as const;

function isDashboardThemedPath(pathname: string | null): boolean {
  if (pathname == null || pathname === '') return false;
  return DASHBOARD_THEME_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Default is light; `voplix-theme` persists choice on dashboard only. Outside dashboard, `forcedTheme` is light. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const forcedTheme = useMemo(
    () => (isDashboardThemedPath(pathname) ? undefined : ('light' as const)),
    [pathname]
  );

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      themes={['light', 'dark']}
      enableSystem={false}
      forcedTheme={forcedTheme}
      storageKey="voplix-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
