import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('bot_id');
    const targetType = searchParams.get('target_type') === 'PAID_ONLY' ? 'PAID_ONLY' : 'ALL';

    if (!botId) {
      return NextResponse.json({ error: 'bot_id is required' }, { status: 400 });
    }

    const { data: bot } = await (supabaseAdmin.from('bots') as any)
      .select('id')
      .eq('id', botId)
      .eq('user_id', user.id)
      .single();

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    let usersQuery = (supabaseAdmin.from('telegram_users') as any)
      .select('telegram_user_id', { count: 'exact', head: true })
      .eq('bot_id', botId);

    if (targetType === 'PAID_ONLY') {
      const { data: paidUsers } = await (supabaseAdmin.from('orders') as any)
        .select('telegram_user_id')
        .eq('bot_id', botId)
        .eq('status', 'COMPLETED');

      const paidUserIds = [...new Set((paidUsers || []).map((u: { telegram_user_id: string }) => u.telegram_user_id))];

      if (paidUserIds.length === 0) {
        return NextResponse.json({ count: 0, target_type: targetType });
      }

      usersQuery = (supabaseAdmin.from('telegram_users') as any)
        .select('telegram_user_id', { count: 'exact', head: true })
        .eq('bot_id', botId)
        .in('telegram_user_id', paidUserIds);
    }

    const { count, error } = await usersQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0, target_type: targetType });
  } catch (e) {
    console.error('GET /api/broadcast/audience-count', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
