"""FastAPI server that answers Twilio voice calls and runs the Pipecat bridge.

Flow:
  1. Twilio is configured so an inbound call POSTs to `/` (this server).
  2. `/` returns TwiML telling Twilio to open a bidirectional Media Stream to `/ws`.
  3. `/ws` reads Twilio's `start` event, then hands the socket to the Pipecat bot.

Multi-tenant: each business has its own agent public key (AI Agent ->
Configure). For a single business set PHOXTA_AGENT_KEY. For many businesses on
many Twilio numbers, map the called number ("To") to a key — see resolve_key().
"""

import base64
import json
import os

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Request, Response, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from bot import run_bot, run_webrtc_bot

load_dotenv()

app = FastAPI()
# The in-browser voice widget posts SDP offers cross-origin from the SPA, so the
# /offer route needs CORS. Lock origins down in prod via ALLOWED_ORIGINS (CSV).
_origins = os.environ.get("ALLOWED_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _origins == "*" else [o.strip() for o in _origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)
DEFAULT_KEY = os.environ.get("PHOXTA_AGENT_KEY", "")
PUBLIC_HOST = os.environ.get("PUBLIC_HOST", "")  # e.g. "abc123.ngrok.app" (no scheme)
ICE_SERVERS = [s.strip() for s in os.environ.get("ICE_SERVERS", "stun:stun.l.google.com:19302").split(",") if s.strip()]

# Live browser voice sessions, keyed by peer-connection id (for renegotiation).
_webrtc_connections: dict = {}


def resolve_key(to_number: str) -> str:
    """Map a Twilio number to a business agent key via env PHOXTA_KEY_<digits>
    — digits only (e.g. PHOXTA_KEY_15551234567). The E.164 '+' is stripped
    because env-var names containing '+' aren't reliably exposed to the
    container. Falls back to PHOXTA_AGENT_KEY."""
    if to_number:
        digits = "".join(ch for ch in to_number if ch.isalnum())
        if digits:
            specific = os.environ.get(f"PHOXTA_KEY_{digits}")
            if specific:
                return specific
    return DEFAULT_KEY


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/")
async def incoming_call(request: Request):
    form = await request.form()
    from_number = form.get("From", "")
    to_number = form.get("To", "")
    host = PUBLIC_HOST or request.url.hostname
    key = resolve_key(to_number)
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response><Connect>"
        f'<Stream url="wss://{host}/ws">'
        f'<Parameter name="key" value="{key}"/>'
        f'<Parameter name="from" value="{from_number}"/>'
        "</Stream>"
        "</Connect></Response>"
    )
    return Response(content=twiml, media_type="application/xml")


async def _fetch_ice() -> list[dict]:
    """ICE servers (STUN + Twilio TURN) as plain dicts. Railway exposes no public
    UDP, so a direct peer connection can't form — TURN relays the media (incl.
    TCP/TLS 443) via the same Twilio account as the phone line. These are returned
    to the browser via /ice AND used server-side; the browser MUST get them too,
    or it only offers an unreachable private host candidate. Twilio tokens are
    short-lived, so we mint fresh creds each time. Falls back to STUN-only."""
    servers: list[dict] = [{"urls": "stun:stun.l.google.com:19302"}]
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
async def ice():
    """ICE servers for the in-browser WebRTC client (STUN + short-lived Twilio TURN)."""
    return {"iceServers": await _fetch_ice()}


@app.post("/offer")
async def offer(request: Request, background_tasks: BackgroundTasks):
    """WebRTC signaling for the in-browser voice widget. The Pipecat JS client
    POSTs an SDP offer (with ?key=<agent public key>); we return the SDP answer
    and run the same agent over the peer connection. Supports renegotiation via
    the pc_id the client echoes back, and ICE-candidate trickle via PATCH."""
    from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection

    body = await request.json()
    key = request.query_params.get("key") or body.get("key") or DEFAULT_KEY
    pc_id = body.get("pc_id")

    if pc_id and pc_id in _webrtc_connections:
        conn = _webrtc_connections[pc_id]
        await conn.renegotiate(sdp=body["sdp"], type=body["type"], restart_pc=body.get("restart_pc", False))
    else:
        conn = SmallWebRTCConnection(ice_servers=await _build_ice_servers())
        await conn.initialize(sdp=body["sdp"], type=body["type"])

        @conn.event_handler("closed")
        async def _on_closed(c):
            _webrtc_connections.pop(c.pc_id, None)

        _webrtc_connections[conn.pc_id] = conn
        background_tasks.add_task(run_webrtc_bot, conn, key, "web visitor")

    answer = conn.get_answer()
    return answer


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
    caller = params.get("from", "")
    opening = params.get("opening", "")  # set for outbound calls (operator's purpose line)

    await run_bot(websocket, stream_sid, call_sid, caller, public_key, opening)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8765")))
