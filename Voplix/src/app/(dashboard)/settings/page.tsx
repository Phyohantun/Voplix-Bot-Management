import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsClient } from '@/components/settings/settings-client';
import { shopCurrencyFromUser } from '@/lib/currency';
import { shopTimezoneFromUser } from '@/lib/shop-timezone';

function formatLastSignIn(iso: string | undefined, timeZone: string): string {
  if (!iso) return 'Not available yet';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toISOString();
  }
}

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
  const shopTz = shopTimezoneFromUser(user);
  const lastSignInLine = formatLastSignIn(user.last_sign_in_at, shopTz);

  return (
    <SettingsClient 
      email={user.email} 
      initialFirstName={initialFirstName} 
      initialLastName={initialLastName} 
      shopCurrency={shopCurrency} 
      shopTz={shopTz} 
      lastSignInLine={lastSignInLine} 
    />
  );
}
