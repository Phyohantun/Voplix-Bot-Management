import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PLATFORM_SUBSCRIPTION_SLIPS_BUCKET } from '@/lib/platform-subscription-constants';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_BYTES = 5 * 1024 * 1024;

function extForMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'application/pdf') return 'pdf';
  return 'bin';
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const form = await request.formData();
    const planRaw = form.get('plan_tier');
    const plan_tier = typeof planRaw === 'string' ? planRaw.trim().toLowerCase() : '';
    if (plan_tier !== 'pro' && plan_tier !== 'plus') {
      return NextResponse.json({ error: 'Choose Pro or Plus' }, { status: 400 });
    }

    const file = form.get('slip');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Payment slip file is required' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 });
    }
    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: 'Use JPG, PNG, WebP, or PDF' }, { status: 400 });
    }

    const { data: pending, error: pendErr } = await (supabaseAdmin.from('platform_subscription_requests') as any)
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(1);

    if (pendErr) {
      return NextResponse.json({ error: pendErr.message }, { status: 500 });
    }
    if (pending?.length) {
      return NextResponse.json(
        { error: 'You already have a subscription payment under review. Wait for approval or contact support.' },
        { status: 409 }
      );
    }

    const { data: pa, error: paErr } = await (supabaseAdmin.from('platform_accounts') as any)
      .select('plan_tier')
      .eq('user_id', user.id)
      .maybeSingle();

    if (paErr) {
      return NextResponse.json({ error: paErr.message }, { status: 500 });
    }

    const current = ((pa?.plan_tier as string) || 'free').toLowerCase();
    if (current === 'plus') {
      return NextResponse.json({ error: 'You are already on the highest plan (Plus).' }, { status: 400 });
    }
    if (current === 'pro' && plan_tier === 'pro') {
      return NextResponse.json({ error: 'You are already on Pro. Choose Plus to upgrade.' }, { status: 400 });
    }
    if (current === 'pro' && plan_tier !== 'plus') {
      return NextResponse.json({ error: 'From Pro, choose Plus to upgrade.' }, { status: 400 });
    }

    const requestId = crypto.randomUUID();
    const path = `${user.id}/${requestId}.${extForMime(mime)}`;
    const buf = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabaseAdmin.storage.from(PLATFORM_SUBSCRIPTION_SLIPS_BUCKET).upload(path, buf, {
      contentType: mime,
      upsert: false,
    });

    if (upErr) {
      console.error('[subscription slip upload]', upErr);
      return NextResponse.json({ error: upErr.message || 'Upload failed' }, { status: 500 });
    }

    const { error: insErr } = await (supabaseAdmin.from('platform_subscription_requests') as any).insert({
      id: requestId,
      user_id: user.id,
      requester_email: user.email,
      plan_tier,
      slip_storage_path: path,
      status: 'pending',
    });

    if (insErr) {
      await supabaseAdmin.storage.from(PLATFORM_SUBSCRIPTION_SLIPS_BUCKET).remove([path]);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: requestId });
  } catch (e) {
    console.error('[POST /api/subscription/request]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
