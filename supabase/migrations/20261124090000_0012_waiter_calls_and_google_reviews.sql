ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS google_review_url text;

CREATE TABLE IF NOT EXISTS public.waiter_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged')),
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_waiter_calls_restaurant_status
  ON public.waiter_calls (restaurant_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_waiter_calls_one_pending_per_order
  ON public.waiter_calls (order_id) WHERE status = 'pending';

ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.waiter_calls TO authenticated;
GRANT UPDATE (status, acknowledged_at) ON public.waiter_calls TO authenticated;

CREATE POLICY "staff_read_waiter_calls"
  ON public.waiter_calls FOR SELECT TO authenticated
  USING (public.is_restaurant_staff(restaurant_id));

CREATE POLICY "staff_acknowledge_waiter_calls"
  ON public.waiter_calls FOR UPDATE TO authenticated
  USING (public.is_restaurant_staff(restaurant_id))
  WITH CHECK (public.is_restaurant_staff(restaurant_id));

CREATE OR REPLACE FUNCTION public.call_waiter(p_order_id uuid, p_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_table_id uuid;
  v_call_id uuid;
BEGIN
  SELECT o.restaurant_id, o.table_id
    INTO v_restaurant_id, v_table_id
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.access_token = p_token
    AND o.order_type = 'dine_in'
    AND o.payment_status = 'unpaid'
    AND o.status NOT IN ('completed', 'cancelled');

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'This order cannot call a waiter';
  END IF;

  SELECT wc.id INTO v_call_id
  FROM public.waiter_calls wc
  WHERE wc.order_id = p_order_id
    AND wc.status = 'pending';

  IF v_call_id IS NOT NULL THEN
    RETURN v_call_id;
  END IF;

  INSERT INTO public.waiter_calls (restaurant_id, table_id, order_id)
  VALUES (v_restaurant_id, v_table_id, p_order_id)
  ON CONFLICT (order_id) WHERE status = 'pending' DO NOTHING
  RETURNING id INTO v_call_id;

  IF v_call_id IS NULL THEN
    SELECT wc.id INTO v_call_id
    FROM public.waiter_calls wc
    WHERE wc.order_id = p_order_id
      AND wc.status = 'pending';
  END IF;

  RETURN v_call_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.call_waiter(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.call_waiter(uuid, uuid) TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'waiter_calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.waiter_calls;
  END IF;
END $$;
