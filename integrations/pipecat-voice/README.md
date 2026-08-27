# Phoxta — Pipecat voice bridge

Open-source, self-hosted voice channel for the Phoxta **AI Agent** — an
alternative to managed providers (Vapi/Retell). Built on [Pipecat](https://github.com/pipecat-ai/pipecat).

**One brain, every touchpoint.** This service is only the *ears and mouth*:
it answers the phone, transcribes the caller (STT), and speaks replies (TTS).
All the thinking — booking appointments, capturing/qualifying leads, opening
tickets, ZIP routing, RAG, unified memory — happens in Phoxta's hosted
`agent-inbound` edge function, exactly the same agent that powers web/SMS/chat.

```
Caller ─PSTN─▶ Twilio ─Media Stream(ws)─▶ Pipecat (STT → bridge → TTS)
                                               │ per utterance, HTTPS
                                               ▼
                                   Phoxta agent-inbound  ──▶ books / qualifies /
                                   (channel = "voice")        tickets / routes / RAG
                                               │
                                          { reply } ──▶ spoken back to the caller
```

## Pieces
| File | Role |
|---|---|
| `bot.py` | The Pipecat pipeline + `PhoxtaAgentBridge` (replaces the in-pipeline LLM with an HTTP call to `agent-inbound`). |
| `server.py` | FastAPI: returns TwiML for inbound calls and runs the bridge over the Twilio Media Stream websocket. |
| `requirements.txt` / `Dockerfile` / `.env.example` | Deps, container, config. |

You provide the swappable building blocks Pipecat orchestrates: telephony
(**Twilio**), STT (**Deepgram**), TTS (**Cartesia**, or ElevenLabs). The LLM is
**not** configured here — it lives in Phoxta. Self-host alternative to Twilio for
media is **LiveKit**; Pipecat supports it too.

## Run it (recommended): `launch.py`
One command brings up the tunnel, **auto-points your Twilio number at it**, and runs
the server — so restarts just work (the account-less tunnel URL changes each time,
and the launcher re-points Twilio every launch):
```bash
python launch.py
```
Needs `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in `.env`.
For a *permanently fixed* URL, use a named Cloudflare tunnel with your own domain,
or deploy `server.py` to the Oracle VM (see `deploy/oracle/`) and drop the tunnel.

`setup_phoxta.py` is a one-off that points the agent's business at **Phoxta itself**
(renames the org, writes a Phoxta sales/support persona with the offering + pricing
baked in, and creates knowledge pages). Re-run it after adding embeddings billing to
also index those pages into RAG.

## Production — a stable URL (no tunnel)
The voice bridge is a long-running **WebSocket** server, so it needs a host that
runs persistent processes — **not** Vercel/Netlify (serverless, no long-lived
sockets). Vercel is for the *front-end*.

**This runs on the Oracle Cloud Always Free VM, and that is the only supported
deployment.** Follow [`deploy/oracle/README.md`](deploy/oracle/README.md) — it is
the real runbook: `docker-compose.yml`, the env file, Caddy for TLS, and the
worker-cron install that lives on the same box.

Live at **https://voice.phoxta.com** (`/health` returns `{"ok":true}`).

Two things must agree with that hostname or voice fails in a way the server logs
never show, because the browser refuses the connection before it is made:
  - `VITE_VOICE_SERVER_URL` in the front-end env, and
  - the `connect-src` list in the repo root `vercel.json` CSP, which needs BOTH
    `https://voice.phoxta.com` and `wss://voice.phoxta.com`.

> Historical note: this ran on Railway until 2026-08. That host is gone, and its
> `railway.json` / `.railwayignore` are deleted. If you find a
> `phoxta-voice-production.up.railway.app` anywhere, it is stale and wrong.

> The front-end SPA deploys separately to **Vercel** (see `vercel.json` in the repo
> root) with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars.

## Manual setup
1. **Get the agent key**: in the Phoxta console → *AI Agent → Configure* → copy
   the web-widget/public key. Put it in `PHOXTA_AGENT_KEY` (or map per-number with
   `PHOXTA_KEY_+1555...`). Set `PHOXTA_AGENT_URL` to your project's
   `…/functions/v1/agent-inbound` and `SUPABASE_ANON_KEY`.
2. **Keys**: `DEEPGRAM_API_KEY`, `CARTESIA_API_KEY` (+ `CARTESIA_VOICE_ID`),
   `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`.
3. **Install & run**
   ```bash
   cp .env.example .env   # fill it in
   pip install -r requirements.txt
   python server.py       # serves on :8765
   ```
4. **Expose** (dev): `ngrok http 8765`, set `PUBLIC_HOST` to the ngrok host.
5. **Point Twilio at it**: in the Twilio number's *Voice* config, set
   *A call comes in* → **Webhook**, `https://<PUBLIC_HOST>/` (HTTP POST).
6. **Call the number.** The agent greets, listens, acts, and speaks — and the
   conversation shows up in *AI Agent → Inbox* with the actions it took, and in
   *Call Center* call logs.

## In-browser voice (WebRTC) — talk to the agent on the website
Beyond the phone line, the same server exposes a **WebRTC** voice channel so a
visitor can click a mic and *talk* to the agent in the browser — same brain
(`agent-inbound`), same Deepgram/Cartesia, just a different transport (no Twilio).

- **Server**: `POST /offer?key=<agent public key>` does SDP signaling and runs
  `run_webrtc_bot` over a `SmallWebRTCTransport`. Needs the `webrtc` extra
  (`pip install "pipecat-ai[webrtc]"`, already in `requirements.txt`). Configure
  `ALLOWED_ORIGINS` (CORS) and `ICE_SERVERS` (STUN/TURN) in `.env`.
- **Front-end**: `src/shared/VoiceAgentWidget.tsx` (Pipecat JS client +
  `@pipecat-ai/small-webrtc-transport`, styled in the Phoxta design system),
  lazy-loaded so it never weighs down a page until used. Two places use it:
  - **AI Agent → Test** page — set `VITE_VOICE_SERVER_URL`; reuses the org's web key.
  - **Public site** — `src/shared/elements/FloatingVoiceWidget.tsx` mounts a
    floating mic launcher in `MainLayout` (bottom-left, clear of BackToTop). It
    stays inert until **both** `VITE_VOICE_SERVER_URL` and `VITE_AGENT_PUBLIC_KEY`
    (Phoxta's own agent public key) are set in the SPA env.
- **Verify** without a browser: `python smoketest_webrtc.py` (acts as the JS
  client — sends a mic track, expects the agent's spoken greeting back).

## Call-quality features (Pipecat capabilities wired in)
The bridge uses more of Pipecat than a bare STT→TTS loop:
- **Barge-in / interruptions** — `allow_interruptions=True` plus a per-turn
  counter in the bridge: when the caller starts speaking (or presses a key)
  while the agent is still "thinking", the now-stale reply is dropped instead of
  talking over them. Natural, human-feeling turn-taking.
- **DTMF keypad capture** (always on) — keypresses arrive as `InputDTMFFrame`s
  (via the Twilio serializer) and are forwarded to the one brain as a message
  (`[Caller pressed keypad: …]`), so the agent can handle "press 1 for sales",
  verification codes, account numbers, or IVR-style menus.
- **Metrics** — `enable_metrics` / `enable_usage_metrics` log TTFB and STT/TTS
  usage per call for latency and cost visibility.
- **Smart Turn** *(opt-in: `SMART_TURN=1`)* — local ONNX end-of-turn model (no
  API key) that detects when the caller has genuinely finished, beyond a raw VAD
  pause. `pip install onnxruntime`.
- **RNNoise** *(opt-in: `DENOISE=1`)* — free OSS background-noise suppression on
  the inbound audio for cleaner transcription on noisy lines.
- **Call recording** *(opt-in: `RECORD_CALLS=1`)* — an `AudioBufferProcessor`
  captures both legs; on hang-up the bridge writes one WAV to `./recordings/` and
  uploads it to a Supabase Storage `call-recordings` bucket via a **signed upload
  URL** minted by `agent-inbound` (the service-role key never leaves the server,
  and the multi-MB audio never transits the edge function), then the URL is linked
  onto the **call log** (visible in *AI Agent → Call Center*). The bucket is
  created public on first use — make it private + use signed download URLs for
  production, and check call-recording consent laws for your jurisdiction.

These opt-in features are env-gated and lazily imported, so the proven default
pipeline runs unchanged if their extra deps aren't installed.

## Notes
- **Auth**: `agent-inbound` is public (resolved by the agent public key); the
  Supabase anon key is just the gateway key. Alternatively deploy the function
  with `--no-verify-jwt` and drop the anon key.
- **Version drift**: Pipecat's API moves quickly (v1.0, Apr 2026). The pipeline
  shape (`transport → stt → bridge → tts`) is stable; if an import path or service
  constructor differs in your installed `pipecat-ai`, adjust `bot.py` accordingly.
- **Outbound voice** (reminder/cold/upsell calls) currently dispatches through the
  managed adapters in `supabase/functions/_shared/dispatch.ts` (Vapi/Retell). To
  originate outbound calls through this self-hosted bridge instead, use the Twilio
  REST API to create a call whose TwiML points back at `/` — the same pipeline then
  runs for the outbound leg.
- **Cost model**: no per-minute platform fee (vs Vapi/Retell) — you pay Twilio +
  Deepgram + Cartesia + Anthropic (via Phoxta) directly. Matches the KB's
  "self-host for high-volume/latency-tolerant; managed for quality-critical."
