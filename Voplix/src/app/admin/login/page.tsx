'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(j.error || 'Login failed');
      }
      toast.success('Signed in');
      router.push('/admin/subscriptions');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-white">Platform admin</CardTitle>
          <CardDescription className="text-zinc-400">
            Restricted access. All sign-in attempts are rate-limited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-zinc-300">
                Email
              </Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-zinc-700 bg-zinc-950 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-zinc-300">
                Password
              </Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-zinc-700 bg-zinc-950 text-white"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-zinc-500">
            <Link href="/" className="text-zinc-400 hover:text-zinc-200">
              ← Back to site
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
