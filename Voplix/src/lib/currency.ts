import type { User } from '@supabase/supabase-js';

export type ShopCurrency = 'THB' | 'MMK' | 'USD';

export function parsePreferredCurrency(raw: unknown): ShopCurrency {
  if (raw === 'USD' || raw === 'MMK' || raw === 'THB') return raw;
  return 'THB';
}

/** Shop currency is stored on the auth user as `user_metadata.preferred_currency` (no DB migration). */
export function shopCurrencyFromUser(user: User | null | undefined): ShopCurrency {
  return parsePreferredCurrency(user?.user_metadata?.preferred_currency);
}

export const CURRENCY_OPTIONS: {
  value: ShopCurrency;
  /** Short label for lists */
  label: string;
  /** Clear description on Account page */
  description: string;
}[] = [
  {
    value: 'THB',
    label: 'Thai baht',
    description: 'Thailand — THB (฿). Use this when your prices are in baht.',
  },
  {
    value: 'MMK',
    label: 'Myanmar kyat',
    description: 'Myanmar — MMK (K). Use this when your prices are in kyats.',
  },
  {
    value: 'USD',
    label: 'US dollar',
    description: 'United States — USD ($). Use this when your prices are in dollars.',
  },
];

/**
 * Whole-number shop price (no FX conversion).
 * Always uses Western digits (en-US); only the currency symbol/code changes with `currency`
 * (avoids Burmese/Thai digit shapes from my-MM / th-TH).
 */
export function formatCurrencyAmount(amount: number, currency: ShopCurrency): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('en-US')} ${currency}`;
  }
}
