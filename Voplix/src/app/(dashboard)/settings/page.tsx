import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-zinc-400">Manage your account settings</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white">Account Information</CardTitle>
            <CardDescription className="text-zinc-400">
              Your account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-400">Email</label>
              <p className="text-white">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-400">User ID</label>
              <p className="text-zinc-500 text-sm">{user.id}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white">Security</CardTitle>
            <CardDescription className="text-zinc-400">
              Manage your security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/auth/signout" method="post">
              <Button type="submit" variant="outline" className="border-zinc-700 text-zinc-300">
                Sign Out All Sessions
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white">Environment</CardTitle>
            <CardDescription className="text-zinc-400">
              System information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-400">
            <p>App URL: {process.env.NEXT_PUBLIC_APP_URL || 'Not configured'}</p>
            <p>Supabase: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Not configured'}</p>
            <p>Redis: {process.env.UPSTASH_REDIS_URL ? 'Configured' : 'Not configured'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
