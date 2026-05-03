-- Start of the current paid access window (set when a subscription slip is approved).
ALTER TABLE public.platform_accounts
  ADD COLUMN IF NOT EXISTS subscription_current_period_start TIMESTAMPTZ;

COMMENT ON COLUMN public.platform_accounts.subscription_current_period_start IS
  'When the current Pro/Plus period began; updated on each approved subscription payment.';
