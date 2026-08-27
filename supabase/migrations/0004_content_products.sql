-- Splits the old single ₱99 "full access" purchase into two independent
-- one-time products: the piano itself is free to any registered user now
-- (see src/components/piano/GatedPiano.tsx), so what's left to sell is
-- letter notes + recording as one bundle, and ad removal as a separate one.
-- A user can own zero, one, or both -- see lib/auth/getCurrentUser.ts, which
-- checks for a 'paid' row per product rather than any row at all.

alter table public.purchases
  add column if not exists product text not null default 'content_unlock'
    check (product in ('content_unlock', 'remove_ads'));

comment on column public.purchases.product is
  'content_unlock = letter notes + recording bundle (₱149). remove_ads = ad removal (₱99).';

create index if not exists purchases_user_product_status_idx
  on public.purchases (user_id, product, status);
