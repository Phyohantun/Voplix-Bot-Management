import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSiteUrl } from '@/lib/site-url';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const siteUrl = getServerSiteUrl(origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${siteUrl}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${siteUrl}/login?error=auth`);
}
