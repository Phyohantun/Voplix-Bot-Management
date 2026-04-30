import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from '@/components/profile/profile-form';

export default async function ProfilePage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-zinc-400">Manage your account name details.</p>
      </div>
      <div className="max-w-2xl">
        <ProfileForm
          mode="edit"
          initialFirstName={initialFirstName}
          initialLastName={initialLastName}
        />
      </div>
    </div>
  );
}
