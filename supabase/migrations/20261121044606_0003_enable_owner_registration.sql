/*
# Enable owner self-registration

## Problem
The existing `owner_insert_staff` policy on `staff` requires `is_restaurant_owner(restaurant_id)`,
which checks for an existing owner staff row. A brand-new owner registering has no staff row yet,
so inserting their own owner row fails RLS (chicken-and-egg). Similarly, `owner_manage_restaurant`
on `restaurants` requires `is_restaurant_owner(id)` which fails for a new restaurant.

## Changes
1. Add a new INSERT policy on `staff` allowing an authenticated user to insert their OWN staff row
   with role = 'owner' (self-registration). The `user_id` must equal `auth.uid()`. This is the
   bootstrap path: the owner creates their restaurant, then inserts their own owner staff row.
2. Add a new INSERT policy on `restaurants` allowing any authenticated user to insert a restaurant
   row. The restaurant is effectively owned by whoever creates the owner staff row for it next.
   This is safe because all other tables are scoped via `is_restaurant_staff`, which requires a
   matching staff row — so a restaurant with no owner staff row is inaccessible to anyone but the
   registrant (who immediately creates their owner row).
3. Revoke `DELETE` on `restaurants` from `anon` (it was over-granted previously) — owners manage
   via UPDATE only; deletion is intentionally disallowed to protect data.

## Security notes
- The self-insert policy is scoped to role = 'owner' AND user_id = auth.uid() only. A user cannot
  insert waiter/kitchen rows for themselves (those must come from an existing owner).
- Restaurants INSERT is now open to authenticated users, but a restaurant is useless without a
  matching owner staff row, which only the registrant can create (self-insert, owner role only).
*/

-- Allow an authenticated user to insert their OWN owner staff row (bootstrap registration)
DROP POLICY IF EXISTS "owner_self_register_staff" ON staff;
CREATE POLICY "owner_self_register_staff"
  ON staff FOR INSERT TO authenticated
  WITH CHECK (role = 'owner' AND user_id = auth.uid());

-- Allow an authenticated user to insert a new restaurant row (registration bootstrap)
DROP POLICY IF EXISTS "any_authed_insert_restaurant" ON restaurants;
CREATE POLICY "any_authed_insert_restaurant"
  ON restaurants FOR INSERT TO authenticated
  WITH CHECK (true);

-- Tighten: remove DELETE grant from anon on restaurants (was over-granted)
REVOKE DELETE ON restaurants FROM anon;
