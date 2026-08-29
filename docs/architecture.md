# Architecture

## Stack

- **Next.js 16** (App Router, Turbopack dev server) + **React 19** +
  **TypeScript** + **Tailwind CSS v4**.
- **Supabase** (Postgres + Auth) — the only database and the only auth
  provider. No custom session store beyond one small `active_sessions`
  table used for single-device enforcement (see below).
- **PayMongo** (QRPH) and **PayPal** (Orders v2) — two independent
  one-time-payment providers for the same `full_access` product. See
  [payments.md](./payments.md).
- **Google AdSense** — shown only to users without `full_access`.
- **`@vercel/analytics`** — pageview analytics.
- **`@breezystack/lamejs`** — client-side MP3 encoding for recording
  export (no server-side audio processing at all).

No test framework, no state-management library, no ORM (raw Supabase
query builder throughout), no CSS-in-JS (Tailwind utility classes only).
System fonts are used instead of `next/font/google`, deliberately, so the
build doesn't depend on network access (see the comment in
`src/app/layout.tsx`).

## Commands

```bash
npm run dev     # next dev (Turbopack)
npm run build   # next build
npm run start   # next start (production server)
npm run lint    # eslint
```

## Folder layout

```
src/
  app/                  Routes (App Router) — see routes.md for the full map
    api/                API route handlers
    auth/callback/       Supabase PKCE redirect target
    <page routes>/        One folder per route, each a page.tsx
  components/
    admin/               Admin-only UI (letter-notes CRUD)
    ads/                 AdSlot (AdSense placement)
    auth/                Login/signup forms, session watcher
    letterNotes/         Search + auto-scroll viewer
    paywall/             PurchaseModal, PurchaseButton, PayPalButton, SignupStep
    piano/               usePianoEngine, PianoView, GatedPiano
    recording/           RecordButton, RecordingsList
  lib/
    audio/               AudioEngine (Web Audio API note synthesis)
    auth/                getCurrentUser, requireAdmin
    export/              exportRecordingAsMp3 (lamejs)
    keyboard/             QWERTY-key-to-note mapping
    letterNotes/          validateLetterNotesInput
    payments/            products.ts (shared pricing), paymongo.ts, paypal.ts
    recordings/          localStore.ts (IndexedDB persistence)
    sessions/             sessionToken.ts (single-device enforcement)
    supabase/            client.ts, server.ts, env.ts
  config/
    legal.ts              Entity name/address/support email for legal pages
  types/                 Shared TS types (e.g. RecordedNoteEvent)
supabase/
  migrations/            Numbered SQL migrations, applied manually (see below)
```

## How a request flows

1. **`src/proxy.ts`** (Next.js 16 renamed `middleware.ts` → `proxy.ts`)
   runs on almost every request. It refreshes the Supabase session cookie
   and enforces single-device login — see
   [routes.md](./routes.md#session--proxy) for the exact mechanism.
2. **Server Components** (most pages) call `getCurrentUser()`
   (`src/lib/auth/getCurrentUser.ts`) once per request to get
   `{ id, email, isAdmin, hasFullAccess } | null`, and pass plain booleans
   down as props to Client Components. There's no client-side auth
   context/provider — it's server-fetched and prop-drilled.
3. **API routes** re-check auth themselves (`getCurrentUser()` /
   `requireAdmin()`) — they never trust a page having already checked.
4. **Database access** is either the request-scoped, RLS-respecting client
   (`createSupabaseServerClient()`, used for anything scoped to "the
   current user") or the service-role client
   (`createSupabaseServiceRoleClient()`, bypasses RLS — used only for
   admin operations and payment-provider writes to `purchases`). See
   [data-model.md](./data-model.md) for which tables allow which client.

## Migrations aren't applied automatically

`supabase/migrations/*.sql` are plain SQL files — nothing in the deploy
pipeline runs them. After pulling a change that adds one, apply it
manually against your Supabase project (SQL editor, or
`supabase db push`) before the corresponding code path will work. Read
each file top-to-bottom before running it — several exist specifically to
correct an earlier one (see `0005_single_product.sql`,
`0007_lock_down_profiles_update.sql`).

## The piano/audio subsystem

- **`usePianoEngine`** (`src/components/piano/usePianoEngine.ts`) is the
  one hook every piano surface (home page, and any future embed) is built
  on. It lazily constructs a single `AudioEngine` (`src/lib/audio/`) —
  Web Audio API oscillators/gain nodes synthesizing notes, no audio
  files/samples — and owns octave/sustain/volume state plus a QWERTY
  keyboard listener (`src/lib/keyboard/` maps letter keys to notes).
- **Recording** is opt-in per `hasFullAccess` (see
  [routes.md](./routes.md)) and purely client-side: `usePianoEngine`'s
  `onNotePlayed`/`onNoteReleased` callbacks feed `RecordButton`
  (`src/components/recording/RecordButton.tsx`), which on save writes a
  `StoredRecording` (id, name, duration, note-on/off events, timestamp)
  into browser **IndexedDB** via `src/lib/recordings/localStore.ts`.
  Nothing about a recording — not even its existence — ever reaches the
  server; this is a deliberate product decision (see the comments in
  `localStore.ts` and `RecordingsList.tsx`), not a missing feature.
  Playback replays the stored events through a fresh `AudioEngine`
  instance using `setTimeout`s matched to each event's timestamp. Export
  is either a raw JSON download or an MP3 encode via `lamejs`, both
  client-side.

## The letter-notes subsystem

- **Content model:** each "song" is one `letter_notes` row — a `title`
  plus a `notes` string, validated/normalized by
  `validateLetterNotesInput` (`src/lib/letterNotes/validate.ts`): plain
  notes (`C`, `F#4`, ...) with the octave optional, or bracketed chords
  (`[D2|A3 D4]`, left|right split, octave **mandatory** inside a chord
  since it must resolve to literal keys).
- **Free preview vs. paid:** anyone can search titles
  (`LetterNotesSearch` → `GET /api/letter-notes/search`), but the `notes`
  field itself comes back `null` from that route unless the caller has
  `full_access` — enforced server-side in the route handler, not just
  hidden in the UI (see [routes.md](./routes.md)). `LetterNotesViewer`
  auto-scrolls the notes top-to-bottom at a selectable speed; if `notes`
  is `null` it renders a `LockedTeaser` that opens `PurchaseModal`
  instead.
- **Admin authoring:** `/admin/letter-notes` → `LetterNotesAdmin`
  component, a form + `NotesGrid` (visual row/left-hand/right-hand editor)
  that serializes to the same `notes` string format, backed by the
  `api/admin/letter-notes` CRUD routes (service-role client,
  `requireAdmin()`-gated independently of the page).

## The payments/entitlement subsystem

Two independent payment providers unlock the same `full_access` product.
Full detail in [payments.md](./payments.md); the short version: neither
provider's client-side "it worked" callback is ever trusted — PayMongo
confirms via a signature-verified webhook, PayPal confirms via a direct
server-to-server capture call — and the price for either provider is
always a server-side constant (`src/lib/payments/products.ts`, itself
driven by env vars — see [configuration.md](./configuration.md)), never
client input.
