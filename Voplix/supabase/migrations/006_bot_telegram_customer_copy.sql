-- Per-bot editable Telegram customer-facing copy (JSON). Null = use app defaults.
ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS telegram_customer_copy JSONB;
