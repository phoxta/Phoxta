"""FastAPI server that answers Twilio voice calls and runs the Pipecat bridge.

Flow:
  1. Twilio is configured so an inbound call POSTs to `/` (this server).
  2. `/` returns TwiML telling Twilio to open a bidirectional Media Stream to `/ws`.
  3. `/ws` reads Twilio's `start` event, then hands the socket to the Pipecat bot.

Multi-tenant: each business has its own agent public key (AI Agent ->
Configure). Map the called number to a key with `?key=` on the webhook URL, or
with env PHOXTA_KEY_<digits> (one per number) — see resolve_key().

Locking the doors (VOICE_BRIDGE_SECRET):
  This server used to run a full agent session — Deepgram STT + TTS, real money,
  a concurrency slot — for anyone who opened a media stream or POSTed an SDP
  offer with an agent public key. But that key ships in every storefront bundle
  and names a BUSINESS, not a person, so it authorises nothing on its own. Three
  endpoints now demand a signature the caller cannot forge without the shared
  VOICE_BRIDGE_SECRET:
    /ws     a Twilio stream must carry sig+exp over `${key}|${callSid}|${exp}`
            (inbound, minted by `/`) or `${key}|outbound|${exp}` (outbound,
            minted by dispatch.ts placeAiCall, accepted only when from=outbound).
    /offer  the browser must carry token+exp over `${key}|web|${exp}`, minted by
    /ice    the voice-session edge function after it rate-limits the caller.
  With the secret UNSET the checks are skipped and the server behaves exactly as
  it did before — a deliberate degrade so a half-finished rollout can't brick
  voice. The secret present on BOTH sides is what turns the lock.
"""

import base64
import hashlib
import hmac
import json
import os
import time

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Request, Response, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from bot import run_bot, run_webrtc_bot

load_dotenv()

app = FastAPI()
# The in-browser voice widget POSTs SDP offers cross-origin from the SPA, so the
# /offer route needs CORS. Default to the Phoxta storefront origins (apex, www,
# the Vercel app, and any *.phoxta.com storefront subdomain) rather than "*" — a
# wildcard on an endpoint that starts real agent sessions is exactly the door we
# are closing everywhere else. ALLOWED_ORIGINS overrides: a CSV to pin a list, or
# the literal "*" for a permissive dev box.
_origins = os.environ.get("ALLOWED_ORIGINS", "").strip()
if _origins == "*":
    _cors = dict(allow_origins=["*"])
elif _origins:
    _cors = dict(allow_origins=[o.strip() for o in _origins.split(",") if o.strip()])
else:
    _cors = dict(
        allow_origins=["https://phoxta.com", "https://www.phoxta.com", "https://phoxta.vercel.app"],
        # Any depth of *.phoxta.com storefront subdomain (shop.aurelia.phoxta.com …).
        allow_origin_regex=r"https://([a-z0-9-]+\.)*phoxta\.com",
    )
app.add_middleware(CORSMiddleware, allow_methods=["*"], allow_headers=["*"], **_cors)

DEFAULT_KEY = os.environ.get("PHOXTA_AGENT_KEY", "")
PUBLIC_HOST = os.environ.get("PUBLIC_HOST", "")  # e.g. "abc123.ngrok.app" (no scheme)
ICE_SERVERS = [s.strip() for s in os.environ.get("ICE_SERVERS", "stun:stun.l.google.com:19302").split(",") if s.strip()]

# Live browser voice sessions, keyed by peer-connection id (for renegotiation).
_webrtc_connections: dict = {}

# Set on SIGTERM (via uvicorn's graceful shutdown). While true we start no new
# sessions — live calls keep running until they finish or the Docker stop grace
# period elapses. uvicorn stops accepting new connections on its own; this flag
# is the belt to that braces, and lets a half-open handler bail out cleanly.
_shutting_down = False


# ── VOICE_BRIDGE_SECRET signatures ──────────────────────────────────────────
def _secret() -> str:
    return os.environ.get("VOICE_BRIDGE_SECRET", "")


def _hmac_hex(msg: str) -> str:
    """hex(HMAC-SHA256(VOICE_BRIDGE_SECRET, msg)) — the shape both the inbound
    stream signature and the web token are built with."""
    return hmac.new(_secret().encode(), msg.encode(), hashlib.sha256).hexdigest()


