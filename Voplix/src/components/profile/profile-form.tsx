'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

      toast.success('Profile saved');
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-white">
          {mode === 'setup' ? 'Set up your name' : 'Edit profile'}
        </CardTitle>
        <CardDescription className="text-zinc-400">
          {mode === 'setup'
            ? 'Complete your first and last name before using your dashboard.'
            : 'Update your account name details.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-sm text-zinc-400">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200">
              {(firstName.trim() || 'U').slice(0, 1).toUpperCase()}
            </div>
            <p>Profile image upload is disabled. The app uses your first-name initial.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-zinc-300">First Name</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. John"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">Last Name</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Doe"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>

        <Button onClick={onSave} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
          {loading ? 'Saving...' : mode === 'setup' ? 'Continue to dashboard' : 'Save profile'}
        </Button>
      </CardContent>
    </Card>
  );
}
