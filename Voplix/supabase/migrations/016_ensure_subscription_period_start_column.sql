-- Idempotent: safe if 015 already ran. Fixes remote DBs that skipped 015 or stale PostgREST cache.
ALTER TABLE public.platform_accounts
  ADD COLUMN IF NOT EXISTS subscription_current_period_start TIMESTAMPTZ;

COMMENT ON COLUMN public.platform_accounts.subscription_current_period_start IS
  'When the current Pro/Plus period began; updated on each approved subscription payment.';

NOTIFY pgrst, 'reload schema';
