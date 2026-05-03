'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ProfileFormProps {
  initialFirstName: string;
  initialLastName: string;
  mode: 'setup' | 'edit';
}

export function ProfileForm({
  initialFirstName,
  initialLastName,
  mode,
}: ProfileFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    if (!firstName.trim()) {
      toast.error('Please enter your first name');
      return;
    }
    if (!lastName.trim()) {
      toast.error('Please enter your last name');
      return;
    }

    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: fullName,
        },
      });
      if (authUpdateError) {
        throw authUpdateError;
      }

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: fullName,
        }),
      });

      if (!response.ok) {
        const j = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Failed to save profile');
      }

      toast.success('Saved');
      if (pathname.startsWith('/settings')) {
        router.refresh();
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const initial = (firstName.trim() || 'U').slice(0, 1).toUpperCase();
  const hue =
    [...(firstName + lastName)].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;

  return (
    <Card className="border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium text-zinc-900 dark:text-white">Your name</CardTitle>
        <CardDescription className="text-zinc-500">
          {mode === 'setup'
            ? 'Add your name to finish setup.'
            : 'Shown in the app header and on receipts where a name is used.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100 dark:bg-zinc-950/30 p-3 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white shadow-sm ring-2 ring-white/30 dark:ring-zinc-900/40"
              style={{
                background: `linear-gradient(145deg, hsl(${hue} 65% 48%), hsl(${(hue + 40) % 360} 70% 38%))`,
              }}
              aria-hidden
            >
              {initial}
            </div>
            <p>Your profile uses a colored initial. Photo upload is not available yet.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-zinc-700 dark:text-zinc-300">First Name</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. John"
              className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-700 dark:text-zinc-300">Last Name</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Doe"
              className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
            />
          </div>
        </div>

        <Button
          onClick={onSave}
          disabled={loading}
          className="w-full bg-zinc-100 font-medium text-zinc-900 hover:bg-white"
        >
          {loading ? 'Saving...' : mode === 'setup' ? 'Continue' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}
