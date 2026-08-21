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
falls back to the old hardcoded Railway hostname. Also update
`VITE_VOICE_SERVER_URL` (in `.env.local` and Vercel) for the browser widget.

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

Plus two cron jobs (not containers):

- `/etc/cron.d/phoxta-worker-cron` — pings the four Supabase background workers
  every 5 min. Moved here from Railway, where the service had **no deployment at
  all**, meaning embeddings, reminders, Gmail sync and automations had silently
  stopped running. Log: `/var/log/phoxta-worker-cron.log`.
- `/etc/cron.d/phoxta-recordings-prune` — deletes local call recordings older
  than 30 days (Supabase Storage remains the system of record).

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
