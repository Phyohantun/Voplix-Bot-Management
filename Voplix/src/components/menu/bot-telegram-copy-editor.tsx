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
        throw new Error(j.error || 'သိမ်းဆည်းရန် မအောင်မြင်ပါ');
      }
      toast.success('ဘော့တ် မက်ဆေ့ချ်များကို သိမ်းဆည်းပြီးပါပြီ');
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'သိမ်းဆည်းရန် မအောင်မြင်ပါ');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultsIntoForm = () => {
    setCopy(mergeBotTelegramCopy(null));
    toast.message('မူလဆက်တင်များကို ထည့်သွင်းပြီးပါပြီ — အတည်ပြုရန် သိမ်းဆည်းမည် ကိုနှိပ်ပါ', {
      description: 'သို့မဟုတ် ဘော့တ်ကို မူလဆက်တင်များသို့ တစ်ဆင့်တည်းဖြင့် ပြန်လည်သတ်မှတ်ရန် “သိမ်းဆည်းထားသည်များကို ရှင်းမည်” ကို အသုံးပြုပါ။',
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
        throw new Error(j.error || 'ရှင်းလင်းရန် မအောင်မြင်ပါ');
      }
      setCopy(mergeBotTelegramCopy(null));
      toast.success('ဘော့တ် မက်ဆေ့ချ်များကို မူလဆက်တင်များသို့ ပြန်လည်သတ်မှတ်ပြီးပါပြီ');
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'မအောင်မြင်ပါ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-white">Telegram ဘော့တ် မက်ဆေ့ချ်များ</DialogTitle>
          <DialogDescription className="text-zinc-600 dark:text-zinc-400">
            ဤဘော့တ်အတွက် Telegram တွင် ဝယ်ယူသူများ မြင်ရမည့် စာသားများ။ အခြေခံ HTML (စာလုံးမည်း၊ စာလုံးစောင်း၊ စာကြောင်းဆင်းခြင်း) ကို ပံ့ပိုးပေးသည်။ 
            <span className="font-medium text-zinc-700 dark:text-zinc-300">မီနူး အကြံပြုချက်</span> တွင်၊ အောက်ခြေ ကီးဘုတ် အမည်အတွက် 
            <code className="text-xs text-zinc-800 dark:text-zinc-200">{'{{browse_menu_button}}'}</code> ကို အသုံးပြုပါ။ 
            အော်ဒါ ပုံစံခွက်များ-{' '}
            <code className="text-xs text-zinc-800 dark:text-zinc-200">{'{{product_name}}'}</code>,{' '}
            <code className="text-xs text-zinc-800 dark:text-zinc-200">{'{{delivery}}'}</code>,{' '}
            <code className="text-xs text-zinc-800 dark:text-zinc-200">{'{{reason_block}}'}</code>.
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
              မူလဆက်တင်များကို ထည့်သွင်းမည်
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clearStored}
              disabled={loading}
              className="border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
            >
              သိမ်းဆည်းထားသည်များကို ရှင်းလင်းပြီး မူလဆက်တင်ကို သုံးမည်
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-300 dark:border-zinc-700"
            >
              ပိတ်မည်
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? 'သိမ်းဆည်းနေသည်…' : 'မက်ဆေ့ချ်များကို သိမ်းဆည်းမည်'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