def _exp_ok(exp_raw: str) -> bool:
    """A presented expiry is usable if it parses, is not already past, and is not
    absurdly far in the future (a minted token/sig lives minutes, so anything
    beyond an hour is a forged or clock-broken value)."""
    try:
        exp = int(exp_raw)
    except (TypeError, ValueError):
        return False
    now = int(time.time())
    return now <= exp <= now + 3600


def _verify_stream(key: str, call_sid: str, from_param: str, sig: str, exp: str) -> bool:
    """A Twilio media stream is allowed to run only if it proves it was minted by
    us. Inbound streams sign the real CallSid; outbound streams (dialled by
    dispatch.ts before any CallSid exists) sign the literal "outbound", and we
    accept that form ONLY when the stream declares itself outbound."""
    if not _secret():
        return True  # degrade to today's open behaviour (logged loudly at startup)
    if not sig or not _exp_ok(exp):
        return False
    msg = f"{key}|outbound|{exp}" if from_param == "outbound" else f"{key}|{call_sid}|{exp}"
    return hmac.compare_digest(sig, _hmac_hex(msg))


def _verify_web(key: str, token: str, exp: str) -> bool:
    """The browser widget's token — minted by the voice-session edge function
    after it has rate-limited the caller and checked the key is a real business."""
    if not _secret():
        return True
    if not token or not _exp_ok(exp):
        return False
    return hmac.compare_digest(token, _hmac_hex(f"{key}|web|{exp}"))


# ── Concurrency caps ────────────────────────────────────────────────────────
class _Slots:
    """A global and per-key ceiling on simultaneous sessions. This box carries
    live audio on a handful of Ampere cores; without a cap one busy tenant (or an
    abuser who got past the token) can start enough sessions to starve everyone
    else's calls of CPU and hold every Deepgram socket open. Single uvicorn
    worker + single-threaded asyncio, so a plain object needs no lock."""

    def __init__(self):
        self.total = 0
        self.per_key: dict[str, int] = {}

    def try_acquire(self, key: str) -> bool:
        cap = int(os.environ.get("MAX_SESSIONS", "8"))
        per = int(os.environ.get("MAX_SESSIONS_PER_KEY", "3"))
        if self.total >= cap or self.per_key.get(key, 0) >= per:
            return False
        self.total += 1
        self.per_key[key] = self.per_key.get(key, 0) + 1
        return True

    def release(self, key: str) -> None:
        self.total = max(0, self.total - 1)
        n = self.per_key.get(key, 0) - 1
        if n <= 0:
            self.per_key.pop(key, None)
        else:
            self.per_key[key] = n


_slots = _Slots()


def resolve_key(to_number: str) -> str:
    """Map a Twilio number to a business agent key via env PHOXTA_KEY_<digits>
    — digits only (e.g. PHOXTA_KEY_15551234567). The E.164 '+' is stripped
    because env-var names containing '+' aren't reliably exposed to the
    container. Returns "" when the number is not mapped — the caller decides what
    an unmapped number gets (we do NOT silently fall back to a default business)."""
    if to_number:
        digits = "".join(ch for ch in to_number if ch.isalnum())
        if digits:
            return os.environ.get(f"PHOXTA_KEY_{digits}", "")
    return ""


@app.on_event("startup")
async def _startup():
    if not _secret():
        logger.warning(
            "[phoxta] VOICE_BRIDGE_SECRET is UNSET — /ws, /offer and /ice run OPEN "
            "(today's behaviour). Set it here AND as a Supabase secret to lock them."
        )


@app.on_event("shutdown")
async def _shutdown():
    global _shutting_down
    _shutting_down = True
    logger.info("[phoxta] shutting down — no new sessions; live calls finish within the grace period")


@app.get("/health")
async def health():
    return {"ok": True}


def _public_url(request: Request) -> str:
    """The URL Twilio actually signed. Behind Caddy the request arrives as plain
    http on an internal hostname, so rebuilding from request.url would never
    match — use the forwarded headers, preferring the configured PUBLIC_HOST."""
    scheme = request.headers.get("x-forwarded-proto", "https")
    host = PUBLIC_HOST or request.headers.get("x-forwarded-host") or request.url.hostname or ""
    url = f"{scheme}://{host}{request.url.path}"
    return f"{url}?{request.url.query}" if request.url.query else url


