-- Pianelo initial schema.
--
-- Run this against a Supabase Postgres project (via the Supabase SQL
-- editor, the CLI: `supabase db push`, or any Postgres migration tool).
-- Use a NEW Supabase project -- do not point this at Keyora's database.

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
-- profiles
-- One row per Supabase Auth user. Supabase manages auth.users directly; we
-- don't add custom columns there.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- active_sessions
-- Single-device login enforcement: exactly one row per user, holding
-- whichever session token was issued most recently. A new login overwrites
-- this row (see lib/sessions/sessionToken.ts); proxy.ts signs out any
-- request whose session-token cookie doesn't match this row anymore.
-- No RLS insert/update policy is defined on purpose -- only the service
-- role (server-only) is allowed to write these rows.
-- ---------------------------------------------------------------------------
create table if not exists public.active_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_token uuid not null,
  device_label text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- purchases
-- One-time ₱99 purchase records. A user has full access if any row for them
-- has status = 'paid' (see lib/auth/getCurrentUser.ts). Only the webhook
-- (via the service role) ever sets status to 'paid'/'failed' -- see
-- app/api/payments/webhook/route.ts.
-- ---------------------------------------------------------------------------
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'paymongo' check (provider in ('paymongo')),
  provider_payment_intent_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  amount numeric(10, 2) not null default 99.00,
  currency text not null default 'PHP',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchases_user_id_idx on public.purchases (user_id);
create index if not exists purchases_intent_idx on public.purchases (provider_payment_intent_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.active_sessions enable row level security;
alter table public.purchases enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- No select/insert/update policy on active_sessions -- only the service
-- role (which bypasses RLS) reads/writes it. This is intentional: a user
-- should never be able to read or forge their own session token via the
-- anon key.

create policy "purchases: read own" on public.purchases
  for select using (auth.uid() = user_id);
-- No insert/update policy -- only the service role (checkout route,
-- webhook) writes purchases rows.
