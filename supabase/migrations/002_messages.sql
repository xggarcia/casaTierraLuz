-- ─────────────────────────────────────────────────────────────────────────────
-- MESSAGES (user-to-admin messages; sender must be authenticated)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id         SERIAL      PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  name       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users may insert their own messages (user_id must be themselves)
CREATE POLICY "Own messages insert" ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only admins may read
CREATE POLICY "Admin messages select" ON messages FOR SELECT
  USING (is_admin());

-- Only admins may update (used by mark-as-read)
CREATE POLICY "Admin messages update" ON messages FOR UPDATE
  USING (is_admin());
