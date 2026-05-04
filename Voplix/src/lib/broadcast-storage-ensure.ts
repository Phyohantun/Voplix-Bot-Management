import { supabaseAdmin } from '@/lib/supabase/admin';
import { BROADCAST_IMAGES_BUCKET } from '@/lib/broadcast-image-constants';

let bucketEnsured = false;

/**
 * Ensures the public `broadcast-images` bucket exists (Supabase Storage).
 * Uses the service role — safe to call from API routes. Idempotent.
 */
export async function ensureBroadcastImagesBucketReady(): Promise<void> {
  if (bucketEnsured) return;

  const { data: buckets, error: listErr } = await supabaseAdmin.storage.listBuckets();
  if (listErr) {
    throw new Error(listErr.message || 'Could not list storage buckets');
  }

  const exists = (buckets ?? []).some((b) => b.id === BROADCAST_IMAGES_BUCKET || b.name === BROADCAST_IMAGES_BUCKET);
  if (exists) {
    bucketEnsured = true;
    return;
  }

  const { error: createErr } = await supabaseAdmin.storage.createBucket(BROADCAST_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: 5242880,
  });

  if (createErr) {
    const m = createErr.message || '';
    if (/already exists|duplicate|Bucket already exists/i.test(m)) {
      bucketEnsured = true;
      return;
    }
    throw new Error(m || 'Could not create broadcast-images bucket');
  }

  bucketEnsured = true;
}
