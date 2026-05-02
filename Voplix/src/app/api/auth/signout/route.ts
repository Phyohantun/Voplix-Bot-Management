import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const url = new URL(request.url);
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    `${url.protocol}//${url.host}`;
  return NextResponse.redirect(new URL('/login', base), { status: 303 });
}
