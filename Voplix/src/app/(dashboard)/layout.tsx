import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [profileResult, announcementsResult, botsResult] = await Promise.all([
    (supabase as any)
      .from('owner_profiles')
      .select('display_name, business_name, avatar_data_url, notification_last_seen_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    (supabase as any)
      .from('system_announcements')
      .select('id, title, message, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20),
    (supabase as any)
      .from('bots')
      .select('id, bot_username')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
  ]);

  const profile = profileResult?.data ?? null;
  const announcements = (announcementsResult?.data as any[]) || [];
  const bots = (botsResult?.data as any[]) || [];

  const unreadCount = announcements.filter((a) => {
    if (!profile?.notification_last_seen_at) return true;
    return new Date(a.created_at).getTime() > new Date(profile.notification_last_seen_at).getTime();
  }).length;

  return (
    <div className="min-h-screen bg-zinc-950">
      <DashboardSidebar user={user} />
      <div className="lg:pl-72">
        <DashboardHeader
          user={user}
          profile={profile}
          announcements={(announcements as any[]) || []}
          unreadCount={unreadCount}
          bots={(bots as any[]) || []}
        />
        <main className="px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
