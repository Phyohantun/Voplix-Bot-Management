import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const SETTINGS_ID = 'default';

export async function GET() {
  try {
    const { data, error } = await (supabaseAdmin.from('platform_subscription_settings') as any)
      .select('bank_instructions_html, updated_at')
      .eq('id', SETTINGS_ID)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      bank_instructions_html: (data?.bank_instructions_html as string) ?? '',
      updated_at: data?.updated_at ?? null,
    });
  } catch (e) {
    console.error('[GET /api/admin/subscription-settings]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { bank_instructions_html?: unknown };
    const html = typeof body.bank_instructions_html === 'string' ? body.bank_instructions_html : '';

    const { error } = await (supabaseAdmin.from('platform_subscription_settings') as any)
      .upsert(
        {
          id: SETTINGS_ID,
          bank_instructions_html: html,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[PATCH /api/admin/subscription-settings]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
