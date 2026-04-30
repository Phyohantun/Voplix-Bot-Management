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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-zinc-400">Manage your account and business details.</p>
      </div>
      <div className="max-w-2xl">
        <ProfileForm
          mode="edit"
          initialDisplayName={profile?.display_name || ''}
          initialBusinessName={profile?.business_name || ''}
          initialAvatarDataUrl={profile?.avatar_data_url || null}
        />
      </div>
    </div>
  );
}
