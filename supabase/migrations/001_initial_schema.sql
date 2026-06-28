-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES (linked to auth.users — Supabase manages email/password)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id                    UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name          TEXT,
  email                 TEXT,
  phone                 TEXT,
  is_admin              BOOLEAN       NOT NULL DEFAULT false,
  newsletter_subscribed BOOLEAN       NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id          SERIAL        PRIMARY KEY,
  name        JSONB         NOT NULL,  -- {es, ca, en}
  description JSONB,
  image_url   TEXT,
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- SCENTS (OLORES)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE scents (
  id          SERIAL        PRIMARY KEY,
  name        JSONB         NOT NULL,  -- {es, ca, en}
  description JSONB,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- COLORS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE colors (
  id         SERIAL        PRIMARY KEY,
  name       JSONB         NOT NULL,  -- {es, ca, en}
  hex_code   TEXT          NOT NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id                SERIAL        PRIMARY KEY,
  name              JSONB         NOT NULL,  -- {es, ca, en}
  short_description JSONB,
  long_description  JSONB,
  base_price        NUMERIC(10,2) NOT NULL,
  images            TEXT[]        NOT NULL DEFAULT '{}',
  is_active         BOOLEAN       NOT NULL DEFAULT true,
  is_featured       BOOLEAN       NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCT ↔ CATEGORIES (many-to-many)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE product_categories (
  product_id  INTEGER NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCT VARIANTS (each valid color + scent combination, with its own stock)
-- color_id and scent_id are nullable: a product may have no color or no scent
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE product_variants (
  id         SERIAL        PRIMARY KEY,
  product_id INTEGER       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_id   INTEGER       REFERENCES colors(id) ON DELETE SET NULL,
  scent_id   INTEGER       REFERENCES scents(id) ON DELETE SET NULL,
  price      NUMERIC(10,2),           -- NULL = inherit product base_price
  stock      INTEGER       NOT NULL DEFAULT 0,
  is_active  BOOLEAN       NOT NULL DEFAULT true
);


-- ─────────────────────────────────────────────────────────────────────────────
-- SHIPPING ZONES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE shipping_zones (
  id        SERIAL        PRIMARY KEY,
  name      TEXT          NOT NULL,
  price     NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN       NOT NULL DEFAULT true
);

INSERT INTO shipping_zones (name, price) VALUES
  ('Cataluña',       3.99),
  ('España',         5.99),
  ('Europa',        14.99),
  ('Internacional', 24.99);


-- ─────────────────────────────────────────────────────────────────────────────
-- DISCOUNT CODES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE discount_codes (
  id           SERIAL        PRIMARY KEY,
  code         TEXT          NOT NULL UNIQUE,
  type         TEXT          NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value        NUMERIC(10,2) NOT NULL,
  min_purchase NUMERIC(10,2),
  max_uses     INTEGER,
  uses_count   INTEGER       NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ,
  is_active    BOOLEAN       NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                   SERIAL        PRIMARY KEY,
  user_id              UUID          NOT NULL REFERENCES auth.users(id),
  status               TEXT          NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending','paid','shipped','delivered','cancelled')),
  subtotal             NUMERIC(10,2) NOT NULL,
  shipping_cost        NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                NUMERIC(10,2) NOT NULL,
  stripe_session_id    TEXT          UNIQUE,
  discount_code_id     INTEGER       REFERENCES discount_codes(id),
  shipping_zone_id     INTEGER       REFERENCES shipping_zones(id),
  shipping_name        TEXT,
  shipping_email       TEXT,
  shipping_phone       TEXT,
  shipping_street      TEXT,
  shipping_city        TEXT,
  shipping_postal_code TEXT,
  shipping_country     TEXT,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ORDER ITEMS
-- product_name, color_name, scent_name are snapshots in case product changes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id                SERIAL        PRIMARY KEY,
  order_id          INTEGER       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        INTEGER       REFERENCES products(id)         ON DELETE SET NULL,
  variant_id        INTEGER       REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name      JSONB         NOT NULL,
  color_name        JSONB,
  scent_name        JSONB,
  quantity          INTEGER       NOT NULL CHECK (quantity > 0),
  price_at_purchase NUMERIC(10,2) NOT NULL
);


-- ─────────────────────────────────────────────────────────────────────────────
-- CONTACT MESSAGES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE contact_messages (
  id         SERIAL      PRIMARY KEY,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- NEWSLETTER SUBSCRIBERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE newsletter_subscribers (
  id            SERIAL      PRIMARY KEY,
  email         TEXT        NOT NULL UNIQUE,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Decrease variant stock when order status changes to 'paid'
CREATE OR REPLACE FUNCTION decrease_stock_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status = 'pending' THEN
    UPDATE product_variants pv
    SET stock = pv.stock - oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.variant_id = pv.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_paid
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION decrease_stock_on_payment();

-- Increment discount code uses_count when an order is paid
CREATE OR REPLACE FUNCTION increment_discount_uses()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status = 'pending' AND NEW.discount_code_id IS NOT NULL THEN
    UPDATE discount_codes
    SET uses_count = uses_count + 1
    WHERE id = NEW.discount_code_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_paid_discount
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION increment_discount_uses();


-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE scents                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- profiles: each user sees/edits only their own; admins see all
CREATE POLICY "Own profile select"   ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Own profile update"   ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin profile update" ON profiles FOR UPDATE USING (is_admin());

-- catalog: public read for active items
CREATE POLICY "Public read categories"      ON categories         FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Public read scents"          ON scents             FOR SELECT USING (true);
CREATE POLICY "Public read colors"          ON colors             FOR SELECT USING (true);
CREATE POLICY "Public read products"        ON products           FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Public read product_cat"     ON product_categories FOR SELECT USING (true);
CREATE POLICY "Public read variants"        ON product_variants   FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Public read shipping_zones"  ON shipping_zones     FOR SELECT USING (is_active = true);

-- catalog: only admins can write
CREATE POLICY "Admin manage categories"     ON categories         FOR ALL USING (is_admin());
CREATE POLICY "Admin manage scents"         ON scents             FOR ALL USING (is_admin());
CREATE POLICY "Admin manage colors"         ON colors             FOR ALL USING (is_admin());
CREATE POLICY "Admin manage products"       ON products           FOR ALL USING (is_admin());
CREATE POLICY "Admin manage product_cat"    ON product_categories FOR ALL USING (is_admin());
CREATE POLICY "Admin manage variants"       ON product_variants   FOR ALL USING (is_admin());
CREATE POLICY "Admin manage shipping_zones" ON shipping_zones     FOR ALL USING (is_admin());
CREATE POLICY "Admin manage discounts"      ON discount_codes     FOR ALL USING (is_admin());

-- orders: users see their own; admins see all
CREATE POLICY "Own orders select" ON orders FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Own orders insert" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin orders all"  ON orders FOR ALL   USING (is_admin());

CREATE POLICY "Own order_items select" ON order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()) OR is_admin());
CREATE POLICY "Own order_items insert" ON order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admin order_items all"  ON order_items FOR ALL USING (is_admin());

-- contact messages: anyone can submit; only admins read/update
CREATE POLICY "Anyone submit contact"  ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read contact"     ON contact_messages FOR SELECT USING (is_admin());
CREATE POLICY "Admin update contact"   ON contact_messages FOR UPDATE USING (is_admin());

-- newsletter: anyone can subscribe; admins see all
CREATE POLICY "Anyone subscribe"       ON newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read subscribers" ON newsletter_subscribers FOR SELECT USING (is_admin());
CREATE POLICY "Admin manage subscribers" ON newsletter_subscribers FOR ALL USING (is_admin());
