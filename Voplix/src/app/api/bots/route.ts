import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validateBotToken, setWebhook } from '@/lib/telegram';
import { encrypt, hashToken } from '@/lib/encryption';
import { checkCanInsertNewBot } from '@/lib/plan-limits';
import { BOT_SELECT_SAFE } from '@/lib/bot-client-fields';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Validate bot token
    const validation = await validateBotToken(token);
    
    if (!validation.ok || !validation.result) {
      return NextResponse.json({ error: validation.error || 'Invalid token' }, { status: 400 });
    }

    // Encrypt token and create hash
    const encryptedToken = encrypt(token);
    const tokenHash = hashToken(token);

    // Set webhook
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/${tokenHash}`;
    const webhookResult = await setWebhook(token, webhookUrl);

    if (!webhookResult.ok) {
      return NextResponse.json({ error: webhookResult.error || 'Failed to set webhook' }, { status: 500 });
    }

    const { data: existingBots, error: existingError } = await (supabaseAdmin
      .from('bots') as any)
      .select('*')
      .eq('token_hash', tokenHash)
      .limit(1);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const existingBot = (existingBots as any[] | null)?.[0];

    if (existingBot) {
      if (existingBot.user_id !== user.id) {
        return NextResponse.json(
          { error: 'This Telegram bot is already connected to another account' },
          { status: 409 }
        );
      }

      const { data: updatedBot, error: updateError } = await (supabaseAdmin
        .from('bots') as any)
        .update({
          token_encrypted: encryptedToken,
          bot_username: validation.result.username,
          webhook_set: true,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBot.id)
        .select(BOT_SELECT_SAFE)
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ bot: updatedBot }, { status: 200 });
    }

    const gate = await checkCanInsertNewBot(user.id);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.message }, { status: 403 });
    }

    // Save bot to database
    const { data: bot, error } = await (supabaseAdmin
      .from('bots') as any)
      .insert({
        user_id: user.id,
        token_encrypted: encryptedToken,
        token_hash: tokenHash,
        bot_username: validation.result.username,
        webhook_set: true,
        is_active: true,
      })
      .select(BOT_SELECT_SAFE)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bot }, { status: 201 });
  } catch (error) {
    console.error('Error creating bot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: bots, error } = await (supabaseAdmin
      .from('bots') as any)
      .select(BOT_SELECT_SAFE)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bots: bots || [] });
  } catch (error) {
    console.error('Error fetching bots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
