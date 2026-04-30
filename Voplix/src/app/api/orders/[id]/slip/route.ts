import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { fetchTelegramFile } from '@/lib/telegram';

type OrderSlipRow = {
  slip_image_url: string | null;
  bots: { user_id: string; token_encrypted: string } | null;
};

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

  const { data, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('slip_image_url, bots(user_id, token_encrypted)')
    .eq('id', id)
    .single();

  const order = data as OrderSlipRow | null;

  if (orderError || !order?.slip_image_url || !order.bots) {
    return new Response('Not found', { status: 404 });
  }

  if (order.bots.user_id !== user.id) {
    return new Response('Not found', { status: 404 });
  }

  const token = decrypt(order.bots.token_encrypted);
  const file = await fetchTelegramFile(token, order.slip_image_url);

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
