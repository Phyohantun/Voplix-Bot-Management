import Redis from 'ioredis';

const memorySessions = new Map<string, string>();
const memorySessionTimers = new Map<string, ReturnType<typeof setTimeout>>();

function stripQuotes(v: string): string {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

/** Build a redis(s):// URL that ioredis accepts (Upstash-compatible). */
function resolveRedisUrl(): string | null {
  const rawUrl = process.env.UPSTASH_REDIS_URL;
  const rawToken = process.env.UPSTASH_REDIS_TOKEN;
  if (!rawUrl?.trim() || !rawToken?.trim()) {
    return null;
  }

  let url = stripQuotes(rawUrl);
  const token = stripQuotes(rawToken);

  if (url.startsWith('https://') || url.startsWith('http://')) {
    console.error(
      '[redis] UPSTASH_REDIS_URL looks like the REST/HTTPS endpoint. In Upstash, copy the **Redis** connection string (starts with rediss://), not the REST URL.'
    );
    return null;
  }

  if (!url.startsWith('redis://') && !url.startsWith('rediss://')) {
    const hostPort = url.replace(/^\/\//, '');
    if (!hostPort.includes('.')) {
      console.error('[redis] UPSTASH_REDIS_URL must be rediss://... or your Redis host (e.g. xxx.upstash.io).');
      return null;
    }
    const hasPort = /:\d+$/.test(hostPort);
    url = `rediss://default:${encodeURIComponent(token)}@${hasPort ? hostPort : `${hostPort}:6379`}`;
  } else {
    try {
      const normalized = url.replace(/^rediss:\/\//, 'https://').replace(/^redis:\/\//, 'http://');
      const parsed = new URL(normalized);
      if (!parsed.password) {
        const port = parsed.port || '6379';
        const scheme = url.startsWith('rediss') ? 'rediss' : 'redis';
        url = `${scheme}://default:${encodeURIComponent(token)}@${parsed.hostname}:${port}`;
      }
    } catch {
      console.error('[redis] Could not parse UPSTASH_REDIS_URL.');
      return null;
    }
  }

  return url;
}

let redis: Redis | null = null;
let redisPingOk = false;
let redisUnavailableLogged = false;

const redisUrl = resolveRedisUrl();

if (redisUrl) {
  try {
    // rediss:// in the URL enables TLS; do not pass tls again (can break the handshake).
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    redis
      .ping()
      .then(() => {
        redisPingOk = true;
        console.log('[redis] Connected to Upstash (ping OK)');
      })
      .catch((err: Error) => {
        redisPingOk = false;
        console.error('[redis] Ping failed — check URL/token; sessions still try Redis then fall back to memory:', err.message);
      });

    redis.on('error', (err: Error) => {
      if (!redisUnavailableLogged) {
        redisUnavailableLogged = true;
        console.error('[redis] Client error:', err.message);
      }
    });
  } catch (e) {
    console.error('[redis] Failed to create client:', e);
    redis = null;
  }
} else {
  console.warn('[redis] UPSTASH_REDIS_URL/TOKEN missing or invalid — using in-memory session store (dev/single instance only)');
}

const useMemoryOnly = !redis;

export default redis;

export type UserState = 'IDLE' | 'VIEWING_MENU' | 'WAITING_FOR_SLIP' | 'CONFIRMING_ORDER';

export interface UserSession {
  state: UserState;
  order_id?: string;
  menu_item_id?: string;
}

function setMemorySessionWithTtl(key: string, value: string, ttlSeconds: number) {
  memorySessions.set(key, value);

  const existingTimer = memorySessionTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    memorySessions.delete(key);
    memorySessionTimers.delete(key);
  }, ttlSeconds * 1000);

  memorySessionTimers.set(key, timer);
}

async function redisGet(key: string): Promise<string | null> {
  if (useMemoryOnly || !redis) return null;
  try {
    return await redis.get(key);
  } catch (e) {
    console.error('[redis] GET failed:', e);
    return null;
  }
}

async function redisSetex(key: string, ttl: number, value: string): Promise<boolean> {
  if (useMemoryOnly || !redis) return false;
  try {
    await redis.setex(key, ttl, value);
    return true;
  } catch (e) {
    console.error('[redis] SETEX failed:', e);
    return false;
  }
}

async function redisDel(key: string): Promise<boolean> {
  if (useMemoryOnly || !redis) return false;
  try {
    await redis.del(key);
    return true;
  } catch (e) {
    console.error('[redis] DEL failed:', e);
    return false;
  }
}

export async function getUserSession(telegramUserId: string, botId: string): Promise<UserSession | null> {
  const key = `session:${telegramUserId}:${botId}`;

  if (!useMemoryOnly) {
    const data = await redisGet(key);
    if (data) {
      try {
        return JSON.parse(data) as UserSession;
      } catch {
        return null;
      }
    }
  }

  const mem = memorySessions.get(key);
  return mem ? (JSON.parse(mem) as UserSession) : null;
}

export async function setUserSession(
  telegramUserId: string,
  botId: string,
  session: UserSession,
  ttl: number = 3600
): Promise<void> {
  const key = `session:${telegramUserId}:${botId}`;
  const value = JSON.stringify(session);

  const ok = await redisSetex(key, ttl, value);
  if (!ok) {
    setMemorySessionWithTtl(key, value, ttl);
  }
}

export async function clearUserSession(telegramUserId: string, botId: string): Promise<void> {
  const key = `session:${telegramUserId}:${botId}`;

  memorySessions.delete(key);
  const timer = memorySessionTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    memorySessionTimers.delete(key);
  }

  await redisDel(key);
}

/** For diagnostics (e.g. debug API). */
export function getRedisDiagnostics() {
  return {
    configured: Boolean(redisUrl),
    clientCreated: Boolean(redis),
    lastPingOk: redisPingOk,
    /** True only when no Redis client (env missing or init error). Session ops still use Redis when client exists. */
    memoryOnlyMode: useMemoryOnly,
  };
}
