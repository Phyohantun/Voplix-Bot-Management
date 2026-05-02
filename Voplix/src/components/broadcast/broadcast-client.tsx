'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Megaphone, Users, PaperPlaneTilt, SpinnerGap } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface BotRow {
  id: string;
  bot_username: string;
}

interface BroadcastClientProps {
  bots: BotRow[];
  initialBotId: string | null;
  canUseBroadcast: boolean;
}

export function BroadcastClient({ bots, initialBotId, canUseBroadcast }: BroadcastClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bot_id: initialBotId ?? bots[0]?.id ?? '',
    message: '',
    image_url: '',
    target_type: 'ALL' as 'ALL' | 'PAID_ONLY',
  });

  useEffect(() => {
    const queryBot = searchParams.get('bot');
    const exists = queryBot && bots.some((b) => b.id === queryBot);
    const nextBot = exists ? queryBot : bots[0]?.id || '';
    if (nextBot && nextBot !== formData.bot_id) {
      setFormData((prev) => ({ ...prev, bot_id: nextBot }));
    }
  }, [bots, formData.bot_id, searchParams]);

  const selectedBot = bots.find((b) => b.id === formData.bot_id);

  const handleSend = async () => {
    if (!formData.bot_id) {
      toast.error('Please select a bot');
      return;
    }

    if (!formData.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const j = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Failed to send broadcast');
      }

      const data = await response.json();
      toast.success(`Broadcast sent to ${data.sentCount} users`);
      setFormData((prev) => ({ ...prev, message: '', image_url: '' }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send broadcast');
    }

    setLoading(false);
  };

  if (bots.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Broadcast</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Send messages to your bot users</p>
        </div>

        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <Megaphone className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">No bots connected</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-center max-w-sm mb-4">
              Connect a bot first to start broadcasting messages.
            </p>
            <Button onClick={() => router.push('/onboarding')} className="bg-indigo-600 hover:bg-indigo-700">
              Connect Bot
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Broadcast</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Send one message to your selected audience.</p>
        {!canUseBroadcast ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Broadcast is included on the Plus plan only.{' '}
            <Link href="/subscription" className="text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400">
              Subscription
            </Link>
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-900 dark:text-white">Compose Message</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">Set audience, write content, and send.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Selected Bot</Label>
              <div className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white">
                {selectedBot ? `@${selectedBot.bot_username}` : 'No bot selected'}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Target Audience</Label>
              <Select
                value={formData.target_type}
                disabled={!canUseBroadcast}
                onValueChange={(value) => setFormData({ ...formData, target_type: value as 'ALL' | 'PAID_ONLY' })}
              >
                <SelectTrigger className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
                  <SelectItem value="ALL" className="text-zinc-900 dark:text-white">
                    All users
                  </SelectItem>
                  <SelectItem value="PAID_ONLY" className="text-zinc-900 dark:text-white">
                    Paid customers only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Message</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter your message here..."
                rows={6}
                disabled={!canUseBroadcast}
                className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Image URL (Optional)</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                disabled={!canUseBroadcast}
                className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={loading || !formData.bot_id || !canUseBroadcast}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <>
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <PaperPlaneTilt className="mr-2 h-4 w-4" />
                  Send Broadcast
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-900 dark:text-white">Preview</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">Quick preview before sending.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedBot ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-zinc-200 dark:bg-zinc-800 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                    <span className="text-zinc-900 dark:text-white text-sm font-bold">@{selectedBot.bot_username[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-zinc-900 dark:text-white font-medium">@{selectedBot.bot_username}</p>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm">Telegram bot</p>
                  </div>
                </div>

                <div className="bg-zinc-200 dark:bg-zinc-800 rounded-lg p-4">
                  {formData.image_url && (
                    <div className="mb-3 aspect-video bg-zinc-700 rounded flex items-center justify-center">
                      <p className="text-zinc-500 text-sm">Image Preview</p>
                    </div>
                  )}
                  <p className="text-zinc-900 dark:text-white whitespace-pre-wrap">{formData.message || 'Your message preview appears here.'}</p>
                </div>

                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <Users className="h-4 w-4" />
                  <span>Will be sent to {formData.target_type === 'ALL' ? 'all users' : 'paid customers only'}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                <Megaphone className="h-12 w-12 mb-4" />
                <p>Select a bot to see preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
