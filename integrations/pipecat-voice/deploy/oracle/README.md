# Voice server on Oracle Cloud Always Free

Runbook for hosting the Pipecat bridge on an Always Free VM. Unlike the free
PaaS tiers, this never sleeps and is never evicted — which is what a service
customers phone into needs.

Twilio Media Streams need `wss://` with a valid certificate, so Caddy sits in
front and gets one from Let's Encrypt automatically.

---

## 1. Create the VM (Oracle Console)

**Compute → Instances → Create instance**

| Setting | Value |
|---|---|
| Image | Ubuntu 24.04 (Canonical) |
| Shape | `VM.Standard.A1.Flex` — **4 OCPU, 24 GB** |
| Region | Pick one close to your callers (UK/Nigeria → London or Frankfurt) |
| SSH key | Upload your public key — you cannot add one later without a rescue |

> **If you see "Out of host capacity"** — the usual Ampere blocker. Try another
> availability domain, then another region. Switching the account to
> Pay-As-You-Go also improves availability dramatically and still bills Always
> Free shapes at zero; it does require a card on file.
>
> Fallback if A1 stays unavailable: `VM.Standard.E2.1.Micro` (2 are always
> free). At 1 GB RAM it is tight for Pipecat but will run one call at a time.

## 2. Open the ports (both layers)

This trips everyone up: OCI filters traffic **twice**, and the VM looks dead on
80/443 until both are open.

1. **VCN security list** — Networking → VCN → Subnet → Security List → add
   ingress rules, source `0.0.0.0/0`, TCP **80** and **443**.
2. **Host firewall** — `bootstrap.sh` handles this (Oracle's Ubuntu images ship
   an iptables policy that drops everything but SSH).

## 3. Point DNS at it

Create an `A` record for `voice.phoxta.com` → the VM's public IP. DNS is on
Vercel, so either use the dashboard or:

```bash
vercel dns add phoxta.com voice A <VM_PUBLIC_IP>
```

Let it resolve before step 5 — Let's Encrypt validates over HTTP, so a
certificate cannot be issued until the name points at the box.

## 4. Copy the code up

From your machine, in `integrations/pipecat-voice`:

```bash
rsync -av --exclude .venv --exclude __pycache__ --exclude .env \
  ./ ubuntu@<VM_PUBLIC_IP>:~/pipecat-voice/
```

## 5. Configure and start

On the VM, in `~/pipecat-voice/deploy/oracle`:

```bash
cp voice.env.example voice.env && nano voice.env     # app secrets
printf 'VOICE_DOMAIN=voice.phoxta.com\nACME_EMAIL=you@example.com\n' > .env
sudo bash bootstrap.sh
```

`bootstrap.sh` installs Docker, opens the host firewall, builds, starts, and
polls `/health` until the certificate is live. First ARM build takes a few
minutes.

## 6. Point Phoxta at the new host

```bash
supabase secrets set VOICE_WS_HOST=voice.phoxta.com
```

Without this, [`dispatch.ts`](../../../../supabase/functions/_shared/dispatch.ts)
falls back to its built-in default of `voice.phoxta.com`, which is right today but
is a default, not a setting — set the secret so the two cannot disagree later.

Two more places name this host, and BOTH must match or voice breaks:
  - `VITE_VOICE_SERVER_URL` (in `.env.local` and Vercel) for the browser widget;
  - `connect-src` in the repo-root [`vercel.json`](../../../../vercel.json) CSP,
    which needs `https://voice.phoxta.com` **and** `wss://voice.phoxta.com`.
    Miss this one and the server is healthy, the front-end is correct, and the
    browser still refuses the connection before it is made — the failure appears
    in no server log. It is exactly what happened after the move off Railway.

### Lock the doors — `VOICE_BRIDGE_SECRET`

The voice server no longer runs an agent session for anyone who opens a stream or
POSTs an SDP offer with a public key (those ship in every storefront bundle). The
proof is one shared secret that MUST be set in **two** places to the SAME value:

