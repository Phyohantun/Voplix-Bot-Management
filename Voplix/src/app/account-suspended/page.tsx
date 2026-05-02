import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPlatformAccountForUser } from '@/lib/platform-account';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AccountSuspendedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const acct = await getPlatformAccountForUser(user.id);
  if (!acct || acct.account_status !== 'suspended') {
    redirect('/dashboard');
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-100 p-4 dark:bg-zinc-950">
      <Card className="max-w-md border-red-200 bg-white dark:border-red-900/50 dark:bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-white">Account suspended</CardTitle>
          <CardDescription className="text-zinc-600 dark:text-zinc-400">
            Access to this platform has been disabled for your account. Contact the administrator if you believe this
            is a mistake.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{user.email}</span>
          </p>
          <form action="/api/auth/signout" method="post">
            <Button type="submit" variant="outline" className="w-full border-zinc-300 dark:border-zinc-700">
              Sign out
            </Button>
          </form>
          <Link href="/" className="block text-center text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            Back to home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
