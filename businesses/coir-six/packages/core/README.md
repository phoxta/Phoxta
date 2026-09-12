# @coir-six/core

The half of Coir Six that has nothing to do with a screen: the domain types,
the `Repo` interface with its two implementations (`LocalRepo` for the
on-device demo, `SupabaseRepo` for real accounts), every derived number
(streak, weekly ring, watched counts), the starter school, tenant resolution
and the design tokens.

Both apps import it as source — there is no build step:

- `../../src` (the web app, Vite) — hands `SupabaseRepo` its browser client and
  `LocalRepo` a localStorage adapter.
- `../../apps/mobile` (Expo) — the same, with an AsyncStorage adapter.

Rules: no DOM, no React, no `import.meta.env`. Anything platform-specific is
passed in.