def _valid_twilio_signature(request: Request, form) -> bool:  # noqa: ANN001
    """Twilio's X-Twilio-Signature: base64 HMAC-SHA1 over the full URL followed
    by each POST param name+value in alphabetical order.

    Without this, anyone who POSTs here is handed the business's agent key in the
    TwiML response. Fails CLOSED when no auth token is configured — handing out a
    working agent line with no proof the request came from Twilio is the exact
    disclosure this guards, so a misconfigured deployment must refuse, not wave
    every caller through. (The `/` handler checks for the unset token first so it
    can log the reason clearly.)"""
    token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    if not token:
        return False
    sent = request.headers.get("X-Twilio-Signature", "")
    if not sent:
        return False
    data = _public_url(request) + "".join(f"{k}{form[k]}" for k in sorted(form.keys()))
    mine = base64.b64encode(
        hmac.new(token.encode(), data.encode("utf-8"), hashlib.sha1).digest()
    ).decode()
    return hmac.compare_digest(mine, sent)


# Spoken to a caller whose number is not wired to any business — better than
# silently dropping them onto a default agent that is not theirs.
NOT_SETUP_TWIML = (
    '<?xml version="1.0" encoding="UTF-8"?>'
    "<Response><Say>Sorry, this number isn't set up yet. Goodbye.</Say><Hangup/></Response>"
)


@app.post("/")
async def incoming_call(request: Request):
    form = await request.form()

    # Fail CLOSED with no auth token: without it we cannot prove this POST is
    # really Twilio, and the response body contains the business's agent key.
    if not os.environ.get("TWILIO_AUTH_TOKEN", ""):
        logger.error("[phoxta] TWILIO_AUTH_TOKEN unset — refusing to hand out an agent line unsigned (fail closed)")
        return Response(content="Forbidden", status_code=403)
    if not _valid_twilio_signature(request, form):
        logger.warning("[phoxta] rejected inbound call POST with a bad/missing Twilio signature")
        return Response(content="Forbidden", status_code=403)

    from_number = form.get("From", "")
    to_number = form.get("To", "")
    caller_name = form.get("CallerName", "")  # Twilio caller-ID lookup, when enabled
    call_sid = form.get("CallSid", "")
    host = PUBLIC_HOST or request.url.hostname

    # `?key=` on the webhook URL wins (the Phoxta platform line binds this way,
    # exactly as twilio-inbound does for SMS); then the per-number env map. An
    # unmapped number is turned away rather than dropped onto a default business.
    key = request.query_params.get("key") or resolve_key(to_number)
    if not key:
        logger.warning(f"[phoxta] inbound call to {to_number or '?'} is not mapped to any business — turning it away")
        return Response(content=NOT_SETUP_TWIML, media_type="application/xml")

    # Mint the stream signature over the real CallSid so `/ws` can prove the
    # stream is one we sent. Skipped (empty) when the secret is unset — `/ws`
    # then also skips verification, so the pair stays consistent.
    exp = int(time.time()) + 600
    sig = _hmac_hex(f"{key}|{call_sid}|{exp}") if _secret() else ""
    auth_params = f'<Parameter name="sig" value="{sig}"/><Parameter name="exp" value="{exp}"/>' if sig else ""
    name_param = f'<Parameter name="caller_name" value="{_xml_attr(caller_name)}"/>' if caller_name else ""

    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response><Connect>"
        f'<Stream url="wss://{host}/ws">'
        f'<Parameter name="key" value="{_xml_attr(key)}"/>'
        f'<Parameter name="from" value="{_xml_attr(from_number)}"/>'
        f"{name_param}{auth_params}"
        "</Stream>"
        "</Connect></Response>"
    )
    return Response(content=twiml, media_type="application/xml")


def _xml_attr(s: str) -> str:
    """Escape a value going into a TwiML attribute — a number or name is caller-
    controlled and an unescaped quote would break the XML (or worse)."""
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


