import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { sendMessage, sendPhoto } from '@/lib/telegram';
import { checkBroadcastAllowed } from '@/lib/plan-limits';
import { sanitizeOwnerHtml } from '@/lib/sanitize-html';
import { isBroadcastStoragePublicUrl } from '@/lib/broadcast-storage-url';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bc = await checkBroadcastAllowed(user.id);
    if (!bc.ok) {
      return NextResponse.json({ error: bc.message }, { status: 403 });
    }

    const body = await request.json();
    const { bot_id, message: rawMessage, image_url, target_type } = body;

    if (!bot_id || typeof bot_id !== 'string') {
      return NextResponse.json({ error: 'bot_id is required' }, { status: 400 });
    }

    if (target_type !== 'ALL' && target_type !== 'PAID_ONLY') {
      return NextResponse.json({ error: 'Invalid target_type' }, { status: 400 });
    }

    if (typeof rawMessage !== 'string' || !rawMessage.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    const message = sanitizeOwnerHtml(rawMessage.trim());
    if (!message.trim()) {
      return NextResponse.json({ error: 'Message is empty after sanitization' }, { status: 400 });
    }
    if (message.length > 4096) {
      return NextResponse.json({ error: 'Message exceeds Telegram limit of 4096 characters' }, { status: 400 });
    }

    let imageForSend: string | null = null;
    if (image_url != null && image_url !== '') {
      if (typeof image_url !== 'string') {
        return NextResponse.json({ error: 'image_url must be a string' }, { status: 400 });
      }
      const trimmedUrl = image_url.trim();
      if (!isBroadcastStoragePublicUrl(trimmedUrl)) {
        return NextResponse.json(
          { error: 'image_url must be a public HTTPS URL from this app’s broadcast image upload' },
          { status: 400 }
        );
      }
      imageForSend = trimmedUrl;
    }

    // Verify bot ownership (fetch secret only server-side)
    const { data: bot } = await (supabaseAdmin
      .from('bots') as any)
      .select('token_encrypted')
      .eq('id', bot_id)
      .eq('user_id', user.id)
      .single();

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Get target users
    let usersQuery = (supabaseAdmin
      .from('telegram_users') as any)
      .select('telegram_user_id')
      .eq('bot_id', bot_id);

    if (target_type === 'PAID_ONLY') {
      // Get users who have completed orders
      const { data: paidUsers } = await (supabaseAdmin
        .from('orders') as any)
        .select('telegram_user_id')
        .eq('bot_id', bot_id)
        .in('status', ['COMPLETED', 'APPROVED']);

      const paidUserIds = [...new Set(paidUsers?.map((u: any) => u.telegram_user_id) || [])];
      
      if (paidUserIds.length === 0) {
        return NextResponse.json({ error: 'No paid users found' }, { status: 400 });
      }

      usersQuery = usersQuery.in('telegram_user_id', paidUserIds);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError || !users || users.length === 0) {
      return NextResponse.json({ error: 'No users found' }, { status: 400 });
    }

    // Decrypt token
    const token = decrypt(bot.token_encrypted);

    // Telegram: burst parallel sends, short pause between batches. With photos, reuse `file_id` after the first
    // successful send so Telegram does not re-download the same public URL for every recipient.
    let sentCount = 0;
    let failedCount = 0;
    const batchSize = 40;
    const interBatchMs = 120;

    const sendOne = async (u: { telegram_user_id: string }, photoArg: string | null) => {
      try {
        if (photoArg) {
          const result = await sendPhoto(token, u.telegram_user_id, photoArg, message, { parse_mode: 'HTML' });
          if (result.ok) {
            sentCount++;
            return result.fileId ?? null;
          }
          failedCount++;
          return null;
        }
        const result = await sendMessage(token, u.telegram_user_id, message, { parse_mode: 'HTML' });
        if (result.ok) sentCount++;
        else failedCount++;
        return null;
      } catch {
        failedCount++;
        return null;
      }
    };

    if (imageForSend) {
      let telegramPhotoFileId: string | null = null;
      let idx = 0;
      while (idx < users.length && !telegramPhotoFileId) {
        const id = await sendOne(users[idx], imageForSend);
        idx++;
        if (id) telegramPhotoFileId = id;
      }
      for (let i = idx; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (u: { telegram_user_id: string }) => {
            const photoArg = telegramPhotoFileId ?? imageForSend;
            await sendOne(u, photoArg);
          })
        );
        if (i + batchSize < users.length && interBatchMs > 0) {
          await new Promise((r) => setTimeout(r, interBatchMs));
        }
      }
    } else {
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        await Promise.all(batch.map(async (u: { telegram_user_id: string }) => sendOne(u, null)));
        if (i + batchSize < users.length && interBatchMs > 0) {
          await new Promise((r) => setTimeout(r, interBatchMs));
        }
      }
    }

    // Log broadcast
    await (supabaseAdmin
      .from('broadcast_logs') as any)
      .insert({
        bot_id,
        message,
        image_url: imageForSend,
        target_type,
        sent_count: sentCount,
        failed_count: failedCount,
      });

    return NextResponse.json({ sentCount, failedCount });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('bot_id');

    let query = (supabaseAdmin
      .from('broadcast_logs') as any)
      .select('*, bots(bot_username)')
      .eq('bots.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (botId) {
      query = query.eq('bot_id', botId);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (error) {
    console.error('Error fetching broadcast logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
