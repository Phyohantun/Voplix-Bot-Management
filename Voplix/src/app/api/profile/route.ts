import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ShopCurrency } from '@/lib/currency';
import { shopCurrencyFromUser } from '@/lib/currency';

const ALLOWED_CURRENCY = new Set<ShopCurrency>(['THB', 'MMK', 'USD']);

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

  const preferred_currency = shopCurrencyFromUser(user);

  return NextResponse.json({
    profile: profile != null ? { ...profile, preferred_currency } : null,
    preferred_currency,
  });
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
  const profileUpdates: Record<string, unknown> = {};
  let currencyToSet: ShopCurrency | undefined;

  if ('display_name' in body) {
    if (body.display_name !== null && typeof body.display_name !== 'string') {
      return NextResponse.json({ error: 'display_name must be string or null' }, { status: 400 });
    }
    profileUpdates.display_name = typeof body.display_name === 'string' ? body.display_name.trim() || null : null;
  }

  if ('business_name' in body) {
    if (body.business_name !== null && typeof body.business_name !== 'string') {
      return NextResponse.json({ error: 'business_name must be string or null' }, { status: 400 });
    }
    profileUpdates.business_name = typeof body.business_name === 'string' ? body.business_name.trim() || null : null;
  }

  if ('avatar_data_url' in body) {
    if (body.avatar_data_url !== null && typeof body.avatar_data_url !== 'string') {
      return NextResponse.json({ error: 'avatar_data_url must be string or null' }, { status: 400 });
    }
    if (typeof body.avatar_data_url === 'string' && body.avatar_data_url.length > 1_500_000) {
      return NextResponse.json({ error: 'avatar image is too large' }, { status: 400 });
    }
    profileUpdates.avatar_data_url = body.avatar_data_url || null;
  }

  if ('notification_last_seen_at' in body) {
    profileUpdates.notification_last_seen_at = new Date().toISOString();
  }

  let timezoneToSet: string | undefined;

  if ('preferred_timezone' in body) {
    const tz = body.preferred_timezone;
    if (typeof tz !== 'string') {
      return NextResponse.json({ error: 'preferred_timezone must be a string' }, { status: 400 });
    }
    const allowed = new Set([
      'Asia/Bangkok',
      'Asia/Yangon',
      'Asia/Singapore',
      'UTC',
      'America/New_York',
    ]);
    if (!allowed.has(tz)) {
      return NextResponse.json({ error: 'Invalid preferred_timezone' }, { status: 400 });
    }
    timezoneToSet = tz;
  }

  if ('preferred_currency' in body) {
    const c = body.preferred_currency;
    if (typeof c !== 'string' || !ALLOWED_CURRENCY.has(c as ShopCurrency)) {
      return NextResponse.json(
        { error: 'preferred_currency must be THB, MMK, or USD' },
        { status: 400 }
      );
    }
    currencyToSet = c as ShopCurrency;
  }

  if (currencyToSet !== undefined || timezoneToSet !== undefined) {
    const { data: authUserRes, error: getErr } = await supabaseAdmin.auth.admin.getUserById(user.id);
    if (getErr) {
      return NextResponse.json({ error: getErr.message }, { status: 500 });
    }
    const prevMeta =
      (authUserRes.user?.user_metadata as Record<string, unknown> | undefined) ?? {};
    const nextMeta = { ...prevMeta };
    if (currencyToSet !== undefined) nextMeta.preferred_currency = currencyToSet;
    if (timezoneToSet !== undefined) nextMeta.preferred_timezone = timezoneToSet;
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: nextMeta,
    });
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await (supabaseAdmin as any).from('owner_profiles').upsert({
      user_id: user.id,
      ...profileUpdates,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (currencyToSet === undefined && timezoneToSet === undefined && Object.keys(profileUpdates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
