/*
# Restaurant Management — Helper Functions, Grants & RLS Policies

## What this does
Adds the SECURITY DEFINER helper functions used by RLS policies, then grants
and the per-verb policies for all 10 tables created in 0001_create_tables.

## Functions
- is_restaurant_staff(restaurant_id) — true if current auth user is active staff
- is_restaurant_owner(restaurant_id) — true if current auth user is the owner
- staff_role(restaurant_id) — returns the role text
- get_order_for_customer(order_id, token) — lets an anonymous customer track their
  own order by id + secret access_token (SECURITY DEFINER, bypasses RLS safely)

## RLS model
- Public-facing reads (restaurants, categories, menu_items, restaurant_tables) use
  TO anon, authenticated SELECT — customers scanning QR see these.
- Staff-only tables scoped to authenticated staff of the same restaurant.
- Orders/order_items: anon can INSERT (customer QR/online ordering) but cannot SELECT
  directly; they track via get_order_for_customer RPC using the secret access_token.
  Staff can read/update/delete all orders in their restaurant.
*/

-- ============================================================
-- Helper functions
-- ============================================================
CREATE OR REPLACE FUNCTION is_restaurant_staff(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE staff.restaurant_id = p_restaurant_id
      AND staff.user_id = auth.uid()
      AND staff.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_restaurant_owner(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE staff.restaurant_id = p_restaurant_id
      AND staff.user_id = auth.uid()
      AND staff.role = 'owner'
      AND staff.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION staff_role(p_restaurant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT staff.role FROM staff
  WHERE staff.restaurant_id = p_restaurant_id
    AND staff.user_id = auth.uid()
    AND staff.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_order_for_customer(p_order_id uuid, p_token uuid)
RETURNS TABLE (
  id uuid,
  restaurant_id uuid,
  status text,
  order_type text,
  order_channel text,
  customer_name text,
  subtotal numeric,
  tax_amount numeric,
  service_charge numeric,
  total numeric,
  payment_status text,
  payment_method text,
  created_at timestamptz,
  updated_at timestamptz,
  restaurant_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.restaurant_id, o.status, o.order_type, o.order_channel,
         o.customer_name, o.subtotal, o.tax_amount, o.service_charge, o.total,
         o.payment_status, o.payment_method, o.created_at, o.updated_at,
         r.name AS restaurant_name
  FROM orders o
  JOIN restaurants r ON r.id = o.restaurant_id
  WHERE o.id = p_order_id
    AND o.access_token = p_token;
$$;

REVOKE EXECUTE ON FUNCTION get_order_for_customer(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_order_for_customer(uuid, uuid) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION is_restaurant_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION is_restaurant_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION staff_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_restaurant_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_restaurant_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION staff_role(uuid) TO authenticated;

-- ============================================================
-- restaurants
-- ============================================================
GRANT SELECT ON restaurants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON restaurants TO authenticated;

DROP POLICY IF EXISTS "public_read_restaurants" ON restaurants;
CREATE POLICY "public_read_restaurants"
  ON restaurants FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "owner_manage_restaurant" ON restaurants;
CREATE POLICY "owner_manage_restaurant"
  ON restaurants FOR INSERT TO authenticated
  WITH CHECK (is_restaurant_owner(id));

DROP POLICY IF EXISTS "owner_update_restaurant" ON restaurants;
CREATE POLICY "owner_update_restaurant"
  ON restaurants FOR UPDATE TO authenticated
  USING (is_restaurant_owner(id)) WITH CHECK (is_restaurant_owner(id));

-- ============================================================
-- staff
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON staff TO authenticated;

DROP POLICY IF EXISTS "staff_read_own_restaurant" ON staff;
CREATE POLICY "staff_read_own_restaurant"
  ON staff FOR SELECT TO authenticated
  USING (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "owner_insert_staff" ON staff;
CREATE POLICY "owner_insert_staff"
  ON staff FOR INSERT TO authenticated
  WITH CHECK (is_restaurant_owner(restaurant_id));

DROP POLICY IF EXISTS "owner_update_staff" ON staff;
CREATE POLICY "owner_update_staff"
  ON staff FOR UPDATE TO authenticated
  USING (is_restaurant_owner(restaurant_id)) WITH CHECK (is_restaurant_owner(restaurant_id));

DROP POLICY IF EXISTS "owner_delete_staff" ON staff;
CREATE POLICY "owner_delete_staff"
  ON staff FOR DELETE TO authenticated
  USING (is_restaurant_owner(restaurant_id));

-- ============================================================
-- categories
-- ============================================================
GRANT SELECT ON categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON categories TO authenticated;

DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories"
  ON categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_manage_categories" ON categories;
CREATE POLICY "staff_manage_categories"
  ON categories FOR INSERT TO authenticated
  WITH CHECK (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_update_categories" ON categories;
CREATE POLICY "staff_update_categories"
  ON categories FOR UPDATE TO authenticated
  USING (is_restaurant_staff(restaurant_id)) WITH CHECK (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_delete_categories" ON categories;
CREATE POLICY "staff_delete_categories"
  ON categories FOR DELETE TO authenticated
  USING (is_restaurant_staff(restaurant_id));

-- ============================================================
-- menu_items
-- ============================================================
GRANT SELECT ON menu_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON menu_items TO authenticated;

DROP POLICY IF EXISTS "public_read_menu_items" ON menu_items;
CREATE POLICY "public_read_menu_items"
  ON menu_items FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_manage_menu_items" ON menu_items;
CREATE POLICY "staff_manage_menu_items"
  ON menu_items FOR INSERT TO authenticated
  WITH CHECK (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_update_menu_items" ON menu_items;
CREATE POLICY "staff_update_menu_items"
  ON menu_items FOR UPDATE TO authenticated
  USING (is_restaurant_staff(restaurant_id)) WITH CHECK (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_delete_menu_items" ON menu_items;
CREATE POLICY "staff_delete_menu_items"
  ON menu_items FOR DELETE TO authenticated
  USING (is_restaurant_staff(restaurant_id));

-- ============================================================
-- restaurant_tables
-- ============================================================
GRANT SELECT ON restaurant_tables TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON restaurant_tables TO authenticated;

DROP POLICY IF EXISTS "public_read_tables" ON restaurant_tables;
CREATE POLICY "public_read_tables"
  ON restaurant_tables FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_manage_tables" ON restaurant_tables;
CREATE POLICY "staff_manage_tables"
  ON restaurant_tables FOR INSERT TO authenticated
  WITH CHECK (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_update_tables" ON restaurant_tables;
CREATE POLICY "staff_update_tables"
  ON restaurant_tables FOR UPDATE TO authenticated
  USING (is_restaurant_staff(restaurant_id)) WITH CHECK (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_delete_tables" ON restaurant_tables;
CREATE POLICY "staff_delete_tables"
  ON restaurant_tables FOR DELETE TO authenticated
  USING (is_restaurant_staff(restaurant_id));

-- ============================================================
-- orders
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON orders TO anon, authenticated;
GRANT DELETE ON orders TO authenticated;

DROP POLICY IF EXISTS "staff_read_orders" ON orders;
CREATE POLICY "staff_read_orders"
  ON orders FOR SELECT TO authenticated
  USING (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_update_orders" ON orders;
CREATE POLICY "staff_update_orders"
  ON orders FOR UPDATE TO authenticated
  USING (is_restaurant_staff(restaurant_id)) WITH CHECK (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_delete_orders" ON orders;
CREATE POLICY "staff_delete_orders"
  ON orders FOR DELETE TO authenticated
  USING (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders"
  ON orders FOR INSERT TO anon, authenticated
  WITH CHECK (order_channel IN ('qr','online','waiter'));

-- ============================================================
-- order_items
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON order_items TO anon, authenticated;
GRANT DELETE ON order_items TO authenticated;

DROP POLICY IF EXISTS "staff_read_order_items" ON order_items;
CREATE POLICY "staff_read_order_items"
  ON order_items FOR SELECT TO authenticated
  USING (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_update_order_items" ON order_items;
CREATE POLICY "staff_update_order_items"
  ON order_items FOR UPDATE TO authenticated
  USING (is_restaurant_staff(restaurant_id)) WITH CHECK (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_delete_order_items" ON order_items;
CREATE POLICY "staff_delete_order_items"
  ON order_items FOR DELETE TO authenticated
  USING (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
CREATE POLICY "anon_insert_order_items"
  ON order_items FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ============================================================
-- payments
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO authenticated;

DROP POLICY IF EXISTS "staff_read_payments" ON payments;
CREATE POLICY "staff_read_payments"
  ON payments FOR SELECT TO authenticated
  USING (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_insert_payments" ON payments;
CREATE POLICY "staff_insert_payments"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_update_payments" ON payments;
CREATE POLICY "staff_update_payments"
  ON payments FOR UPDATE TO authenticated
  USING (is_restaurant_staff(restaurant_id)) WITH CHECK (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_delete_payments" ON payments;
CREATE POLICY "staff_delete_payments"
  ON payments FOR DELETE TO authenticated
  USING (is_restaurant_staff(restaurant_id));

-- ============================================================
-- expenses
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO authenticated;

DROP POLICY IF EXISTS "staff_read_expenses" ON expenses;
CREATE POLICY "staff_read_expenses"
  ON expenses FOR SELECT TO authenticated
  USING (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_insert_expenses" ON expenses;
CREATE POLICY "staff_insert_expenses"
  ON expenses FOR INSERT TO authenticated
  WITH CHECK (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_update_expenses" ON expenses;
CREATE POLICY "staff_update_expenses"
  ON expenses FOR UPDATE TO authenticated
  USING (is_restaurant_staff(restaurant_id)) WITH CHECK (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_delete_expenses" ON expenses;
CREATE POLICY "staff_delete_expenses"
  ON expenses FOR DELETE TO authenticated
  USING (is_restaurant_staff(restaurant_id));

-- ============================================================
-- inventory
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory TO authenticated;

DROP POLICY IF EXISTS "staff_read_inventory" ON inventory;
CREATE POLICY "staff_read_inventory"
  ON inventory FOR SELECT TO authenticated
  USING (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_insert_inventory" ON inventory;
CREATE POLICY "staff_insert_inventory"
  ON inventory FOR INSERT TO authenticated
  WITH CHECK (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_update_inventory" ON inventory;
CREATE POLICY "staff_update_inventory"
  ON inventory FOR UPDATE TO authenticated
  USING (is_restaurant_staff(restaurant_id)) WITH CHECK (is_restaurant_staff(restaurant_id));

DROP POLICY IF EXISTS "staff_delete_inventory" ON inventory;
CREATE POLICY "staff_delete_inventory"
  ON inventory FOR DELETE TO authenticated
  USING (is_restaurant_staff(restaurant_id));
