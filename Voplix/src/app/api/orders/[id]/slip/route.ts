import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { fetchTelegramFile } from '@/lib/telegram';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: orderRaw, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('slip_image_url, bot_id')
    .eq('id', id)
    .single();

  const orderRow = orderRaw as { slip_image_url: string | null; bot_id: string } | null;

  if (orderError || !orderRow) {
    return new Response('Not found', { status: 404 });
  }

  const slipId = orderRow.slip_image_url?.trim() ?? '';
  const botId = orderRow.bot_id;

  if (!slipId || !botId) {
    return new Response('Not found', { status: 404 });
  }

  const { data: botRaw, error: botError } = await supabaseAdmin
    .from('bots')
    .select('user_id, token_encrypted')
    .eq('id', botId)
    .single();

  const botRow = botRaw as { user_id: string; token_encrypted: string } | null;

  if (botError || !botRow || botRow.user_id !== user.id) {
    return new Response('Not found', { status: 404 });
  }

  let token: string;
  try {
    token = decrypt(botRow.token_encrypted);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const file = await fetchTelegramFile(token, slipId);

  if (!file) {
    return new Response('Failed to load slip', { status: 502 });
  }

  return new Response(file.body, {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'private, no-store',
    },
  });
}
