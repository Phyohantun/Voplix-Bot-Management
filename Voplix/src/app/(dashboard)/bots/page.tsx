import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatCircle, Plus, CheckCircle, XCircle } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { DeleteBotButton } from '@/components/bots/delete-bot-button';
import { ReconnectWebhookButton } from '@/components/bots/reconnect-webhook-button';
import { cn } from '@/lib/utils';
import { getPlanEnforcementSnapshot } from '@/lib/plan-limits';

interface BotRecord {
  id: string;
  bot_username: string;
  created_at: string;
  is_active: boolean;
  webhook_set: boolean;
}

interface SupabaseQueryError {
  code?: string;
}

async function getBots(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bots')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    const typedError = error as SupabaseQueryError;

    if (typedError.code === 'PGRST205') {
      return [];
    }

    console.error('Error fetching bots:', error);
    return [];
  }

  return (data ?? []) as BotRecord[];
}

export default async function BotsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const bots = await getBots(user.id);
  const planSnapshot = await getPlanEnforcementSnapshot(user.id);

  const addButtonClass =
    'w-full bg-zinc-100 font-medium text-zinc-900 hover:bg-white sm:w-auto';

  const addBotButton = planSnapshot.canAddBot ? (
    <Link href="/onboarding">
      <Button className={addButtonClass}>
        <Plus className="mr-2 h-4 w-4" weight="bold" />
        Add bot
      </Button>
    </Link>
  ) : (
    <Button className={addButtonClass} disabled title="Bot limit reached for your plan">
      <Plus className="mr-2 h-4 w-4" weight="bold" />
      Add bot
    </Button>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Bots</h1>
          <p className="text-sm text-zinc-500">Telegram shops linked to your account.</p>
          {!planSnapshot.canAddBot ? (
            <p className="text-xs text-zinc-500">
              {planSnapshot.activeBots} / {planSnapshot.maxBots} bots on your {planSnapshot.plan} plan.{' '}
              <Link href="/subscription" className="text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400">
                Subscription
              </Link>{' '}
              to add more.
            </p>
          ) : null}
        </div>
        {addBotButton}
      </div>

      {bots.length === 0 ? (
        <Card className="border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-300 bg-zinc-200/80 dark:border-zinc-700/80 dark:bg-zinc-800/50">
              <ChatCircle className="h-7 w-7 text-zinc-500" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-white">No bots yet</h3>
            <p className="mb-6 max-w-sm text-center text-sm text-zinc-500">
              Connect a Telegram bot to sell through chat and manage orders here.
            </p>
            {planSnapshot.canAddBot ? (
              <Link href="/onboarding">
                <Button className={addButtonClass}>
                  <Plus className="mr-2 h-4 w-4" weight="bold" />
                  Connect a bot
                </Button>
              </Link>
            ) : (
              <Button className={addButtonClass} disabled>
                <Plus className="mr-2 h-4 w-4" weight="bold" />
                Bot limit reached
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot) => (
            <Card
              key={bot.id}
              className="flex flex-col border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 shadow-none transition-colors hover:border-zinc-300 dark:border-zinc-300 dark:border-zinc-700/90"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-zinc-200/70 dark:border-zinc-700/80 dark:bg-zinc-800/60">
                      <ChatCircle className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base font-medium text-zinc-900 dark:text-white">
                        @{bot.bot_username}
                      </CardTitle>
                      <CardDescription className="text-xs text-zinc-500">
                        Added {new Date(bot.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 border font-normal',
                      bot.is_active
                        ? 'border-zinc-600 bg-zinc-200/60 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200'
                        : 'border-zinc-300 dark:border-zinc-700 text-zinc-500'
                    )}
                  >
                    {bot.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="mt-auto flex flex-1 flex-col gap-4">
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800/90 bg-zinc-100/80 dark:bg-zinc-950/25 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-zinc-500">Receiving messages</span>
                    {bot.webhook_set ? (
                      <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                        <CheckCircle className="h-4 w-4 text-zinc-500" weight="fill" />
                        Yes
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                        <XCircle className="h-4 w-4 text-zinc-600" weight="fill" />
                        Needs setup
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/menu?bot=${bot.id}`} className="contents">
                    <Button variant="outline" className="h-9 border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-200 dark:bg-zinc-800">
                      Menu
                    </Button>
                  </Link>
                  <Link href={`/orders?bot=${bot.id}`} className="contents">
                    <Button variant="outline" className="h-9 border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-200 dark:bg-zinc-800">
                      Orders
                    </Button>
                  </Link>
                  <div className="col-span-2 flex flex-wrap gap-2">
                    <ReconnectWebhookButton botId={bot.id} />
                    <DeleteBotButton botId={bot.id} botUsername={bot.bot_username} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
