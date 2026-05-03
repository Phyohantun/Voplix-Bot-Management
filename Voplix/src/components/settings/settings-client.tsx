'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfileForm } from '@/components/profile/profile-form';
import { CurrencyPreferenceCard } from '@/components/account/currency-preference-card';
import { TimezonePreferenceCard } from '@/components/account/timezone-preference-card';
import { PageHeader } from '@/components/dashboard/page-header';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface SettingsClientProps {
  email: string | undefined;
  initialFirstName: string;
  initialLastName: string;
  shopCurrency: any;
  shopTz: string;
  lastSignInLine: string;
}

export function SettingsClient({
  email,
  initialFirstName,
  initialLastName,
  shopCurrency,
  shopTz,
  lastSignInLine,
}: SettingsClientProps) {
  const { t } = useLanguage();
  return (
    <div className="space-y-10">
      <PageHeader 
        title={t('Account')} 
        description={t('Profile, shop preferences, and security. Operational tools like bulk order cleanup live on the Orders page.')}
      />

      <div className="max-w-2xl space-y-10">
        <section className="space-y-4">
          <div className="border-b border-zinc-200 pb-2 dark:border-zinc-800">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('Profile')}</h2>
          </div>
          <Card className="border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">{t('Sign-in')}</CardTitle>
              <CardDescription className="text-zinc-500">{t('The email you use to access Voplix.')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-800 dark:text-zinc-200">{email}</p>
            </CardContent>
          </Card>

          <ProfileForm mode="edit" initialFirstName={initialFirstName} initialLastName={initialLastName} />
        </section>

        <section className="space-y-4">
          <div className="border-b border-zinc-200 pb-2 dark:border-zinc-800">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {t('Shop settings')}
            </h2>
          </div>
          <CurrencyPreferenceCard initialCurrency={shopCurrency} />
          <TimezonePreferenceCard initialTimezone={shopTz} />
        </section>

        <section className="space-y-4">
          <div className="border-b border-zinc-200 pb-2 dark:border-zinc-800">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('Sessions')}</h2>
          </div>
          <Card className="border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">{t('This account')}</CardTitle>
              <CardDescription className="text-zinc-500">
                {t('Last sign-in time uses your report timezone')} ({shopTz}).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              <p>
                <span className="font-medium text-zinc-900 dark:text-white">{t('Last signed in:')}</span>{' '}
                <span className="tabular-nums">{lastSignInLine}</span>
              </p>
              <p className="text-zinc-500 dark:text-zinc-500">
                {t('Exact device list is not shown here. Use sign out everywhere if you lose a device or share a computer.')}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4 rounded-xl border border-red-200/80 bg-red-50/30 p-4 dark:border-red-900/40 dark:bg-red-950/15">
          <div className="border-b border-red-200/80 pb-2 dark:border-red-900/40">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-red-800 dark:text-red-300/90">
              {t('Danger zone')}
            </h2>
            <p className="mt-1 text-sm text-red-900/80 dark:text-red-200/80">{t('These actions affect access to your account.')}</p>
          </div>
          <Card className="border-red-200/80 bg-white shadow-none dark:border-red-900/50 dark:bg-zinc-900/80">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">{t('Sign out everywhere')}</CardTitle>
              <CardDescription className="text-zinc-500">
                {t('Ends every active session on every device. You will need to sign in again on each one.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action="/api/auth/signout" method="post">
                <Button
                  type="submit"
                  variant="outline"
                  className="border-red-300 text-red-900 hover:bg-red-50 dark:border-red-800 dark:text-red-100 dark:hover:bg-red-950/40"
                >
                  {t('Sign out everywhere')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}