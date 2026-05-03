import { BROADCAST_IMAGES_BUCKET } from '@/lib/broadcast-image-constants';

/** Only allow HTTPS public-object URLs for our broadcast bucket (mitigates abuse of Telegram sendPhoto URL fetch). */
export function isBroadcastStoragePublicUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) return false;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'https:') return false;
    if (u.hostname !== new URL(base).hostname) return false;
    return u.pathname.includes(`/object/public/${BROADCAST_IMAGES_BUCKET}/`);
  } catch {
    return false;
  }
}
