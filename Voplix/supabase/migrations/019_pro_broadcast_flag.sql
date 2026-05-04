-- Pro now includes broadcast (monthly cap enforced in app). Enable flag for existing Pro accounts that were Plus-only before.
UPDATE public.platform_accounts
SET can_use_broadcast = true
WHERE plan_tier = 'pro'
  AND COALESCE(can_use_broadcast, false) = false;
