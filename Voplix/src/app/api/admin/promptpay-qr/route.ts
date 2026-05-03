import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PLATFORM_SUBSCRIPTION_SLIPS_BUCKET } from '@/lib/platform-subscription-constants';

const SETTINGS_ID = 'default';
const MAX_BYTES = 3 * 1024 * 1024;

export async function GET() {
  try {
    const { data: row, error } = await (supabaseAdmin.from('platform_subscription_settings') as any)
      .select('promptpay_qr_storage_path')
      .eq('id', SETTINGS_ID)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const path = row?.promptpay_qr_storage_path as string | null | undefined;
    if (!path?.trim()) {
      return NextResponse.json({ url: null });
    }

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(PLATFORM_SUBSCRIPTION_SLIPS_BUCKET)
      .createSignedUrl(path.trim(), 600);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: signErr?.message || 'Could not sign URL' }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (e) {
    console.error('[GET /api/admin/promptpay-qr]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 3 MB)' }, { status: 400 });
    }

    const mime = file.type || 'application/octet-stream';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
      return NextResponse.json({ error: 'Use JPG, PNG, or WebP' }, { status: 400 });
    }

    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const path = `promptpay/admin-qr.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabaseAdmin.storage
      .from(PLATFORM_SUBSCRIPTION_SLIPS_BUCKET)
      .upload(path, buf, { contentType: mime, upsert: true });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { error: setErr } = await (supabaseAdmin.from('platform_subscription_settings') as any)
      .upsert(
        {
          id: SETTINGS_ID,
          promptpay_qr_storage_path: path,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (setErr) {
      return NextResponse.json({ error: setErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, path });
  } catch (e) {
    console.error('[POST /api/admin/promptpay-qr]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { data: row } = await (supabaseAdmin.from('platform_subscription_settings') as any)
      .select('promptpay_qr_storage_path')
      .eq('id', SETTINGS_ID)
      .maybeSingle();

    const path = row?.promptpay_qr_storage_path as string | null | undefined;
    if (path?.trim()) {
      await supabaseAdmin.storage.from(PLATFORM_SUBSCRIPTION_SLIPS_BUCKET).remove([path.trim()]);
    }

    const { error } = await (supabaseAdmin.from('platform_subscription_settings') as any)
      .update({ promptpay_qr_storage_path: null, updated_at: new Date().toISOString() })
      .eq('id', SETTINGS_ID);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[DELETE /api/admin/promptpay-qr]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
