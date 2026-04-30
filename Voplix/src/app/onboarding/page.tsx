'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Robot, CheckCircle, SpinnerGap } from '@phosphor-icons/react';
import { validateBotToken } from '@/lib/telegram';

export default function OnboardingPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validatedBot, setValidatedBot] = useState<{ username: string } | null>(null);

  const handleValidate = async () => {
    if (!token.trim()) {
      toast.error('Please enter a bot token');
      return;
    }

    setValidating(true);
    
    const result = await validateBotToken(token);
    
    if (result.ok && result.result) {
      setValidatedBot(result.result);
      toast.success(`Bot validated: @${result.result.username}`);
    } else {
      toast.error(result.error || 'Invalid bot token');
    }
    
    setValidating(false);
  };

  const handleConnect = async () => {
    if (!validatedBot) return;

    setLoading(true);
    
    try {
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(data.error || 'Failed to connect bot');
        setLoading(false);
        return;
      }

      toast.success('Bot connected successfully!');
      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error('Failed to connect bot');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Robot className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-white">Connect Your Bot</CardTitle>
            </div>
          </div>
          <CardDescription className="text-zinc-400">
            Enter your Telegram bot token to get started. You can get this from @BotFather.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token" className="text-zinc-300">Bot Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setValidatedBot(null);
              }}
              disabled={loading || validating}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            <p className="text-xs text-zinc-500">
              Your token is encrypted and never exposed. Format: numbers:letters
            </p>
          </div>

          {validatedBot && (
            <div className="flex items-center gap-2 rounded-lg bg-green-900/30 border border-green-800 p-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-400">Bot validated!</p>
                <p className="text-xs text-green-300">@{validatedBot.username}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleValidate}
              disabled={!token.trim() || validating || loading || !!validatedBot}
              variant="outline"
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              {validating ? (
                <>
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : validatedBot ? (
                'Validated'
              ) : (
                'Validate Token'
              )}
            </Button>
            
            <Button
              onClick={handleConnect}
              disabled={!validatedBot || loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <>
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Bot'
              )}
            </Button>
          </div>

          <div className="rounded-lg bg-zinc-800 p-4 space-y-2">
            <p className="text-sm font-medium text-zinc-300">How to get your bot token:</p>
            <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
              <li>Open Telegram and search for @BotFather</li>
              <li>Send /newbot and follow the instructions</li>
              <li>Once created, copy the token provided</li>
              <li>Paste it above and click Validate</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
