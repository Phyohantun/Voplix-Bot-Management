'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  mergeBotTelegramCopy,
  BOT_TELEGRAM_COPY_SECTIONS,
  BOT_TELEGRAM_COPY_LABELS,
  type BotTelegramCopy,
} from '@/lib/bot-telegram-copy';
import { toast } from 'sonner';

import { useLanguage } from '@/lib/i18n/LanguageContext';

interface BotTelegramCopyEditorProps {
  botId: string;
  /** Raw JSON from `bots.telegram_customer_copy` */
  storedCopy: unknown;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BotTelegramCopyEditor({
  botId,
  storedCopy,
  open,
  onOpenChange,
}: BotTelegramCopyEditorProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [copy, setCopy] = useState<BotTelegramCopy>(() => mergeBotTelegramCopy(storedCopy));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCopy(mergeBotTelegramCopy(storedCopy));
    }
  }, [open, storedCopy]);

  const updateField = (key: keyof BotTelegramCopy, value: string) => {
    setCopy((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_customer_copy: copy }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(j.error || t('Failed to save'));
      }
      toast.success(t('Bot messages saved'));
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Failed to save'));
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultsIntoForm = () => {
    setCopy(mergeBotTelegramCopy(null));
    toast.message(t('Default settings loaded — click Save to confirm'), {
      description: t('Or use "Clear saved" to reset the bot to default settings in one step.'),
    });
  };

  const clearStored = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_customer_copy: null }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(j.error || t('Failed to clear'));
      }
      setCopy(mergeBotTelegramCopy(null));
      toast.success(t('Bot messages reset to default'));
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-white">{t('Telegram Bot Messages')}</DialogTitle>
          <DialogDescription className="text-zinc-600 dark:text-zinc-400">
            {t('Texts that customers will see in Telegram for this bot. Basic HTML is supported.')}
            <span className="mt-2 block text-zinc-700 dark:text-zinc-300">
              {t('Menu → ')}<span className="font-medium">{t('Text & Payment')}</span>{t(' allows you to insert item name, price, etc. using Myanmar buttons')}
              {t('(The preview shows exactly what the customer will see).')}
            </span>
            <span className="mt-1.5 block text-xs text-zinc-500">
              {t('In this full editor, you can use technical placeholders if special codes are needed.')}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-2 pr-1">
          {BOT_TELEGRAM_COPY_SECTIONS.map((section) => (
            <div
              key={section.title}
              className="space-y-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700 sm:p-4"
            >
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{section.title}</h3>
              {section.keys.map((key) => {
                const meta = BOT_TELEGRAM_COPY_LABELS[key];
                return (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-sm text-zinc-700 dark:text-zinc-300">{meta.title}</Label>
                    {meta.hint ? <p className="text-xs text-zinc-500">{meta.hint}</p> : null}
                    <Textarea
                      value={copy[key]}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="min-h-[72px] border-zinc-300 bg-zinc-200 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={loadDefaultsIntoForm}
              className="border-zinc-300 dark:border-zinc-700"
            >
              {t('Load default settings')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clearStored}
              disabled={loading}
              className="border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
            >
              {t('Clear saved and use default')}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-300 dark:border-zinc-700"
            >
              {t('Close')}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? t('Saving…') : t('Save messages')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
