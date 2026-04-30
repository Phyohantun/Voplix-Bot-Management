import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from '@/components/profile/profile-form';

export default async function ProfileSetupPage() {
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

  if (profile?.display_name && profile?.business_name) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <ProfileForm
          mode="setup"
          initialDisplayName={profile?.display_name || ''}
          initialBusinessName={profile?.business_name || ''}
          initialAvatarDataUrl={profile?.avatar_data_url || null}
        />
      </div>
    </div>
  );
}