```bash
secret="$(openssl rand -hex 32)"
# 1. On the VM, in voice.env (then: docker compose up -d)
printf 'VOICE_BRIDGE_SECRET=%s\n' "$secret" >> voice.env
# 2. As a Supabase secret (agent-inbound reads it to trust the proof; dispatch.ts
#    signs outbound streams with it; voice-session mints the widget token with it)
supabase secrets set VOICE_BRIDGE_SECRET="$secret"
```

Set it on ONE side only and things half-break silently: on the VM but not
Supabase → agent-inbound ignores the proof and files phone calls as web chat; on
Supabase but not the VM → the server keeps running open. **Unset on both** is the
old open behaviour, with a loud startup log line saying so. If you added `?key=`
to a Twilio webhook URL for per-number routing, no secret change is needed — the
key is part of the signed URL.

## 7. Verify

```bash
curl -fsS https://voice.phoxta.com/health                    # {"ok":true}
curl -s -o /dev/null -w '%{http_code}\n' \
  -H 'Connection: Upgrade' -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  https://voice.phoxta.com/ws                                # expect 101
```

**101 is the number that matters.** Anything else is what Twilio reports as
error 31920 — after the call has already connected and the customer is
listening to silence.

---

## What runs on this box

| Service | Purpose | Reached at |
|---|---|---|
| `voice` | Pipecat bridge — Twilio Media Streams + browser WebRTC | `voice.phoxta.com` |
| `caddy` | TLS termination for every host below | :80/:443 |
| `coturn` | Self-hosted TURN relay (replaces per-GB Twilio TURN) | :3478 + 49152-49570/udp |
| `uptime` | Uptime Kuma — watches the whole estate | `status.phoxta.com` |
| `llm` | llama.cpp — Qwen3-4B, serves the **`cheap` model tier** | `llm.phoxta.com/v1` |
| `embed` | llama.cpp — Qwen3-Embedding-0.6B, serves the **RAG queue** | `llm.phoxta.com/v1/embeddings` |

> **`integrations/design-render` (`/render`) is NOT wired by the `Caddyfile` in
> this folder.** Its README expects a `render` service in this compose file and a
> `handle /render*` route in the `voice.phoxta.com` block that proxies to it —
> neither is present here. Until both are added (deliberately, by whoever owns
> that integration — this runbook does not), `https://voice.phoxta.com/render`
> 404s through to the voice bridge (`{"detail":"Not Found"}`), which reads like
> the render service is broken when it is simply unrouted. Flagged, not fixed.

Plus two cron jobs (not containers):

- `/etc/cron.d/phoxta-worker-cron` — pings the four Supabase background workers
  every 5 min. Moved here from Railway, where the service had **no deployment at
  all**, meaning embeddings, reminders, Gmail sync and automations had silently
  stopped running. Log: `/var/log/phoxta-worker-cron.log`.
- `/etc/cron.d/phoxta-recordings-prune` — deletes local call recordings older
  than 30 days (Supabase Storage remains the system of record).

### The free LLM tier

Two llama.cpp servers run on the CPU this box already costs nothing for. They
take the two workloads that a 4-core Ampere can honestly carry:

- the **`cheap` model tier** — `agent-inbound` classification, `qa-scorer`,
  and the cheap paths in `agentCore` / `memory`: short prompts, ~100-token
  answers, all of them background jobs that nobody is watching a spinner for;
- the **whole RAG embedding queue** — `Qwen3-Embedding-0.6B` is natively
  1024-dim, which is exactly what `ai_embeddings` already is, so this is a
  provider swap with no migration and no re-index.

Everything else — balanced, complex, voice, anything a human is waiting on —
stays on the hosted provider. Generation here is roughly **8 tokens/second**;
a chat turn would land a minute late.

**Set up:**

