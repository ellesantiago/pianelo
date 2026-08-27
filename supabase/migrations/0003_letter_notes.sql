-- Letter notes: admin-curated songs shown as a searchable, auto-scrolling
-- letter sequence on the homepage (a free preview surface above the gated
-- piano). Only admins write these rows (via the service role, through the
-- admin API routes) -- everyone else only ever reads.

create table if not exists public.letter_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text not null, -- space-separated note letters, e.g. "C D E F G G F E D C"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.letter_notes enable row level security;

create policy "letter_notes: public read" on public.letter_notes
  for select using (true);
-- No insert/update/delete policy -- only the service role (admin API
-- routes) writes.
