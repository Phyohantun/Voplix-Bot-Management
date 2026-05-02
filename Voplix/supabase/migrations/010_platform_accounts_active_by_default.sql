-- Signups use active by default; "pending" is optional (admin-only label, no user-facing block).
ALTER TABLE public.platform_accounts
  ALTER COLUMN account_status SET DEFAULT 'active';

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

UPDATE public.platform_accounts
SET account_status = 'active'
WHERE account_status = 'pending';

NOTIFY pgrst, 'reload schema';
