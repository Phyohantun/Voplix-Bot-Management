-- Repair rows where completion did not persist revenue, without overwriting manual revenue edits.
UPDATE public.orders o
SET revenue_amount = mi.price
FROM public.menu_items mi
WHERE o.menu_item_id = mi.id
  AND o.status IN ('COMPLETED', 'APPROVED')
  AND NOT COALESCE(o.revenue_manually_edited, false)
  AND (
    o.revenue_amount IS NULL
    OR (o.revenue_amount = 0 AND mi.price IS NOT NULL AND mi.price > 0)
  );
