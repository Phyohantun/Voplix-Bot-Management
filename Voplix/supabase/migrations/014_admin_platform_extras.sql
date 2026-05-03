-- Admin dashboard: maintenance, pricing/MRR inputs, PromptPay asset, plan limit overrides, subscription period end.

ALTER TABLE public.platform_subscription_settings
  ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS price_pro_mmk_month INTEGER NOT NULL DEFAULT 45000,
  ADD COLUMN IF NOT EXISTS price_plus_mmk_month INTEGER NOT NULL DEFAULT 65000,
  ADD COLUMN IF NOT EXISTS subscription_period_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS promptpay_qr_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS override_max_bots_free INTEGER,
  ADD COLUMN IF NOT EXISTS override_max_bots_pro INTEGER,
  ADD COLUMN IF NOT EXISTS override_max_bots_plus INTEGER,
  ADD COLUMN IF NOT EXISTS override_free_menu_item_cap INTEGER,
  ADD COLUMN IF NOT EXISTS override_free_orders_per_month INTEGER;

ALTER TABLE public.platform_accounts
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;

COMMENT ON COLUMN public.platform_accounts.subscription_period_end IS 'When set and in the past, paid plan limits are enforced as Free until extended or plan changed. NULL means no calendar expiry for paid tier.';

NOTIFY pgrst, 'reload schema';
