import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import redis, { getRedisDiagnostics } from '@/lib/redis';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const diag = getRedisDiagnostics();
  let livePing: boolean | null = null;

  if (redis) {
    try {
      const pong = await redis.ping();
      livePing = pong === 'PONG';
    } catch {
      livePing = false;
    }
  }

  return NextResponse.json({
    ...diag,
    livePing,
    hint:
      !diag.configured || !diag.clientCreated
        ? 'Set UPSTASH_REDIS_URL (rediss://...) and UPSTASH_REDIS_TOKEN in .env.local'
        : livePing === false
          ? 'Redis client exists but ping failed — check Upstash credentials / network'
          : 'OK',
  });
}
