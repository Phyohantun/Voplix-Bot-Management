import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { deleteWebhook } from '@/lib/telegram';

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
