import { formatCurrencyAmount } from '@/lib/currency';

/** Stable across server/client (avoids hydration mismatch). */
export function formatOrderTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;
}

/** @deprecated Prefer formatCurrencyAmount(amount, currency). */
export function formatThbAmount(amount: number): string {
  return formatCurrencyAmount(amount, 'THB');
}
