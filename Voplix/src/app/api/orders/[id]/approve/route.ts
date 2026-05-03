import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { approveSlipOrderForOwner } from '@/lib/order-approve';

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

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
    const { manual_message } = body;

    const result = await approveSlipOrderForOwner(id, user.id, {
      manual_message: typeof manual_message === 'string' ? manual_message : undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error approving order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
