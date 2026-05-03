'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Trash, SpinnerGap } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface DeleteBotButtonProps {
  botId: string;
  botUsername: string;
}

export function DeleteBotButton({ botId, botUsername }: DeleteBotButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  const handleDelete = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/bots/${botId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(t('Failed to delete bot'));
      }

      toast.success(t('Bot disconnected successfully'));
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(t('Failed to delete bot'));
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-700 text-red-400 hover:bg-red-950/30 hover:text-red-300"
      >
        <Trash className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-white">{t('Disconnect Bot')}</DialogTitle>
          <DialogDescription className="text-zinc-600 dark:text-zinc-400">
            {t('Are you sure you want to disconnect @{botUsername}? This will remove the webhook and deactivate the bot.').replace('{botUsername}', botUsername)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
            disabled={loading}
          >
            {t('Cancel')}
          </Button>
          <Button 
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                {t('Deleting...')}
              </>
            ) : (
              <>
                <Trash className="mr-2 h-4 w-4" />
                {t('Disconnect')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
