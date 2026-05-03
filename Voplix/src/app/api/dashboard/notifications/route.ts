import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { countPendingSlipOrdersForUser } from '@/lib/dashboard-activity';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [{ data: profile }, { data: announcements }, pendingSlipOrders] = await Promise.all([
      (supabase as any)
        .from('owner_profiles')
        .select('notification_last_seen_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      (supabase as any)
        .from('system_announcements')
        .select('id, title, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20),
      countPendingSlipOrdersForUser(user.id),
    ]);

    const lastSeen = profile?.notification_last_seen_at as string | null | undefined;
    const ann = (announcements ?? []) as { id: string; title: string; created_at: string }[];
    const unreadAnnouncements = ann.filter((a) => {
      if (!lastSeen) return true;
      return new Date(a.created_at).getTime() > new Date(lastSeen).getTime();
    }).length;

    const newestUnread = ann.find((a) => {
      if (!lastSeen) return true;
      return new Date(a.created_at).getTime() > new Date(lastSeen).getTime();
    });

    return NextResponse.json({
      pendingSlipOrders,
      unreadAnnouncements,
      newestUnreadTitle: newestUnread?.title ?? null,
      newestUnreadId: newestUnread?.id ?? null,
    });
  } catch (e) {
    console.error('[GET /api/dashboard/notifications]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
