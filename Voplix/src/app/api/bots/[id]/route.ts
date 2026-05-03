import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { deleteWebhook } from '@/lib/telegram';
import {
  CUSTOMER_MESSAGE_TEMPLATE_KEYS,
  mergeTelegramCustomerCopyJson,
  PAYMENT_INSTRUCTIONS_JSON_KEY,
} from '@/lib/bot-telegram-copy';
import { loadPlatformAccountFlagsAdmin } from '@/lib/plan-limits';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isPostgrestSchemaCacheError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('schema cache') || m.includes('pgrst204');
}

function schemaCacheHelp(original: string): NextResponse {
  return NextResponse.json(
    {
      error:
        'Supabase API schema is stale or the column is missing. Run migration 006/008 (adds bots.telegram_customer_copy), then in Supabase SQL Editor execute: NOTIFY pgrst, \'reload schema\'; — or restart the project from Dashboard → Settings.',
      details: original,
    },
    { status: 503 }
  );
}

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

    const needsCopyMerge = 'telegram_customer_copy' in body || 'payment_instructions' in body;

    // Use the logged-in user's client so RLS matches the same rows as the dashboard.
    // When merging copy/payment, use `*` like the Menu page so we never ask PostgREST for a column it
    // doesn't know about yet (which would error the whole request).
    const selectCols = needsCopyMerge ? '*' : 'id';
    const { data: bot, error: botFetchError } = await (supabase as any)
      .from('bots')
      .select(selectCols)
      .eq('id', id)
      .maybeSingle();

    if (botFetchError) {
      console.error('[PATCH /api/bots/[id]] bot fetch:', botFetchError.message);
      if (isPostgrestSchemaCacheError(botFetchError.message)) {
        return schemaCacheHelp(botFetchError.message);
      }
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    const existingCopy = needsCopyMerge ? (bot as { telegram_customer_copy?: unknown }).telegram_customer_copy : null;

    if ('telegram_customer_copy' in body) {
      if (body.telegram_customer_copy === null) {
        const cleared = mergeTelegramCustomerCopyJson(existingCopy, null, 'clear_all_templates');
        updates.telegram_customer_copy = Object.keys(cleared).length > 0 ? cleared : null;
      } else if (typeof body.telegram_customer_copy !== 'object') {
        return NextResponse.json({ error: 'telegram_customer_copy must be object or null' }, { status: 400 });
      } else {
        let incoming = body.telegram_customer_copy as Record<string, unknown>;
        const flags = await loadPlatformAccountFlagsAdmin(user.id);
        if (flags.plan_tier === 'free') {
          incoming = { ...incoming };
          for (const k of CUSTOMER_MESSAGE_TEMPLATE_KEYS) {
            delete incoming[k as string];
          }
        }
        updates.telegram_customer_copy = mergeTelegramCustomerCopyJson(
          existingCopy,
          incoming,
          'replace_templates'
        );
      }
    }

    if ('payment_instructions' in body) {
      const val = body.payment_instructions;
      if (val !== null && typeof val !== 'string') {
        return NextResponse.json({ error: 'payment_instructions must be string or null' }, { status: 400 });
      }
      const trimmed = typeof val === 'string' ? val.trim() : '';
      if (trimmed.length > 12000) {
        return NextResponse.json({ error: 'payment_instructions too long (max 12000 characters)' }, { status: 400 });
      }

      const prevCopy =
        'telegram_customer_copy' in updates
          ? (updates.telegram_customer_copy as Record<string, unknown> | null)
          : (existingCopy as Record<string, unknown> | null);

      const base =
        prevCopy && typeof prevCopy === 'object' && !Array.isArray(prevCopy)
          ? { ...prevCopy }
          : isPlainObject(existingCopy)
            ? { ...(existingCopy as object) }
            : {};

      if (trimmed.length > 0) {
        base[PAYMENT_INSTRUCTIONS_JSON_KEY] = trimmed;
      } else {
        delete base[PAYMENT_INSTRUCTIONS_JSON_KEY];
      }

      updates.telegram_customer_copy = Object.keys(base).length > 0 ? base : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: updatedRows, error: updateError } = await (supabaseAdmin
      .from('bots') as any)
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id');

    if (updateError) {
      if (isPostgrestSchemaCacheError(updateError.message)) {
        return schemaCacheHelp(updateError.message);
      }
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedRows?.length) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
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
