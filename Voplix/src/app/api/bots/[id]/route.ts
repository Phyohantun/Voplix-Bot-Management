import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { deleteWebhook } from '@/lib/telegram';

export async function PATCH(
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

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if ('start_welcome_message' in body) {
      const val = body.start_welcome_message;
      if (val !== null && typeof val !== 'string') {
        return NextResponse.json({ error: 'start_welcome_message must be string or null' }, { status: 400 });
      }
      updates.start_welcome_message = typeof val === 'string' ? val.trim() || null : null;
    }

    if ('start_show_menu_only' in body) {
      if (typeof body.start_show_menu_only !== 'boolean') {
        return NextResponse.json({ error: 'start_show_menu_only must be boolean' }, { status: 400 });
      }
      updates.start_show_menu_only = body.start_show_menu_only;
    }

    if ('start_show_tip' in body) {
      if (typeof body.start_show_tip !== 'boolean') {
        return NextResponse.json({ error: 'start_show_tip must be boolean' }, { status: 400 });
      }
      updates.start_show_tip = body.start_show_tip;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: bot } = await (supabaseAdmin
      .from('bots') as any)
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    const { error: updateError } = await (supabaseAdmin
      .from('bots') as any)
      .update(updates)
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating bot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get bot and verify ownership
    const { data: bot, error: fetchError } = await (supabaseAdmin
      .from('bots') as any)
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Decrypt token and delete webhook
    try {
      const token = decrypt((bot as any).token_encrypted);
      await deleteWebhook(token);
    } catch (error) {
      console.error('Error deleting webhook:', error);
      // Continue even if webhook deletion fails
    }

    // Soft delete - mark as inactive
    const { error: updateError } = await (supabaseAdmin
      .from('bots') as any)
      .update({ is_active: false, webhook_set: false })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
