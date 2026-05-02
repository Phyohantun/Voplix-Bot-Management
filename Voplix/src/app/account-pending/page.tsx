import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Legacy URL; access is no longer gated on "pending". */
export default async function AccountPendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }
  redirect('/dashboard');
}
