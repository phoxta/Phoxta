# live-stt — the classroom's transcription relay

Browser ⇄ **this** ⇄ Deepgram.

## Why a relay at all

The obvious design is for the host's browser to talk to Deepgram directly with
a short-lived key. That is what this started as, and it does not work here:
Phoxta's Deepgram key is scoped to `usage:write` only, so it cannot mint child
keys (`keys:write`) and cannot use `/v1/auth/grant` either — both answer 403.
The only key we have is one that can spend money, so it must never reach a
browser.

So the key stays here, and the browser is handed a **ticket** instead: an HMAC
over `lessonId|exp`, signed by the same `LIVE_STT_SECRET` this relay holds and
minted by the `coir-live` edge function only for a verified class host. A
leaked ticket is good for one class, for minutes, and cannot be replayed
against another lesson.

Being in the middle also gives one place to cap a session, which a direct
browser connection could not.

## Running it

Part of the Oracle stack under `--profile live`, behind the same Caddy as
LiveKit, on `live.phoxta.com/stt`. It needs two env vars, both already set as
Supabase secrets so the two sides agree:

```
DEEPGRAM_API_KEY=…      # never leaves this container
LIVE_STT_SECRET=…       # must match the edge function's
```

Deploy it the way `design-render` is deployed — rsync to `~/live-stt` on the VM,
then `docker compose --profile live up -d --build stt`.
