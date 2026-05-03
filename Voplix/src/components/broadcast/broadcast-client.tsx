'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { Megaphone, Users, PaperPlaneTilt, SpinnerGap, Broadcast } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatOrderTimestamp } from '@/lib/format-order';
import { sanitizeOwnerHtml } from '@/lib/sanitize-html';
import { telegramHtmlToPlain } from '@/lib/bot-telegram-copy';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';
const TG_MAX = 4096;

interface BotRow {
  id: string;
  bot_username: string;
}

interface BroadcastLog {
  id: string;
  bot_id: string;
  message: string;
  image_url: string | null;
  target_type: string;
  sent_count: number;
  failed_count: number;
  created_at: string;
  bots?: { bot_username: string } | null;
}

interface BroadcastClientProps {
  bots: BotRow[];
  initialBotId: string | null;
  canUseBroadcast: boolean;
}

export function BroadcastClient({ bots, initialBotId, canUseBroadcast }: BroadcastClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<BroadcastLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [formData, setFormData] = useState({
    bot_id: initialBotId ?? bots[0]?.id ?? '',
    message: '',
    image_url: '',
    target_type: 'ALL' as 'ALL' | 'PAID_ONLY',
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!formData.bot_id) {
      setLogs([]);
      setLogsLoading(false);
      return;
    }
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/broadcast?bot_id=${encodeURIComponent(formData.bot_id)}`);
      const j = (await res.json().catch(() => ({}))) as { logs?: BroadcastLog[]; error?: string };
      if (!res.ok) throw new Error(j.error || t('Failed to load history'));
      setLogs(j.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [formData.bot_id, t]);

  useEffect(() => {
    const queryBot = searchParams.get('bot');
    const exists = queryBot && bots.some((b) => b.id === queryBot);
    const nextBot = exists ? queryBot : bots[0]?.id || '';
    if (nextBot && nextBot !== formData.bot_id) {
      setFormData((prev) => ({ ...prev, bot_id: nextBot }));
    }
  }, [bots, formData.bot_id, searchParams]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const selectedBot = bots.find((b) => b.id === formData.bot_id);

  const messageLen = formData.message.length;
  const warnLen = messageLen >= Math.floor(TG_MAX * 0.9);

  const previewPlain = useMemo(() => {
    const safe = sanitizeOwnerHtml(formData.message);
    return telegramHtmlToPlain(safe).replace(/\s+$/, '');
  }, [formData.message]);

  const openConfirm = async () => {
    if (!formData.bot_id) {
      toast.error(t('Please select a bot'));
      return;
    }
    if (!formData.message.trim()) {
      toast.error(t('Please enter a message'));
      return;
    }
    if (formData.message.length > TG_MAX) {
      toast.error(`${t('Message must be at most 4096 characters')}`);
      return;
    }
    setConfirmLoading(true);
    setAudienceCount(null);
    try {
      const u = new URLSearchParams({
        bot_id: formData.bot_id,
        target_type: formData.target_type,
      });
      const res = await fetch(`/api/broadcast/audience-count?${u.toString()}`);
      const j = (await res.json().catch(() => ({}))) as { count?: number; error?: string };
      if (!res.ok) throw new Error(j.error || t('Could not count audience'));
      setAudienceCount(j.count ?? 0);
      setConfirmOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Could not count audience'));
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSendConfirmed = async () => {
    if (audienceCount === 0) {
      toast.error(t('No recipients for this audience'));
      setConfirmOpen(false);
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
        throw new Error(j.error || t('Failed to send broadcast'));
      }

      const data = (await response.json()) as { sentCount: number };
      toast.success(`${t('Broadcast sent to')} ${data.sentCount} ${t('users')}`);
      setFormData((prev) => ({ ...prev, message: '', image_url: '' }));
      setConfirmOpen(false);
      void loadLogs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('Failed to send broadcast'));
    } finally {
      setLoading(false);
    }
  };

  const onImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !formData.bot_id) {
      toast.error(t('Select a bot first'));
      return;
    }
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.set('bot_id', formData.bot_id);
      fd.set('image', f);
      const res = await fetch('/api/broadcast/upload-image', { method: 'POST', body: fd });
      const j = (await res.json().catch(() => ({}))) as { publicUrl?: string; error?: string };
      if (!res.ok) throw new Error(j.error || t('Upload failed'));
      if (!j.publicUrl) throw new Error(t('No image URL returned'));
      setFormData((prev) => ({ ...prev, image_url: j.publicUrl! }));
      toast.success(t('Image attached'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('Upload failed'));
    } finally {
      setImageUploading(false);
    }
  };

  if (bots.length === 0) {
    return (
      <div className="space-y-6">
        <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{t('Broadcast')}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('Send messages to your bot users')}</p>
          </div>
        </header>

        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">
              <Megaphone className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-white">{t('No bots connected')}</h3>
            <p className="mb-4 max-w-sm text-center text-zinc-600 dark:text-zinc-400">
              {t('Connect a bot first to start broadcasting messages.')}
            </p>
            <Button onClick={() => router.push('/onboarding')} className="bg-indigo-600 hover:bg-indigo-700">
              {t('Connect Bot')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{t('Broadcast')}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('Send one message to your selected audience.')}</p>
        </div>
        {canUseBroadcast ? (
          <Link
            href="/subscription"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t('Manage plan')}
          </Link>
        ) : null}
      </header>

      {!canUseBroadcast ? (
        <Card className="overflow-hidden border-indigo-200 bg-gradient-to-br from-indigo-50 to-white dark:border-indigo-900/50 dark:from-indigo-950/40 dark:to-zinc-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Broadcast className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="text-lg text-zinc-900 dark:text-white">{t('Unlock broadcast with Plus')}</CardTitle>
            </div>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">
              {t('Reach everyone who used your bot, or only paying customers — ideal for restocks, announcements, and campaigns.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="list-inside list-disc space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              <li>{t('Bold text and links are optional; you can add a picture at the bottom')}</li>
              <li>{t('Target all tracked users or paid customers only')}</li>
              <li>{t('Built-in batching so large lists send safely')}</li>
              <li>{t('Full history of what you sent, with sent/failed counts')}</li>
            </ul>
            <Link
              href="/subscription"
              className="inline-flex h-10 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {t('View plans & upgrade')}
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-900 dark:text-white">{t('Compose message')}</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">{t('Set audience, write content, attach image, send.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('Selected bot')}</Label>
              <div className="rounded-md border border-zinc-300 bg-zinc-200 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
                {selectedBot ? `@${selectedBot.bot_username}` : t('No bot selected')}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('Target audience')}</Label>
              <Select
                value={formData.target_type}
                disabled={!canUseBroadcast}
                onValueChange={(value) => setFormData({ ...formData, target_type: value as 'ALL' | 'PAID_ONLY' })}
              >
                <SelectTrigger className="border-zinc-300 bg-zinc-200 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-300 bg-zinc-200 dark:border-zinc-700">
                  <SelectItem value="ALL" className="text-zinc-900 dark:text-white">
                    {t('All users')}
                  </SelectItem>
                  <SelectItem value="PAID_ONLY" className="text-zinc-900 dark:text-white">
                    {t('Paid customers only')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-zinc-700 dark:text-zinc-300">{t('Message')}</Label>
                <span className={cn('text-xs tabular-nums', warnLen ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-zinc-500')}>
                  {messageLen} / {TG_MAX}
                </span>
              </div>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t('Write your announcement in normal words. You can use a new line for each sentence.')}
                rows={6}
                disabled={!canUseBroadcast}
                className="resize-none border-zinc-300 bg-zinc-200 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">{t('Image (optional)')}</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={!canUseBroadcast || imageUploading}
                onChange={(e) => void onImageFile(e)}
                className="border-zinc-300 bg-zinc-200 text-sm text-zinc-900 file:mr-2 file:rounded file:border-0 file:bg-zinc-300 file:px-2 file:py-1 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:file:bg-zinc-700"
              />
              <p className="text-xs text-zinc-500">{t('JPG, PNG, or WebP · max 5 MB')}</p>
              {formData.image_url ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{t('Image attached')}</span>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFormData((p) => ({ ...p, image_url: '' }))}>
                    {t('Remove image')}
                  </Button>
                </div>
              ) : null}
            </div>

            <Button
              onClick={() => void openConfirm()}
              disabled={loading || !formData.bot_id || !canUseBroadcast || confirmLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {confirmLoading ? (
                <>
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                  {t('Preparing…')}
                </>
              ) : loading ? (
                <>
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                  {t('Sending…')}
                </>
              ) : (
                <>
                  <PaperPlaneTilt className="mr-2 h-4 w-4" />
                  {t('Review & send')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-900 dark:text-white">{t('Preview')}</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">
              {t('Rough preview — customers see the same words in the bot chat.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedBot ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg bg-zinc-200 p-3 dark:bg-zinc-800">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600">
                    <span className="text-sm font-bold text-white">{selectedBot.bot_username[0]?.toUpperCase() ?? '?'}</span>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">@{selectedBot.bot_username}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('Your shop bot')}</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="max-w-[95%] rounded-2xl rounded-br-md bg-[#2AABEE] px-3 py-2 shadow-md dark:bg-[#229ED9]">
                    {formData.image_url ? (
                      <div className="mb-2 overflow-hidden rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={formData.image_url} alt="" className="max-h-40 w-full object-cover" />
                      </div>
                    ) : null}
                    <p className="whitespace-pre-wrap text-left text-sm leading-relaxed text-white">
                      {previewPlain || t('Your message preview appears here.')}
                    </p>
                    <p className="mt-1 text-right text-[10px] text-white/80 tabular-nums">{t('now')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <Users className="h-4 w-4" />
                  <span>{t('Will send to')} {formData.target_type === 'ALL' ? t('all users') : t('paid customers only')}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                <Megaphone className="mb-4 h-12 w-12" />
                <p>{t('Select a bot to see preview')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t('Recent broadcasts')}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('Last 50 sends for this bot (from server logs).')}</p>
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardContent className="p-0">
            {logsLoading ? (
              <p className="p-6 text-sm text-zinc-500">{t('Loading history…')}</p>
            ) : logs.length === 0 ? (
              <p className="p-6 text-sm text-zinc-500">{t('No broadcasts logged yet for this bot.')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
                      <th className="px-3 py-2">{t('Date')}</th>
                      <th className="px-3 py-2">{t('Audience')}</th>
                      <th className="px-3 py-2">{t('Preview')}</th>
                      <th className="px-3 py-2 text-right">{t('Sent')}</th>
                      <th className="px-3 py-2 text-right">{t('Failed')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {logs.map((row) => (
                      <tr key={row.id} className="text-zinc-800 dark:text-zinc-200">
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-500">
                          {formatOrderTimestamp(row.created_at)}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {row.target_type === 'PAID_ONLY' ? t('Paid only') : t('All users')}
                        </td>
                        <td className="max-w-xs px-3 py-2 text-xs">
                          <span className="line-clamp-2">{row.message.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '—'}</span>
                          {row.image_url ? <span className="ml-1 text-zinc-500">· {t('image')}</span> : null}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.sent_count}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-600 dark:text-red-400">{row.failed_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle>{t('Send broadcast?')}</DialogTitle>
            <DialogDescription className="space-y-2 text-zinc-600 dark:text-zinc-400">
              <p>
                {t('Send to')} <strong className="text-zinc-900 dark:text-zinc-200">{audienceCount ?? '—'}</strong> {audienceCount === 1 ? t('recipient') : t('recipients')}?
              </p>
              <p>
                {t('Audience')}:{' '}
                <strong className="text-zinc-900 dark:text-zinc-200">
                  {formData.target_type === 'ALL' ? t('All users') : t('Paid customers only')}
                </strong>
              </p>
              <p className="text-amber-800 dark:text-amber-200/90">{t('This cannot be undone.')}</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button type="button" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading} onClick={() => void handleSendConfirmed()}>
              {loading ? t('Sending…') : t('Send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
