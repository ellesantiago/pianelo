# Pianelo technical docs

Reference documentation for how the app is built, beyond what the root
[README.md](../README.md) (setup) and [SECURITY.md](../SECURITY.md)
(security model) already cover.

- **[architecture.md](./architecture.md)** — stack, folder layout, how a
  request flows through the app, the piano/audio/recording subsystem.
- **[data-model.md](./data-model.md)** — every Supabase table, its columns,
  and its RLS policy (what a client can/can't read or write).
- **[routes.md](./routes.md)** — every page and API route, and exactly
  what gates access to it.
- **[payments.md](./payments.md)** — the PayMongo (QRPH) and PayPal
  (Orders v2) checkout flows end-to-end, and how each one to confirm
  payment.
- **[configuration.md](./configuration.md)** — every environment
  variable, what it's for, and whether it's safe to expose to the browser.

Start with `architecture.md` for the big picture, then drop into whichever
file covers the part you're changing.
