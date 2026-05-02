-- Private bucket for subscription payment slips (server uploads via service role).
-- Run this if you see "Bucket not found" when submitting a slip.

INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-subscription-slips', 'platform-subscription-slips', false)
ON CONFLICT (id) DO NOTHING;

-- Optional: allow service role full access (often implicit). If uploads still fail, add policies in Dashboard → Storage → Policies for this bucket.

NOTIFY pgrst, 'reload schema';
