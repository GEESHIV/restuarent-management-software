ALTER TABLE menu_items
  ADD COLUMN small_price numeric(12,2),
  ADD COLUMN medium_price numeric(12,2),
  ADD COLUMN large_price numeric(12,2),
  ADD CONSTRAINT menu_items_size_prices_together
    CHECK (
      (small_price IS NULL AND medium_price IS NULL AND large_price IS NULL)
      OR (small_price IS NOT NULL AND medium_price IS NOT NULL AND large_price IS NOT NULL)
    );

ALTER TABLE order_items
  ADD COLUMN item_size text CHECK (item_size IN ('small', 'medium', 'large'));
