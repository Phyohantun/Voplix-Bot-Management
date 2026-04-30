CREATE TABLE IF NOT EXISTS owner_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  business_name TEXT,
  avatar_data_url TEXT,
  notification_last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON owner_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON owner_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON owner_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view active announcements"
  ON system_announcements FOR SELECT
  USING (is_active = true);

CREATE TRIGGER update_owner_profiles_updated_at BEFORE UPDATE ON owner_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