async def _fetch_ice() -> list[dict]:
    """ICE servers (STUN + TURN) as plain dicts. The VM exposes no public UDP, so
    a direct peer connection can't form — TURN relays the media (incl. TCP/TLS
    443). These are returned to the browser via /ice AND used server-side; the
    browser MUST get them too, or it only offers an unreachable private host
    candidate. Creds are short-lived (300s), so a leaked one is worthless fast.
    Falls back to STUN-only."""
    servers: list[dict] = [{"urls": "stun:stun.l.google.com:19302"}]

    # Our own coturn first — Twilio TURN bills per relayed GB and this box has
    # a public IP and spare capacity. Twilio is still appended below as a
    # fallback, so a coturn failure degrades the call instead of dropping it.
    turn_secret = os.environ.get("TURN_SECRET")
    turn_host = os.environ.get("TURN_HOST")
    if turn_secret and turn_host:
        try:
            # RFC 5766 TURN REST API: username is an expiry timestamp, password
            # is the HMAC of it. 300s to match the widget token that gates /ice —
            # a relay credential should not outlive the session it was minted for.
            expiry = int(time.time()) + 300
            user = str(expiry)
            cred = base64.b64encode(
                hmac.new(turn_secret.encode(), user.encode(), hashlib.sha1).digest()
            ).decode()
            servers.append({
                "urls": [f"turn:{turn_host}:3478?transport=udp", f"turn:{turn_host}:3478?transport=tcp"],
                "username": user,
                "credential": cred,
            })
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"[phoxta] could not mint coturn credentials: {exc}")

    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    tok = os.environ.get("TWILIO_AUTH_TOKEN")
    if sid and tok:
        try:
            auth = base64.b64encode(f"{sid}:{tok}".encode()).decode()
            async with httpx.AsyncClient(timeout=10) as http:
                r = await http.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Tokens.json",
                    headers={"Authorization": f"Basic {auth}"},
                )
            for s in r.json().get("ice_servers", []):
                urls = s.get("urls") or s.get("url")
                if not urls:
                    continue
                entry: dict = {"urls": urls}
                if s.get("username"):
                    entry["username"] = s.get("username")
                    entry["credential"] = s.get("credential")
                servers.append(entry)
            logger.info(f"[phoxta] ICE servers ready: {len(servers)} entries (incl. Twilio TURN)")
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"[phoxta] Twilio TURN fetch failed, STUN only: {exc}")
    return servers


async def _build_ice_servers():
    """Server-side ICE servers as aiortc IceServer objects (for the peer connection)."""
    from pipecat.transports.smallwebrtc.connection import IceServer

    out = []
    for s in await _fetch_ice():
        if s.get("username"):
            out.append(IceServer(urls=s["urls"], username=s["username"], credential=s["credential"]))
        else:
            out.append(IceServer(urls=s["urls"]))
    return out


@app.get("/ice")
async def ice(request: Request):
    """ICE servers for the in-browser WebRTC client (STUN + short-lived TURN).

    Requires the widget token: TURN credentials relay real bandwidth billed to
    this account, and handing hour-long creds to anyone who asks is a standing
    invitation to use us as an open relay. The widget fetches voice-session for a
    token first, then calls this with token+exp+key."""
    key = request.query_params.get("key") or DEFAULT_KEY
    token = request.query_params.get("token") or ""
    exp = request.query_params.get("exp") or ""
    if not _verify_web(key, token, exp):
        logger.warning("[phoxta] /ice rejected: missing or invalid widget token")
        return Response(status_code=401, content="unauthorized")
    return {"iceServers": await _fetch_ice()}


def _offer_credentials(request: Request, body: dict) -> tuple[str, str, str]:
    """key, token, exp for /offer — accepted from the query string OR the JSON
    body, so the Pipecat JS client can pass them whichever way it puts them."""
    key = request.query_params.get("key") or body.get("key") or DEFAULT_KEY
    token = request.query_params.get("token") or body.get("token") or ""
    exp = request.query_params.get("exp") or str(body.get("exp") or "")
    return key, token, exp


@app.post("/offer")
async def offer(request: Request, background_tasks: BackgroundTasks):
    """WebRTC signaling for the in-browser voice widget. The Pipecat JS client
    POSTs an SDP offer (with the widget token); we return the SDP answer and run
    the same agent over the peer connection. Supports renegotiation via the pc_id
    the client echoes back, and ICE-candidate trickle via PATCH."""
    from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection

    body = await request.json()
    key, token, exp = _offer_credentials(request, body)
    pc_id = body.get("pc_id")

    # A renegotiation targets a peer connection that already passed the token
    # check when it was created, so it is not re-gated (the browser's SDP
    # follow-ups arrive without re-minting a token).
    if pc_id and pc_id in _webrtc_connections:
        conn = _webrtc_connections[pc_id]
        await conn.renegotiate(sdp=body["sdp"], type=body["type"], restart_pc=body.get("restart_pc", False))
        return conn.get_answer()

    if not _verify_web(key, token, exp):
        logger.warning("[phoxta] /offer rejected: missing or invalid widget token")
        return Response(status_code=401, content="unauthorized")
    if _shutting_down:
        return Response(status_code=503, content="server draining")
    if not _slots.try_acquire(key):
        logger.warning(f"[phoxta] /offer at capacity for key {key[:6]}… — refusing")
        return Response(status_code=503, content="voice server at capacity")

    conn = SmallWebRTCConnection(ice_servers=await _build_ice_servers())
    await conn.initialize(sdp=body["sdp"], type=body["type"])

    @conn.event_handler("closed")
    async def _on_closed(c):
        _webrtc_connections.pop(c.pc_id, None)

    _webrtc_connections[conn.pc_id] = conn
    background_tasks.add_task(_run_webrtc_and_release, conn, key)
    return conn.get_answer()


