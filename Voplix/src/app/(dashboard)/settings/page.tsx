import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/profile/profile-form';
import { CurrencyPreferenceCard } from '@/components/account/currency-preference-card';
import { shopCurrencyFromUser } from '@/lib/currency';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await (supabase as any)
    .from('owner_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const metadataFirstName =
    typeof user.user_metadata?.first_name === 'string' ? user.user_metadata.first_name.trim() : '';
  const metadataLastName =
    typeof user.user_metadata?.last_name === 'string' ? user.user_metadata.last_name.trim() : '';
  const [fallbackFirstName = '', ...restDisplayName] = (profile?.display_name || '').trim().split(' ');
  const fallbackLastName = restDisplayName.join(' ');
  const initialFirstName = metadataFirstName || fallbackFirstName;
  const initialLastName = metadataLastName || fallbackLastName;
  const shopCurrency = shopCurrencyFromUser(user);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Account</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sign-in, your name, shop currency, and sessions.
        </p>
      </div>

      <div className="grid max-w-2xl gap-8">
        <Card className="border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">Sign-in</CardTitle>
            <CardDescription className="text-zinc-500">The email you use to access Voplix.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">{user.email}</p>
          </CardContent>
        </Card>

        <ProfileForm mode="edit" initialFirstName={initialFirstName} initialLastName={initialLastName} />

        <CurrencyPreferenceCard initialCurrency={shopCurrency} />

        <Card className="border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">Sessions</CardTitle>
            <CardDescription className="text-zinc-500">Sign out on every device you are logged in on.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/auth/signout" method="post">
              <Button type="submit" variant="outline" className="border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-200 dark:bg-zinc-800">
                Sign out everywhere
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
