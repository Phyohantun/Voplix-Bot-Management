-- Enable RLS
alter table if exists "public"."bots" enable row level security;
alter table if exists "public"."menu_items" enable row level security;
alter table if exists "public"."stock_items" enable row level security;
alter table if exists "public"."orders" enable row level security;
alter table if exists "public"."telegram_users" enable row level security;
alter table if exists "public"."broadcast_logs" enable row level security;
alter table if exists "public"."user_states" enable row level security;

-- Bots table
CREATE TABLE IF NOT EXISTS bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_encrypted TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  bot_username TEXT NOT NULL,
  webhook_set BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DIGITAL_DELIVERY', 'MANUAL_DELIVERY', 'MESSAGE_ONLY')),
  delivery_content TEXT,
  stock_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock items table (for digital delivery)
CREATE TABLE IF NOT EXISTS stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  content_text TEXT NOT NULL,
  is_sold BOOLEAN DEFAULT FALSE,
  sold_at TIMESTAMPTZ,
  order_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL,
  telegram_username TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (status IN ('PENDING_PAYMENT', 'SLIP_SUBMITTED', 'APPROVED', 'COMPLETED', 'REJECTED')),
  slip_image_url TEXT,
  manual_delivery_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Telegram users table
CREATE TABLE IF NOT EXISTS telegram_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL,
  telegram_username TEXT,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bot_id, telegram_user_id)
);

-- Broadcast logs table
CREATE TABLE IF NOT EXISTS broadcast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  image_url TEXT,
  target_type TEXT NOT NULL DEFAULT 'ALL' CHECK (target_type IN ('ALL', 'PAID_ONLY')),
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User states table (for Redis sync/backup)
CREATE TABLE IF NOT EXISTS user_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id TEXT NOT NULL,
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('IDLE', 'VIEWING_MENU', 'WAITING_FOR_SLIP', 'CONFIRMING_ORDER')),
  order_id UUID REFERENCES orders(id),
  menu_item_id UUID REFERENCES menu_items(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(telegram_user_id, bot_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bots_token_hash ON bots(token_hash);
CREATE INDEX IF NOT EXISTS idx_menu_items_bot_id ON menu_items(bot_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_menu_item_id ON stock_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_orders_bot_id ON orders(bot_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_telegram_users_bot_id ON telegram_users(bot_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_bot_id ON broadcast_logs(bot_id);

-- RLS Policies

-- Bots policies
CREATE POLICY "Users can view their own bots"
  ON bots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bots"
  ON bots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bots"
  ON bots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bots"
  ON bots FOR DELETE
  USING (auth.uid() = user_id);

-- Menu items policies
CREATE POLICY "Users can view menu items for their bots"
  ON menu_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bots WHERE bots.id = menu_items.bot_id AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage menu items for their bots"
  ON menu_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bots WHERE bots.id = menu_items.bot_id AND bots.user_id = auth.uid()
    )
  );

-- Stock items policies
CREATE POLICY "Users can view stock items for their bots"
  ON stock_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      JOIN bots ON bots.id = menu_items.bot_id
      WHERE menu_items.id = stock_items.menu_item_id AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage stock items for their bots"
  ON stock_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      JOIN bots ON bots.id = menu_items.bot_id
      WHERE menu_items.id = stock_items.menu_item_id AND bots.user_id = auth.uid()
    )
  );

-- Orders policies
CREATE POLICY "Users can view orders for their bots"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bots WHERE bots.id = orders.bot_id AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update orders for their bots"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bots WHERE bots.id = orders.bot_id AND bots.user_id = auth.uid()
    )
  );

-- Telegram users policies
CREATE POLICY "Users can view telegram users for their bots"
  ON telegram_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bots WHERE bots.id = telegram_users.bot_id AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Webhook can insert telegram users"
  ON telegram_users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Webhook can update telegram users"
  ON telegram_users FOR UPDATE
  USING (true);

-- Broadcast logs policies
CREATE POLICY "Users can view broadcast logs for their bots"
  ON broadcast_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bots WHERE bots.id = broadcast_logs.bot_id AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert broadcast logs for their bots"
  ON broadcast_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bots WHERE bots.id = broadcast_logs.bot_id AND bots.user_id = auth.uid()
    )
  );

-- User states policies
CREATE POLICY "Webhook can manage user states"
  ON user_states FOR ALL
  USING (true);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_telegram_users_updated_at BEFORE UPDATE ON telegram_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_states_updated_at BEFORE UPDATE ON user_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
