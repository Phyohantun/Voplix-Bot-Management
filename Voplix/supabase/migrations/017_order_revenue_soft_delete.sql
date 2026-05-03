-- Recorded revenue per order (snapshot at completion; editable by owner).
-- Soft-delete hides orders from lists but keeps rows for accurate revenue totals.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS revenue_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS revenue_manually_edited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.revenue_amount IS 'Amount counted toward owner revenue; set when order completes; may be edited.';
COMMENT ON COLUMN public.orders.deleted_at IS 'When set, order is hidden from owner UI but still counts toward revenue if completed.';

CREATE INDEX IF NOT EXISTS idx_orders_bot_deleted_created
  ON public.orders (bot_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Backfill from current product price for completed / approved orders
UPDATE public.orders o
SET revenue_amount = mi.price
FROM public.menu_items mi
WHERE o.menu_item_id = mi.id
  AND o.status IN ('COMPLETED', 'APPROVED')
  AND o.revenue_amount IS NULL;
