ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS upi_id text,
  ADD COLUMN IF NOT EXISTS upi_name text;

NOTIFY pgrst, 'reload schema';
