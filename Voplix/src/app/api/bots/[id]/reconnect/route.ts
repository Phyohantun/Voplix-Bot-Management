import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { getWebhookInfo, setWebhook } from '@/lib/telegram';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: bot, error } = await (supabaseAdmin.from('bots') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{
              data: { id: string; token_hash: string; token_encrypted: string } | null;
              error: unknown;
            }>;
          };
        };
      };
    })
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_APP_URL is not configured' },
        { status: 500 }
      );
    }

    const token = decrypt(bot.token_encrypted);
    const webhookUrl = `${appUrl}/api/webhook/${bot.token_hash}`;
    const result = await setWebhook(token, webhookUrl);

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Failed to set webhook' }, { status: 500 });
    }

    await (supabaseAdmin.from('bots') as unknown as {
      update: (payload: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<unknown>;
      };
    })
      .update({ webhook_set: true })
      .eq('id', bot.id);

    const webhookInfo = await getWebhookInfo(token);

    return NextResponse.json({
      ok: true,
      webhookUrl,
      webhookInfo: webhookInfo.ok ? webhookInfo.result : null,
      webhookInfoError: webhookInfo.ok ? null : webhookInfo.error,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
