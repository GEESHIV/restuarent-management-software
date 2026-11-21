DROP POLICY IF EXISTS "anon_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "validated_insert_orders" ON public.orders;

GRANT INSERT ON public.orders TO anon, authenticated;

CREATE POLICY "validated_insert_orders"
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      order_channel = 'qr'
      AND table_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.restaurant_tables AS t
        WHERE t.id = orders.table_id
          AND t.restaurant_id = orders.restaurant_id
      )
    )
    OR (
      order_channel = 'online'
      AND table_id IS NULL
    )
    OR (
      order_channel = 'waiter'
      AND auth.uid() IS NOT NULL
      AND public.is_restaurant_staff(restaurant_id)
      AND (
        table_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.restaurant_tables AS t
          WHERE t.id = orders.table_id
            AND t.restaurant_id = orders.restaurant_id
        )
      )
    )
  );
