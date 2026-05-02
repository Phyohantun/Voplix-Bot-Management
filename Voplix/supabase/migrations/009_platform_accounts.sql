-- Per-owner access control, plan tier, and feature flags (managed by platform admin).
CREATE TABLE IF NOT EXISTS public.platform_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('pending', 'active', 'suspended')),
  plan_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (plan_tier IN ('free', 'pro')),
  can_use_broadcast BOOLEAN NOT NULL DEFAULT TRUE,
  can_use_stock BOOLEAN NOT NULL DEFAULT TRUE,
  can_use_orders BOOLEAN NOT NULL DEFAULT TRUE,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_accounts_status ON public.platform_accounts (account_status);

ALTER TABLE public.platform_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read own platform account" ON public.platform_accounts;
CREATE POLICY "Owners can read own platform account"
  ON public.platform_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- No client writes; admin API uses service role. Trigger + admin upserts bypass via service role.

CREATE OR REPLACE FUNCTION public.touch_platform_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS platform_accounts_set_updated_at ON public.platform_accounts;
CREATE TRIGGER platform_accounts_set_updated_at
  BEFORE UPDATE ON public.platform_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_platform_accounts_updated_at();

-- New auth users start active; use admin dashboard to suspend or toggle features.
CREATE OR REPLACE FUNCTION public.ensure_platform_account_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_accounts (user_id, account_status)
  VALUES (NEW.id, 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_platform_account ON auth.users;
CREATE TRIGGER on_auth_user_created_platform_account
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_platform_account_for_new_user();

-- Existing users: treat as already approved so nothing breaks.
INSERT INTO public.platform_accounts (user_id, account_status, plan_tier)
SELECT id, 'active', 'free'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
