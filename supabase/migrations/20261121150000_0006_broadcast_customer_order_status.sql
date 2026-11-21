CREATE OR REPLACE FUNCTION public.can_receive_customer_order_status()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders AS o
    WHERE o.id::text = pg_catalog.split_part(realtime.topic(), ':', 2)
      AND o.access_token::text = pg_catalog.split_part(realtime.topic(), ':', 3)
  );
$$;

REVOKE ALL ON FUNCTION public.can_receive_customer_order_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_receive_customer_order_status() TO anon, authenticated;
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON realtime.messages TO anon;

DROP POLICY IF EXISTS "customer_order_status_token_access" ON realtime.messages;
CREATE POLICY "customer_order_status_token_access"
  ON realtime.messages
  FOR SELECT
  TO anon, authenticated
  USING (public.can_receive_customer_order_status());

CREATE OR REPLACE FUNCTION public.broadcast_customer_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM realtime.send(
      pg_catalog.jsonb_build_object('status', NEW.status),
      'order_status',
      'order:' || NEW.id::text || ':' || NEW.access_token::text,
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.broadcast_customer_order_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS broadcast_customer_order_status ON public.orders;
CREATE TRIGGER broadcast_customer_order_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_customer_order_status();
