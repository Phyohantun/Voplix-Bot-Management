-- Faster order lists per bot (newest first)
CREATE INDEX IF NOT EXISTS idx_orders_bot_created ON public.orders (bot_id, created_at DESC);

-- Deleting an order must not fail when Redis backup rows reference it
ALTER TABLE public.user_states DROP CONSTRAINT IF EXISTS user_states_order_id_fkey;

ALTER TABLE public.user_states
  ADD CONSTRAINT user_states_order_id_fkey
  FOREIGN KEY (order_id)
  REFERENCES public.orders(id)
  ON DELETE SET NULL;

-- Allow authenticated owners to delete orders from the dashboard (API may use service role; policy covers direct client use)
DROP POLICY IF EXISTS "Users can delete orders for their bots" ON public.orders;

CREATE POLICY "Users can delete orders for their bots"
  ON public.orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bots WHERE bots.id = orders.bot_id AND bots.user_id = auth.uid()
    )
  );
