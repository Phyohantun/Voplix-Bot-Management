'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Megaphone, Users, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BroadcastPageProps {
  bots: any[];
}

export default function BroadcastPage({ bots: initialBots }: BroadcastPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bots] = useState(initialBots || []);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bot_id: searchParams.get('bot') ?? '',
    message: '',
    image_url: '',
    target_type: 'ALL' as 'ALL' | 'PAID_ONLY',
  });

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
        throw new Error('Failed to send broadcast');
      }

      const data = await response.json();
      toast.success(`Broadcast sent to ${data.sentCount} users`);
      setFormData({ ...formData, message: '', image_url: '' });
    } catch (error) {
      toast.error('Failed to send broadcast');
    }

    setLoading(false);
  };

  if (bots.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Broadcast</h1>
          <p className="text-zinc-400">Send messages to your bot users</p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <Megaphone className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No bots connected</h3>
            <p className="text-zinc-400 text-center max-w-sm mb-4">
              Connect a bot first to start broadcasting messages.
            </p>
            <Button
              onClick={() => router.push('/onboarding')}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Connect Bot
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Broadcast</h1>
        <p className="text-zinc-400">Send messages to your bot users</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white">Compose Message</CardTitle>
            <CardDescription className="text-zinc-400">
              Create your broadcast message
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Select Bot</Label>
              <Select
                value={formData.bot_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, bot_id: value ?? '' })
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Choose a bot" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {bots.map((bot) => (
                    <SelectItem
                      key={bot.id}
                      value={bot.id}
                      className="text-white"
                    >
                      @{bot.bot_username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Target Audience</Label>
              <Select
                value={formData.target_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, target_type: value as 'ALL' | 'PAID_ONLY' })
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="ALL" className="text-white">
                    All Users
                  </SelectItem>
                  <SelectItem value="PAID_ONLY" className="text-white">
                    Paid Customers Only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Message</Label>
              <Textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                placeholder="Enter your message here..."
                rows={6}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
              />
              <p className="text-xs text-zinc-500">
                HTML formatting is supported. Use {'<b>'}bold{'</b>'}, {'<i>'}italic{'</i>'}, etc.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Image URL (Optional)</Label>
              <Input
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                placeholder="https://example.com/image.jpg"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={loading || !formData.bot_id}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Broadcast
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white">Preview</CardTitle>
            <CardDescription className="text-zinc-400">
              How your message will appear
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedBot ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      @{selectedBot.bot_username[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      @{selectedBot.bot_username}
                    </p>
                    <p className="text-zinc-400 text-sm">Bot</p>
                  </div>
                </div>

                <div className="bg-zinc-800 rounded-lg p-4">
                  {formData.image_url && (
                    <div className="mb-3 aspect-video bg-zinc-700 rounded flex items-center justify-center">
                      <p className="text-zinc-500 text-sm">Image Preview</p>
                    </div>
                  )}
                  <p className="text-white whitespace-pre-wrap">
                    {formData.message || 'Your message will appear here...'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Users className="h-4 w-4" />
                  <span>
                    Will be sent to{' '}
                    {formData.target_type === 'ALL'
                      ? 'all users'
                      : 'paid customers only'}
                  </span>
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
