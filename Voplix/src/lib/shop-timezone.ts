import type { User } from '@supabase/supabase-js';

export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
  { value: 'Asia/Yangon', label: 'Yangon (MMT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'New York (ET)' },
];

export function shopTimezoneFromUser(user: User | null | undefined): string {
  const raw = user?.user_metadata?.preferred_timezone;
  if (typeof raw === 'string' && TIMEZONE_OPTIONS.some((t) => t.value === raw)) return raw;
  return 'Asia/Bangkok';
}
