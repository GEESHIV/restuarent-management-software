ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS size_option text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS half_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS full_price numeric(12,2);

UPDATE public.menu_items
SET size_option = 'small_medium_large'
WHERE size_option = 'none'
  AND small_price IS NOT NULL
  AND medium_price IS NOT NULL
  AND large_price IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'menu_items_size_option_check'
      AND conrelid = 'public.menu_items'::regclass
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_size_option_check
      CHECK (size_option IN ('none', 'small_medium_large', 'half_full'));
  END IF;
END $$;

ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_size_prices_together;

ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_size_prices_together
  CHECK (
    (
      size_option = 'none'
      AND small_price IS NULL
      AND medium_price IS NULL
      AND large_price IS NULL
      AND half_price IS NULL
      AND full_price IS NULL
    )
    OR (
      size_option = 'small_medium_large'
      AND small_price IS NOT NULL
      AND medium_price IS NOT NULL
      AND large_price IS NOT NULL
      AND half_price IS NULL
      AND full_price IS NULL
    )
    OR (
      size_option = 'half_full'
      AND half_price IS NOT NULL
      AND full_price IS NOT NULL
      AND small_price IS NULL
      AND medium_price IS NULL
      AND large_price IS NULL
    )
  );

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_item_size_check;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_item_size_check
  CHECK (item_size IS NULL OR item_size IN ('small', 'medium', 'large', 'half', 'full'));