async def _run_webrtc_and_release(conn, key: str):
    """Run one browser session and always give the concurrency slot back — a
    session that errored out must not permanently consume capacity."""
    try:
        await run_webrtc_bot(conn, key, "web visitor")
    finally:
        _slots.release(key)


@app.patch("/offer")
async def offer_patch(request: Request):
    """Trickle ICE: after the initial offer, the browser PATCHes its freshly
    gathered local candidates here. Without this the peer connection can't form
    a working candidate pair (the server was returning 405). Mirrors pipecat's
    SmallWebRTCRequestHandler.handle_patch_request."""
    from aiortc.sdp import candidate_from_sdp

    body = await request.json()
    pc_id = body.get("pc_id") or body.get("pcId")
    conn = _webrtc_connections.get(pc_id) if pc_id else None
    if conn is None:
        return Response(status_code=404, content="unknown pc_id")
    for c in body.get("candidates", []) or []:
        raw = c.get("candidate")
        if not raw:
            continue
        sdp = raw[len("candidate:"):] if raw.startswith("candidate:") else raw
        candidate = candidate_from_sdp(sdp)
        candidate.sdpMid = c.get("sdpMid", c.get("sdp_mid"))
        idx = c.get("sdpMLineIndex")
        candidate.sdpMLineIndex = c.get("sdp_mline_index") if idx is None else idx
        await conn.add_ice_candidate(candidate)
    return Response(status_code=200)


@app.websocket("/ws")
async def media_stream(websocket: WebSocket):
    await websocket.accept()

    # Twilio sends a "connected" frame, then "start" with the stream metadata.
    start = None
    while start is None:
        data = json.loads(await websocket.receive_text())
        if data.get("event") == "start":
            start = data["start"]

    stream_sid = start["streamSid"]
    call_sid = start.get("callSid", "")
    params = start.get("customParameters", {}) or {}
    public_key = params.get("key") or DEFAULT_KEY
    from_param = params.get("from", "")
    opening = params.get("opening", "")  # set for outbound calls (operator's purpose line)
    caller_name = params.get("caller_name", "")

    # Prove the stream is one we minted (contract 2). 4401 = a WebSocket "auth
    # failed" close so the log makes plain WHY the call dropped.
    if not _verify_stream(public_key, call_sid, from_param, params.get("sig", ""), params.get("exp", "")):
        logger.warning(f"[phoxta] /ws rejected call {call_sid or '?'}: missing or invalid stream signature")
        await websocket.close(code=4401)
        return

    if _shutting_down:
        logger.info("[phoxta] /ws refused: server draining")
        await websocket.close(code=1013)  # 1013 = Try Again Later
        return
    if not _slots.try_acquire(public_key):
        logger.warning(f"[phoxta] /ws at capacity for key {public_key[:6]}… — refusing call {call_sid or '?'}")
        await websocket.close(code=1013)
        return

    # Outbound calls carry from="outbound" and the dialled number as
    # customer_phone; inbound calls carry the caller's number as `from`.
    direction = params.get("direction") or ("outbound" if from_param == "outbound" else "inbound")
    caller = params.get("customer_phone") or from_param

    try:
        await run_bot(websocket, stream_sid, call_sid, caller, public_key, caller_name, direction, opening)
    finally:
        _slots.release(public_key)


if __name__ == "__main__":
    import uvicorn

    # Graceful shutdown: on SIGTERM uvicorn stops accepting new connections and
    # waits up to this many seconds for live calls to finish before exiting. Kept
    # in step with the Docker stop_grace_period (5m) and Caddy's stream_close_delay
    # so a redeploy lets a caller finish their sentence instead of cutting them off.
    grace = int(os.environ.get("SHUTDOWN_GRACE_SECS", "300"))
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8765")),
        timeout_graceful_shutdown=grace,
    )
