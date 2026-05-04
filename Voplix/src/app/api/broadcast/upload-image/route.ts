import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { BROADCAST_IMAGES_BUCKET } from '@/lib/broadcast-image-constants';
import { ensureBroadcastImagesBucketReady } from '@/lib/broadcast-storage-ensure';
import { checkBroadcastAllowed } from '@/lib/plan-limits';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

function extForMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bc = await checkBroadcastAllowed(user.id);
    if (!bc.ok) {
      return NextResponse.json({ error: bc.message }, { status: 403 });
    }

    const form = await request.formData();
    const botRaw = form.get('bot_id');
    const bot_id = typeof botRaw === 'string' ? botRaw.trim() : '';
    if (!bot_id) {
      return NextResponse.json({ error: 'bot_id is required' }, { status: 400 });
    }

    const { data: bot } = await (supabaseAdmin.from('bots') as any)
      .select('id')
      .eq('id', bot_id)
      .eq('user_id', user.id)
      .single();

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    const file = form.get('image');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 5 MB)' }, { status: 400 });
    }
    const mime = file.type || '';
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: 'Use JPG, PNG, or WebP' }, { status: 400 });
    }

    try {
      await ensureBroadcastImagesBucketReady();
    } catch (e) {
      console.error('[broadcast/upload-image] ensure bucket', e);
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : 'Could not prepare storage for broadcast images. Check Supabase Storage and service role permissions.',
        },
        { status: 503 }
      );
    }

    const id = crypto.randomUUID();
    const path = `${user.id}/${id}.${extForMime(mime)}`;

    // Pass the File/Blob through — avoids an extra full-file Buffer copy before upload.
    const { error: upErr } = await supabaseAdmin.storage.from(BROADCAST_IMAGES_BUCKET).upload(path, file, {
      contentType: mime,
      upsert: false,
    });

    if (upErr) {
      return NextResponse.json({ error: upErr.message || 'Upload failed' }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from(BROADCAST_IMAGES_BUCKET).getPublicUrl(path);

    return NextResponse.json({ publicUrl: data.publicUrl, path });
  } catch (e) {
    console.error('POST /api/broadcast/upload-image', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
