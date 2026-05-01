'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowClockwise, SpinnerGap } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ReconnectWebhookButtonProps {
  botId: string;
}

interface ReconnectResponse {
  error?: string;
  webhookUrl?: string;
  webhookInfo?: {
    url: string;
    pending_update_count: number;
    last_error_message?: string;
  } | null;
  webhookInfoError?: string | null;
}

export function ReconnectWebhookButton({ botId }: ReconnectWebhookButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleReconnect = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/bots/${botId}/reconnect`, {
        method: 'POST',
      });
      const data = (await response.json()) as ReconnectResponse;
      if (!response.ok) {
        toast.error(data.error || 'Could not refresh the Telegram link');
        return;
      }

      if (data.webhookInfoError) {
        toast.warning(`Link updated, but status check failed: ${data.webhookInfoError}`);
      } else if (data.webhookInfo?.last_error_message) {
        toast.warning(`Telegram reported an issue: ${data.webhookInfo.last_error_message}`);
      } else {
        toast.success('Telegram link is healthy');
      }

      console.log('[webhook reconnect]', {
        expectedUrl: data.webhookUrl,
        telegramUrl: data.webhookInfo?.url,
        pendingUpdateCount: data.webhookInfo?.pending_update_count,
        lastError: data.webhookInfo?.last_error_message,
      });

      router.refresh();
    } catch {
      toast.error('Could not refresh the Telegram link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReconnect}
      disabled={loading}
      className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-200 dark:bg-zinc-800 text-xs"
    >
      {loading ? (
        <SpinnerGap className="mr-1 h-3 w-3 animate-spin" />
      ) : (
        <ArrowClockwise className="mr-1 h-3 w-3" />
      )}
      Refresh link
    </Button>
  );
}
