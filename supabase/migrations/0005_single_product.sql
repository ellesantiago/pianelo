-- Merges the two one-time products (content_unlock ₱149, remove_ads ₱99)
-- back into a single ₱149 bundle: letter notes + recording + no ads, one
-- price, one payment. See lib/payments/products.ts. No live purchases exist
-- yet under the old two-product scheme, so this is a plain forward migration
-- with no data to reconcile -- the UPDATE below is just cheap insurance in
-- case any stray test rows exist.

update public.purchases
  set product = 'full_access'
  where product in ('content_unlock', 'remove_ads');

alter table public.purchases
  drop constraint if exists purchases_product_check;

alter table public.purchases
  alter column product set default 'full_access',
  alter column amount set default 149.00,
  add constraint purchases_product_check check (product in ('full_access'));

comment on column public.purchases.product is
  'full_access = letter notes + recording + no ads, one-time ₱149. Only value going forward.';
