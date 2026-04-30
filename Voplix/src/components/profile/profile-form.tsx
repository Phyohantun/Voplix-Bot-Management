'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface ProfileFormProps {
  initialDisplayName: string;
  initialBusinessName: string;
  initialAvatarDataUrl: string | null;
  mode: 'setup' | 'edit';
}

export function ProfileForm({
  initialDisplayName,
  initialBusinessName,
  initialAvatarDataUrl,
  mode,
}: ProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(initialAvatarDataUrl);
  const [loading, setLoading] = useState(false);

  const initials = useMemo(() => {
    const src = (displayName || businessName || 'U').trim();
    return src.slice(0, 1).toUpperCase();
  }, [displayName, businessName]);

  const onPickAvatar = async (file: File | null) => {
    if (!file) return;
    if (file.size > 1_000_000) {
      toast.error('Image must be smaller than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setAvatarDataUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    if (!displayName.trim()) {
      toast.error('Please enter your nickname or name');
      return;
    }
    if (!businessName.trim()) {
      toast.error('Please enter your business name');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          business_name: businessName.trim(),
          avatar_data_url: avatarDataUrl,
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
          {mode === 'setup' ? 'Set up your profile' : 'Edit profile'}
        </CardTitle>
        <CardDescription className="text-zinc-400">
          {mode === 'setup'
            ? 'Complete these details before using your dashboard.'
            : 'Update your personal and business details.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-zinc-300 font-semibold">
            {avatarDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarDataUrl} alt="Profile avatar" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-zinc-300">Profile image</Label>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="bg-zinc-800 border-zinc-700 text-white"
              onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-zinc-500">PNG/JPG/WEBP up to 1MB.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-300">Nickname or name</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Alex"
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-300">Business name</Label>
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Welcome Digital Shop"
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>

        <Button onClick={onSave} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
          {loading ? 'Saving...' : mode === 'setup' ? 'Continue to dashboard' : 'Save profile'}
        </Button>
      </CardContent>
    </Card>
  );
}
