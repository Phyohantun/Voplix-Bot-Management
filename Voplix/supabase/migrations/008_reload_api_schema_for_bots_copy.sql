-- Fix: PostgREST error "Could not find the 'telegram_customer_copy' column ... in the schema cache"
-- 1) Ensures the column exists (safe if 006 already ran).
-- 2) Tells PostgREST to refresh so the Data API sees new columns immediately.

ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS telegram_customer_copy JSONB;

NOTIFY pgrst, 'reload schema';
