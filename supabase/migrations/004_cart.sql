-- ─────────────────────────────────────────────────────────────────────────────
-- CART (per-user shopping cart; rows are scoped to auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE cart_items (
  id         SERIAL      PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id INTEGER     NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity   INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, variant_id)
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own cart select" ON cart_items FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Own cart insert" ON cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own cart update" ON cart_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own cart delete" ON cart_items FOR DELETE
  USING (auth.uid() = user_id);
