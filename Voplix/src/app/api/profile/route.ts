import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await (supabaseAdmin as any)
    .from('owner_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({ profile: profile || null });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if ('display_name' in body) {
    if (body.display_name !== null && typeof body.display_name !== 'string') {
      return NextResponse.json({ error: 'display_name must be string or null' }, { status: 400 });
    }
    updates.display_name = typeof body.display_name === 'string' ? body.display_name.trim() || null : null;
  }

  if ('business_name' in body) {
    if (body.business_name !== null && typeof body.business_name !== 'string') {
      return NextResponse.json({ error: 'business_name must be string or null' }, { status: 400 });
    }
    updates.business_name = typeof body.business_name === 'string' ? body.business_name.trim() || null : null;
  }

  if ('avatar_data_url' in body) {
    if (body.avatar_data_url !== null && typeof body.avatar_data_url !== 'string') {
      return NextResponse.json({ error: 'avatar_data_url must be string or null' }, { status: 400 });
    }
    if (typeof body.avatar_data_url === 'string' && body.avatar_data_url.length > 1_500_000) {
      return NextResponse.json({ error: 'avatar image is too large' }, { status: 400 });
    }
    updates.avatar_data_url = body.avatar_data_url || null;
  }

  if ('notification_last_seen_at' in body) {
    updates.notification_last_seen_at = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await (supabaseAdmin as any).from('owner_profiles').upsert({
    user_id: user.id,
    ...updates,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
