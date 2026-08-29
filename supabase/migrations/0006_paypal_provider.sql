-- Adds PayPal as a second payment provider alongside PayMongo (see
-- lib/payments/paypal.ts). purchases.provider_payment_intent_id already
-- doubles as the PayPal Order ID for these rows; amount/currency store
-- the USD price instead of PHP -- no other schema changes needed.

alter table public.purchases
  drop constraint if exists purchases_provider_check;

alter table public.purchases
  add constraint purchases_provider_check check (provider in ('paymongo', 'paypal'));
