-- Public read so Telegram sendPhoto can fetch by URL; uploads go through API (service role) under {user_id}/.

INSERT INTO storage.buckets (id, name, public)
VALUES ('broadcast-images', 'broadcast-images', true)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
