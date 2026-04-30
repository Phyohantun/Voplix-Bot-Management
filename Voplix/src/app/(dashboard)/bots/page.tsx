import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Robot, Plus, LinkSimple, CheckCircle, XCircle } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { DeleteBotButton } from '@/components/bots/delete-bot-button';
import { ReconnectWebhookButton } from '@/components/bots/reconnect-webhook-button';

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
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  const bots = await getBots(user.id);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bots</h1>
          <p className="text-zinc-400">Manage connected Telegram bots and webhook status.</p>
        </div>
        <Link href="/onboarding">
          <Button className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Bot
          </Button>
        </Link>
      </div>
      
      {bots.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <Robot className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No bots connected</h3>
            <p className="text-zinc-400 text-center max-w-sm mb-4">
              Get started by connecting your first Telegram bot to manage your business.
            </p>
            <Link href="/onboarding">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="mr-2 h-4 w-4" />
                Connect Your First Bot
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot) => (
            <Card key={bot.id} className="border-zinc-800 bg-zinc-900">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-600/20 flex items-center justify-center">
                      <Robot className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-white">@{bot.bot_username}</CardTitle>
                      <CardDescription className="text-xs text-zinc-400">
                        Connected {new Date(bot.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={bot.is_active ? 'default' : 'secondary'}
                    className={bot.is_active ? 'bg-green-600' : 'bg-zinc-600'}
                  >
                    {bot.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">Webhook</span>
                  <LinkSimple className="h-4 w-4 text-zinc-400" />
                  {bot.webhook_set ? (
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-400">
                      <XCircle className="h-3 w-3" />
                      Not connected
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link href={`/menu?bot=${bot.id}`} className="flex-1">
                    <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs">
                      Menu
                    </Button>
                  </Link>
                  <Link href={`/orders?bot=${bot.id}`} className="flex-1">
                    <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs">
                      Orders
                    </Button>
                  </Link>
                  <div className="col-span-2 flex gap-2">
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
