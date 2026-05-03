'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase/client';
import { VoplixWordmark } from '@/components/brand/voplix-wordmark';
import { getClientSiteUrl } from '@/lib/site-url';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim()) {
      toast.error('First name is required');
      return;
    }

    if (!lastName.trim()) {
      toast.error('Last name is required');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const siteUrl = getClientSiteUrl();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
        },
        emailRedirectTo: `${siteUrl}/api/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Check your email to confirm your account');
      router.push('/login');
    }

    setLoading(false);
  };

  return (
    <Card className="border-zinc-300 dark:border-zinc-700/70 bg-zinc-50 dark:bg-zinc-900/70 shadow-2xl backdrop-blur-xl">
      <CardHeader className="space-y-4">
        <div className="flex flex-col items-center gap-3 pb-1">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg outline-none ring-offset-2 ring-offset-zinc-100 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:ring-offset-zinc-950"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-zinc-300 dark:ring-zinc-600">
              <Image src="/apple-touch-icon.png" alt="" width={44} height={44} className="h-full w-full object-cover" />
            </div>
            <VoplixWordmark className="text-xl sm:text-2xl" />
          </Link>
        </div>
        <CardTitle className="text-2xl text-zinc-900 dark:text-white">Create an account</CardTitle>
        <CardDescription className="text-zinc-600 dark:text-zinc-400">
          Enter your details to create your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-zinc-700 dark:text-zinc-300">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-zinc-700 dark:text-zinc-300">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-700 dark:text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-700 dark:text-zinc-300">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters, e.g. MyShop99!"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-zinc-700 dark:text-zinc-300">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Same as above, e.g. MyShop99!"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            Login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
