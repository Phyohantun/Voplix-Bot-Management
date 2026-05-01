-- Retire MESSAGE_ONLY: convert existing rows to manual delivery (same checkout flow as other paid items).
UPDATE menu_items SET type = 'MANUAL_DELIVERY' WHERE type = 'MESSAGE_ONLY';

ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_type_check;

ALTER TABLE menu_items ADD CONSTRAINT menu_items_type_check
  CHECK (type IN ('DIGITAL_DELIVERY', 'MANUAL_DELIVERY'));