```bash
# 1. DNS — one more A record at the same IP
vercel dns add phoxta.com llm A <VM_PUBLIC_IP>

# 2. .env on the VM, alongside VOICE_DOMAIN / STATUS_DOMAIN / ACME_EMAIL
printf 'LLM_DOMAIN=llm.phoxta.com\nLOCAL_API_KEY=%s\n' "$(openssl rand -hex 32)" >> .env

# 3. Build llama.cpp — IN A QUIET HOUR. There is no linux/arm64 image published
#    for it (ggml-org/llama.cpp#13891), so this compiles from source and takes
#    every core for 15+ minutes. Those are the cores carrying live calls.
docker compose --profile llm build llm

# 4. Start. First run downloads ~3.1 GB of weights into the llm_models volume.
#    Caddy is re-created so it picks up LLM_DOMAIN and requests the certificate.
docker compose --profile llm up -d llm embed caddy
```

> The two LLM services live behind the `llm` **profile** on purpose: a plain
> `docker compose up -d` — the voice runbook above — never evaluates them, so a
> VM that has never heard of `LLM_DOMAIN` or `LOCAL_API_KEY` still comes up
> exactly as before. Pass `--profile llm` to every compose command that should
> include them (`ps`, `logs`, `restart`).

> Keep `LOCAL_API_KEY` hex. Compose splits `command:` shell-style **after**
> interpolating it, so a key containing a space or a `$` becomes two arguments
> and the server starts with no auth at all — on a public text-generation
> endpoint. `openssl rand -hex 32` cannot produce one.

**Point Phoxta at it** (`LOCAL_BASE_URL` and `LOCAL_EMBED_BASE_URL` are the
same host — Caddy splits them on the path):

```bash
supabase secrets set \
  LLM_PROVIDER_CHEAP=local \
  LOCAL_BASE_URL=https://llm.phoxta.com/v1 \
  LOCAL_MODEL=qwen3-4b-instruct \
  LOCAL_API_KEY=<the same key> \
  EMBED_PROVIDER=local \
  LOCAL_EMBED_BASE_URL=https://llm.phoxta.com/v1 \
  LOCAL_EMBED_MODEL=Qwen3-Embedding-0.6B
```

`LOCAL_MODEL` **must** match `--alias` in `docker-compose.yml`. That string is
how [`models.ts`](../../../../supabase/functions/_shared/models.ts) recognises
a local model id, and therefore how the gateway knows a call started here and
that Gemini is the thing to fall back to. Get it wrong and the routing silently
does nothing.

**Verify:**

```bash
curl -s https://llm.phoxta.com/v1/models -H "Authorization: Bearer $LOCAL_API_KEY"
# expect: qwen3-4b-instruct

# 1024 is the number that matters — it must equal the ai_embeddings column.
curl -s https://llm.phoxta.com/v1/embeddings \
  -H "Authorization: Bearer $LOCAL_API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"Qwen3-Embedding-0.6B","input":"hello"}' \
  | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["data"][0]["embedding"]))'

# and that it is actually closed to everyone else
curl -s -o /dev/null -w '%{http_code}\n' https://llm.phoxta.com/v1/models   # expect 401
```

Rolling back is one secret: `supabase secrets unset LLM_PROVIDER_CHEAP
EMBED_PROVIDER` puts both workloads straight back on the hosted provider.

### TURN

`turnserver.conf` uses time-limited credentials: the voice server mints a
username of `<expiry>` and a password of `base64(HMAC-SHA1(TURN_SECRET, user))`,
so no long-lived password reaches a browser. `TURN_SECRET` and `TURN_HOST` live
in `voice.env` and must match `static-auth-secret` in `turnserver.conf`.

Twilio TURN stays configured as a fallback in `_fetch_ice()` — if coturn fails,
calls degrade to the paid relay rather than dropping.

Verify it:

```bash
# expect: Binding Success, then a 401 with realm phoxta.com (auth enforced)
docker compose logs coturn | tail
```

## Operating

```bash
docker compose logs -f voice     # bot logs
docker compose restart voice     # restart after an env change
docker compose up -d --build     # deploy new code
```

Certificates live in the `caddy_data` volume; don't delete it or you will
re-issue on every restart and hit Let's Encrypt rate limits.
