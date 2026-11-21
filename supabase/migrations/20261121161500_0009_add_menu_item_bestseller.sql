ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS is_bestseller boolean NOT NULL DEFAULT false;
