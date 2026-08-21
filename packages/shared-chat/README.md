# @phoxta/shared-chat

Canonical source for code shared by the five storefronts.

## Why this is vendored rather than imported

Each storefront is a **separate Vercel project deployed from its own folder** —
`vercel --prod` is run inside `businesses/<name>`, so only that directory is
uploaded. The repo root (and therefore `packages/`) does not exist at build
time, and the root `.vercelignore` excludes `businesses/` from the platform
build. A normal workspace dependency would resolve locally and fail in CI.

So the shared file is **copied into each app and committed**. The copy is a
build input, not a convenience: it has to be in the upload.

## Rules

- Edit **only** `packages/shared-chat/src/*`. Never edit a vendored copy.
- Run `npm run shared:sync` to push changes into all five storefronts.
- `npm run shared:check` fails if any copy has drifted — wire it into CI.

Vendored copies carry a generated-file header so nobody edits one by accident.
