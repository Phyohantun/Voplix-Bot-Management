'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { VoplixWordmark } from '@/components/brand/voplix-wordmark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (searchParams.get('error') === 'auth') {
      toast.error('Sign-in failed. Please try again.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Logged in successfully');
      router.push('/dashboard');
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <Card className="border-zinc-300 bg-zinc-50 shadow-2xl backdrop-blur-xl">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-start">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-700 outline-none ring-offset-2 ring-offset-zinc-100 hover:bg-zinc-200/80"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Link>
        </div>
        <div className="flex flex-col items-center gap-3 pb-1">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg outline-none ring-offset-2 ring-offset-zinc-100 focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-zinc-300">
              <Image src="/apple-touch-icon.png" alt="" width={44} height={44} className="h-full w-full object-cover" />
            </div>
            <VoplixWordmark className="text-xl sm:text-2xl" />
          </Link>
        </div>
        <CardTitle className="text-2xl text-zinc-900">Login</CardTitle>
        <CardDescription className="text-zinc-600">
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-700">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-200 border-zinc-300 text-zinc-900"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-700">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-zinc-200 border-zinc-300 text-zinc-900"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-50 px-2 text-zinc-500">Or</span>
          </div>
        </div>
        <GoogleAuthButton label="Continue with Google" />

        <p className="text-center text-sm text-zinc-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-indigo-600 hover:text-indigo-500">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
