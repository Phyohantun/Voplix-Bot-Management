-- Bank instructions for Voplix subscription (MMK transfer) + slip review queue.

ALTER TABLE public.platform_accounts
  DROP CONSTRAINT IF EXISTS platform_accounts_plan_tier_check;

ALTER TABLE public.platform_accounts
  ADD CONSTRAINT platform_accounts_plan_tier_check
  CHECK (plan_tier IN ('free', 'pro', 'plus'));

CREATE TABLE IF NOT EXISTS public.platform_subscription_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  bank_instructions_html TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.platform_subscription_settings (id, bank_instructions_html)
VALUES ('default', '<b>Bank transfer (MMK)</b><br><br>Add your account number, name, and QR instructions here. Customers see this after they log in on the Subscription page.')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.platform_subscription_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_email TEXT NOT NULL DEFAULT '',
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('pro', 'plus')),
  slip_storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_sub_req_status_created
  ON public.platform_subscription_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_sub_req_user
  ON public.platform_subscription_requests (user_id);

ALTER TABLE public.platform_subscription_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_subscription_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read subscription settings" ON public.platform_subscription_settings;
CREATE POLICY "Authenticated read subscription settings"
  ON public.platform_subscription_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users read own subscription requests" ON public.platform_subscription_requests;
CREATE POLICY "Users read own subscription requests"
  ON public.platform_subscription_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Writes go through Next.js API (service role). No INSERT/UPDATE from browser.

-- Storage bucket: run migration 012_platform_subscription_slips_bucket.sql (or create the bucket in Dashboard).

NOTIFY pgrst, 'reload schema';
